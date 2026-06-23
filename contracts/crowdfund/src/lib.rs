#![no_std]

mod types;
mod events;
mod storage;
mod error;

use soroban_sdk::{
    contract, contractimpl, contractclient, token,
    Address, Env, String, Vec,
};

use types::{Campaign, Donation, CampaignStatus, DataKey};
use error::CrowdfundError;

pub use error::CrowdfundError as Error;

// ──────────────────────────────────────────────────────────────────────────────
// Inter-Contract Interface: Reward Token
// ──────────────────────────────────────────────────────────────────────────────

/// Client interface for the RewardToken contract.
/// This enables cross-contract calls from CrowdfundContract → RewardTokenContract.
#[contractclient(name = "RewardTokenClient")]
pub trait RewardToken {
    fn mint(env: Env, to: Address, amount: i128);
}

// ──────────────────────────────────────────────────────────────────────────────
// Contract Entry Point
// ──────────────────────────────────────────────────────────────────────────────

#[contract]
pub struct CrowdfundContract;

#[contractimpl]
impl CrowdfundContract {
    // ── Admin ─────────────────────────────────────────────────────────────────

    /// Initialize the contract with an admin address.
    pub fn initialize(env: Env, admin: Address) -> Result<(), CrowdfundError> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(CrowdfundError::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::CampaignCount, &0u32);

        // Extend instance TTL
        env.storage()
            .instance()
            .extend_ttl(100_000, 100_000);

        Ok(())
    }

    // ── Inter-Contract: Reward Token Configuration ────────────────────────────

    /// Set the reward token contract address (admin-only).
    ///
    /// After this is set, every successful donation will automatically trigger
    /// a cross-contract `mint` call on the reward token contract, crediting
    /// the donor with 1 CRWD token per 1 stroop donated (1:1 ratio).
    pub fn set_reward_token(
        env: Env,
        admin: Address,
        token_address: Address,
    ) -> Result<(), CrowdfundError> {
        admin.require_auth();

        // Verify caller is the stored admin
        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(CrowdfundError::NotInitialized)?;

        if stored_admin != admin {
            return Err(CrowdfundError::Unauthorized);
        }

        env.storage()
            .instance()
            .set(&DataKey::RewardToken, &token_address);
        env.storage()
            .instance()
            .extend_ttl(100_000, 100_000);

        Ok(())
    }

    /// Get the current reward token contract address (if configured).
    pub fn get_reward_token(env: Env) -> Option<Address> {
        env.storage()
            .instance()
            .get(&DataKey::RewardToken)
    }

    // ── Campaign Management ───────────────────────────────────────────────────

    /// Create a new crowdfunding campaign.
    ///
    /// # Arguments
    /// * `creator`     - Account creating the campaign (must sign)
    /// * `title`       - Campaign title (max 100 chars)
    /// * `description` - Short description (max 500 chars)
    /// * `goal`        - Funding goal in stroops (1 XLM = 10_000_000 stroops)
    /// * `deadline`    - Unix timestamp (seconds) for the campaign deadline
    pub fn create_campaign(
        env: Env,
        creator: Address,
        title: String,
        description: String,
        goal: i128,
        deadline: u64,
    ) -> Result<u32, CrowdfundError> {
        creator.require_auth();

        if goal <= 0 {
            return Err(CrowdfundError::InvalidGoal);
        }

        let now = env.ledger().timestamp();
        if deadline <= now {
            return Err(CrowdfundError::InvalidDeadline);
        }

        // Increment counter
        let campaign_id: u32 = env
            .storage()
            .instance()
            .get(&DataKey::CampaignCount)
            .unwrap_or(0u32)
            + 1;

        env.storage()
            .instance()
            .set(&DataKey::CampaignCount, &campaign_id);

        let campaign = Campaign {
            id: campaign_id,
            creator: creator.clone(),
            title: title.clone(),
            description,
            goal,
            deadline,
            raised: 0i128,
            status: CampaignStatus::Active,
        };

        // Persist campaign
        env.storage()
            .persistent()
            .set(&DataKey::Campaign(campaign_id), &campaign);

        // Initialize donations list
        let donations: Vec<Donation> = Vec::new(&env);
        env.storage()
            .persistent()
            .set(&DataKey::Donations(campaign_id), &donations);

        // Extend TTL for persistent entries
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Campaign(campaign_id), 100_000, 100_000);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Donations(campaign_id), 100_000, 100_000);

        // Emit event
        events::campaign_created(&env, campaign_id, &creator, title, goal, deadline);

        Ok(campaign_id)
    }

    /// Donate XLM to a campaign.
    ///
    /// The donor must have pre-approved the transfer via the token contract.
    /// We use the native XLM token (Stellar Asset Contract).
    ///
    /// If a reward token is configured via `set_reward_token`, the donor will
    /// automatically receive CRWD reward tokens equal to the stroops donated
    /// via a cross-contract mint call — demonstrating inter-contract
    /// communication on Soroban.
    pub fn donate(
        env: Env,
        campaign_id: u32,
        donor: Address,
        amount: i128,
    ) -> Result<(), CrowdfundError> {
        donor.require_auth();

        if amount <= 0 {
            return Err(CrowdfundError::InvalidAmount);
        }

        let mut campaign: Campaign = env
            .storage()
            .persistent()
            .get(&DataKey::Campaign(campaign_id))
            .ok_or(CrowdfundError::CampaignNotFound)?;

        let now = env.ledger().timestamp();

        if campaign.status != CampaignStatus::Active {
            return Err(CrowdfundError::CampaignNotActive);
        }

        if now > campaign.deadline {
            // Auto-expire campaign
            campaign.status = CampaignStatus::Expired;
            env.storage()
                .persistent()
                .set(&DataKey::Campaign(campaign_id), &campaign);
            return Err(CrowdfundError::CampaignExpired);
        }

        // Transfer XLM from donor to contract
        let native_token = token::Client::new(&env, &get_native_asset(&env));
        native_token.transfer(&donor, &env.current_contract_address(), &amount);

        // Update raised amount
        campaign.raised += amount;

        // Check if goal reached
        if campaign.raised >= campaign.goal {
            campaign.status = CampaignStatus::Successful;
        }

        env.storage()
            .persistent()
            .set(&DataKey::Campaign(campaign_id), &campaign);

        // Record donation
        let mut donations: Vec<Donation> = env
            .storage()
            .persistent()
            .get(&DataKey::Donations(campaign_id))
            .unwrap_or_else(|| Vec::new(&env));

        let donation = Donation {
            donor: donor.clone(),
            amount,
            timestamp: now,
        };
        donations.push_back(donation);

        env.storage()
            .persistent()
            .set(&DataKey::Donations(campaign_id), &donations);

        // Extend TTLs
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Campaign(campaign_id), 100_000, 100_000);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Donations(campaign_id), 100_000, 100_000);

        // ── Inter-Contract Call: Mint Reward Tokens ───────────────────────────
        // If a reward token contract is configured, mint CRWD reward tokens
        // to the donor equal to the amount donated (1:1 stroop ratio).
        // This demonstrates inter-contract communication on Soroban.
        if let Some(reward_token_id) = env
            .storage()
            .instance()
            .get::<DataKey, Address>(&DataKey::RewardToken)
        {
            let reward_client = RewardTokenClient::new(&env, &reward_token_id);
            // Best-effort: if the reward contract call fails, do not revert the donation
            let _ = reward_client.try_mint(&donor, &amount);
        }

        // Emit event
        events::donation_made(&env, campaign_id, &donor, amount, campaign.raised);

        Ok(())
    }

    /// Withdraw funds from a successful campaign.
    ///
    /// Only the campaign creator can withdraw after the goal is reached.
    pub fn withdraw(
        env: Env,
        campaign_id: u32,
        creator: Address,
    ) -> Result<i128, CrowdfundError> {
        creator.require_auth();

        let mut campaign: Campaign = env
            .storage()
            .persistent()
            .get(&DataKey::Campaign(campaign_id))
            .ok_or(CrowdfundError::CampaignNotFound)?;

        if campaign.creator != creator {
            return Err(CrowdfundError::Unauthorized);
        }

        if campaign.status != CampaignStatus::Successful {
            // Check if deadline passed and goal not reached
            let now = env.ledger().timestamp();
            if now > campaign.deadline && campaign.status == CampaignStatus::Active {
                campaign.status = CampaignStatus::Expired;
                env.storage()
                    .persistent()
                    .set(&DataKey::Campaign(campaign_id), &campaign);
            }
            return Err(CrowdfundError::CampaignNotSuccessful);
        }

        let amount = campaign.raised;

        if amount == 0 {
            return Err(CrowdfundError::NothingToWithdraw);
        }

        // Transfer funds to creator
        let native_token = token::Client::new(&env, &get_native_asset(&env));
        native_token.transfer(&env.current_contract_address(), &creator, &amount);

        // Mark as withdrawn
        campaign.raised = 0;
        campaign.status = CampaignStatus::Withdrawn;
        env.storage()
            .persistent()
            .set(&DataKey::Campaign(campaign_id), &campaign);

        // Emit event
        events::funds_withdrawn(&env, campaign_id, &creator, amount);

        Ok(amount)
    }

    /// Refund a donor if the campaign expired without meeting its goal.
    pub fn refund(
        env: Env,
        campaign_id: u32,
        donor: Address,
    ) -> Result<i128, CrowdfundError> {
        donor.require_auth();

        let mut campaign: Campaign = env
            .storage()
            .persistent()
            .get(&DataKey::Campaign(campaign_id))
            .ok_or(CrowdfundError::CampaignNotFound)?;

        let now = env.ledger().timestamp();

        // Campaign must be expired (deadline passed, goal not reached)
        if campaign.status == CampaignStatus::Active && now > campaign.deadline {
            campaign.status = CampaignStatus::Expired;
            env.storage()
                .persistent()
                .set(&DataKey::Campaign(campaign_id), &campaign);
        }

        if campaign.status != CampaignStatus::Expired {
            return Err(CrowdfundError::CampaignNotExpired);
        }

        // Find the donor's total donations
        let donations: Vec<Donation> = env
            .storage()
            .persistent()
            .get(&DataKey::Donations(campaign_id))
            .unwrap_or_else(|| Vec::new(&env));

        let mut refund_amount: i128 = 0;
        let mut new_donations: Vec<Donation> = Vec::new(&env);

        for d in donations.iter() {
            if d.donor == donor {
                refund_amount += d.amount;
            } else {
                new_donations.push_back(d);
            }
        }

        if refund_amount == 0 {
            return Err(CrowdfundError::NoDonationFound);
        }

        // Transfer refund
        let native_token = token::Client::new(&env, &get_native_asset(&env));
        native_token.transfer(
            &env.current_contract_address(),
            &donor,
            &refund_amount,
        );

        // Update donations
        campaign.raised -= refund_amount;
        env.storage()
            .persistent()
            .set(&DataKey::Campaign(campaign_id), &campaign);
        env.storage()
            .persistent()
            .set(&DataKey::Donations(campaign_id), &new_donations);

        // Emit event
        events::refund_issued(&env, campaign_id, &donor, refund_amount);

        Ok(refund_amount)
    }

    // ── Read-Only Queries ─────────────────────────────────────────────────────

    /// Get a single campaign by ID.
    pub fn get_campaign(env: Env, campaign_id: u32) -> Result<Campaign, CrowdfundError> {
        env.storage()
            .persistent()
            .get(&DataKey::Campaign(campaign_id))
            .ok_or(CrowdfundError::CampaignNotFound)
    }

    /// Get total number of campaigns.
    pub fn get_campaign_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::CampaignCount)
            .unwrap_or(0u32)
    }

    /// Get all campaigns (paginated).
    ///
    /// Returns campaigns from `start_id` up to `limit` campaigns.
    pub fn get_campaigns(env: Env, start_id: u32, limit: u32) -> Vec<Campaign> {
        let total: u32 = env
            .storage()
            .instance()
            .get(&DataKey::CampaignCount)
            .unwrap_or(0u32);

        let mut result: Vec<Campaign> = Vec::new(&env);
        let end = (start_id + limit).min(total + 1);

        for id in start_id..end {
            if let Some(campaign) = env
                .storage()
                .persistent()
                .get::<DataKey, Campaign>(&DataKey::Campaign(id))
            {
                result.push_back(campaign);
            }
        }

        result
    }

    /// Get all donations for a campaign.
    pub fn get_donations(env: Env, campaign_id: u32) -> Vec<Donation> {
        env.storage()
            .persistent()
            .get(&DataKey::Donations(campaign_id))
            .unwrap_or_else(|| Vec::new(&env))
    }

    /// Get the admin address.
    pub fn get_admin(env: Env) -> Result<Address, CrowdfundError> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(CrowdfundError::NotInitialized)
    }

    /// Extend a campaign's deadline (only creator can extend, only if Active).
    pub fn extend_deadline(
        env: Env,
        campaign_id: u32,
        creator: Address,
        new_deadline: u64,
    ) -> Result<(), CrowdfundError> {
        creator.require_auth();

        let mut campaign: Campaign = env
            .storage()
            .persistent()
            .get(&DataKey::Campaign(campaign_id))
            .ok_or(CrowdfundError::CampaignNotFound)?;

        if campaign.creator != creator {
            return Err(CrowdfundError::Unauthorized);
        }

        if campaign.status != CampaignStatus::Active {
            return Err(CrowdfundError::CampaignNotActive);
        }

        let now = env.ledger().timestamp();
        if new_deadline <= now || new_deadline <= campaign.deadline {
            return Err(CrowdfundError::InvalidDeadline);
        }

        campaign.deadline = new_deadline;
        env.storage()
            .persistent()
            .set(&DataKey::Campaign(campaign_id), &campaign);

        Ok(())
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

/// Returns the Stellar native asset (XLM) contract address.
/// On testnet, this is the well-known Stellar Asset Contract address for XLM.
fn get_native_asset(env: &Env) -> Address {
    // Testnet native XLM SAC address
    Address::from_str(
        env,
        "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
    )
}

// ──────────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{
        testutils::Address as _,
        Address, Env, String,
    };

    fn create_env() -> Env {
        let env = Env::default();
        env.mock_all_auths();
        env
    }

    fn setup_contract(env: &Env) -> (CrowdfundContractClient<'_>, Address) {
        let contract_id = env.register(CrowdfundContract, ());
        let client = CrowdfundContractClient::new(env, &contract_id);
        let admin = Address::generate(env);
        client.initialize(&admin);
        (client, admin)
    }

    // ── Test 1: Initialize ────────────────────────────────────────────────────
    #[test]
    fn test_initialize() {
        let env = create_env();
        let contract_id = env.register(CrowdfundContract, ());
        let client = CrowdfundContractClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        client.initialize(&admin);
        assert_eq!(client.get_admin(), admin);
        assert_eq!(client.get_campaign_count(), 0u32);
    }

    // ── Test 2: Double-initialize must fail ───────────────────────────────────
    #[test]
    fn test_double_initialize_fails() {
        let env = create_env();
        let (client, admin) = setup_contract(&env);
        let result = client.try_initialize(&admin);
        assert!(result.is_err());
    }

    // ── Test 3: Create campaign ───────────────────────────────────────────────
    #[test]
    fn test_create_campaign() {
        let env = create_env();
        let (client, _admin) = setup_contract(&env);

        let creator = Address::generate(&env);
        let title = String::from_str(&env, "Save the Forest");
        let description = String::from_str(&env, "Plant 10,000 trees in the Amazon");
        let goal: i128 = 1_000_000_000; // 100 XLM
        let deadline: u64 = env.ledger().timestamp() + 86_400; // 1 day

        let id = client.create_campaign(&creator, &title, &description, &goal, &deadline);
        assert_eq!(id, 1u32);
        assert_eq!(client.get_campaign_count(), 1u32);

        let campaign = client.get_campaign(&1u32);
        assert_eq!(campaign.creator, creator);
        assert_eq!(campaign.goal, goal);
        assert_eq!(campaign.raised, 0);
        assert_eq!(campaign.status, CampaignStatus::Active);
    }

    // ── Test 4: Create campaign with invalid goal fails ───────────────────────
    #[test]
    fn test_create_campaign_invalid_goal_fails() {
        let env = create_env();
        let (client, _admin) = setup_contract(&env);
        let creator = Address::generate(&env);
        let deadline = env.ledger().timestamp() + 86_400;
        let result = client.try_create_campaign(
            &creator,
            &String::from_str(&env, "Bad"),
            &String::from_str(&env, "Bad desc"),
            &0_i128, // invalid goal
            &deadline,
        );
        assert!(result.is_err());
    }

    // ── Test 5: Set reward token (admin-only) ─────────────────────────────────
    #[test]
    fn test_set_reward_token() {
        let env = create_env();
        let (client, admin) = setup_contract(&env);
        let fake_token = Address::generate(&env);
        client.set_reward_token(&admin, &fake_token);
        assert_eq!(client.get_reward_token(), Some(fake_token));
    }

    // ── Test 6: Non-admin cannot set reward token ─────────────────────────────
    #[test]
    fn test_set_reward_token_unauthorized_fails() {
        let env = create_env();
        let (client, _admin) = setup_contract(&env);
        let attacker = Address::generate(&env);
        let fake_token = Address::generate(&env);
        let result = client.try_set_reward_token(&attacker, &fake_token);
        assert!(result.is_err());
    }

    // ── Test 7: Get campaigns (paginated) ─────────────────────────────────────
    #[test]
    fn test_get_campaigns_paginated() {
        let env = create_env();
        let (client, _admin) = setup_contract(&env);
        let creator = Address::generate(&env);
        let deadline = env.ledger().timestamp() + 86_400;

        // Create 3 campaigns
        for i in 1u32..=3 {
            let title = String::from_str(&env, "Campaign");
            let desc = String::from_str(&env, "Description");
            client.create_campaign(&creator, &title, &desc, &1_000_000_i128, &deadline);
            assert_eq!(client.get_campaign_count(), i);
        }

        // Fetch with pagination
        let page = client.get_campaigns(&1u32, &2u32);
        assert_eq!(page.len(), 2);
        let page2 = client.get_campaigns(&3u32, &2u32);
        assert_eq!(page2.len(), 1);
    }

    // ── Test 8: Extend deadline ───────────────────────────────────────────────
    #[test]
    fn test_extend_deadline() {
        let env = create_env();
        let (client, _admin) = setup_contract(&env);
        let creator = Address::generate(&env);
        let original_deadline = env.ledger().timestamp() + 86_400;
        client.create_campaign(
            &creator,
            &String::from_str(&env, "T"),
            &String::from_str(&env, "D"),
            &1_000_000_i128,
            &original_deadline,
        );
        let new_deadline = original_deadline + 86_400;
        client.extend_deadline(&1u32, &creator, &new_deadline);
        let campaign = client.get_campaign(&1u32);
        assert_eq!(campaign.deadline, new_deadline);
    }
}
