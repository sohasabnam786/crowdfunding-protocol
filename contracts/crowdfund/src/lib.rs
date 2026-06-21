#![no_std]

mod types;
mod events;
mod storage;
mod error;

use soroban_sdk::{
    contract, contractimpl, contracttype, token,
    Address, Env, String, Symbol, Vec, Map,
    auth::Context,
};

use types::{Campaign, Donation, CampaignStatus, DataKey};
use error::CrowdfundError;

pub use error::CrowdfundError as Error;

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
        events::campaign_created(&env, campaign_id, &creator, &title, goal, deadline);

        Ok(campaign_id)
    }

    /// Donate XLM to a campaign.
    ///
    /// The donor must have pre-approved the transfer via the token contract.
    /// We use the native XLM token (Stellar Asset Contract).
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
        let native_token = token::StellarAssetClient::new(&env, &get_native_asset(&env));
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
        let native_token = token::StellarAssetClient::new(&env, &get_native_asset(&env));
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
        let mut donations: Vec<Donation> = env
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
        let native_token = token::StellarAssetClient::new(&env, &get_native_asset(&env));
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
        testutils::{Address as _, Ledger, LedgerInfo},
        Address, Env, String,
    };

    fn create_env() -> Env {
        let env = Env::default();
        env.mock_all_auths();
        env
    }

    #[test]
    fn test_initialize() {
        let env = create_env();
        let contract_id = env.register_contract(None, CrowdfundContract);
        let client = CrowdfundContractClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        client.initialize(&admin);
        assert_eq!(client.get_admin(), admin);
    }

    #[test]
    fn test_create_campaign() {
        let env = create_env();
        let contract_id = env.register_contract(None, CrowdfundContract);
        let client = CrowdfundContractClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        client.initialize(&admin);

        let creator = Address::generate(&env);
        let title = String::from_str(&env, "Save the Forest");
        let description = String::from_str(&env, "Plant 10,000 trees in the Amazon");
        let goal: i128 = 1_000_000_000; // 100 XLM
        let deadline: u64 = env.ledger().timestamp() + 86_400; // 1 day

        let id = client.create_campaign(&creator, &title, &description, &goal, &deadline);
        assert_eq!(id, 1u32);

        let campaign = client.get_campaign(&1u32);
        assert_eq!(campaign.creator, creator);
        assert_eq!(campaign.goal, goal);
        assert_eq!(campaign.raised, 0);
    }
}
