use soroban_sdk::{contracttype, Address, String};

// ──────────────────────────────────────────────────────────────────────────────
// Storage Keys
// ──────────────────────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum DataKey {
    Admin,
    CampaignCount,
    Campaign(u32),
    Donations(u32),
    RewardToken,
}

// ──────────────────────────────────────────────────────────────────────────────
// Campaign Status
// ──────────────────────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum CampaignStatus {
    Active,
    Successful,
    Expired,
    Withdrawn,
}

// ──────────────────────────────────────────────────────────────────────────────
// Campaign
// ──────────────────────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug)]
pub struct Campaign {
    /// Unique campaign ID (auto-incremented).
    pub id: u32,
    /// Address of the campaign creator.
    pub creator: Address,
    /// Campaign title.
    pub title: String,
    /// Campaign description.
    pub description: String,
    /// Funding goal in stroops (1 XLM = 10_000_000 stroops).
    pub goal: i128,
    /// Unix timestamp (seconds) after which the campaign expires.
    pub deadline: u64,
    /// Total amount raised so far, in stroops.
    pub raised: i128,
    /// Current campaign status.
    pub status: CampaignStatus,
}

// ──────────────────────────────────────────────────────────────────────────────
// Donation
// ──────────────────────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug)]
pub struct Donation {
    /// Address of the donor.
    pub donor: Address,
    /// Amount donated in stroops.
    pub amount: i128,
    /// Ledger timestamp when the donation was made.
    pub timestamp: u64,
}
