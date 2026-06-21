use soroban_sdk::{contracterror};

#[contracterror]
#[derive(Clone, Debug, PartialEq)]
pub enum CrowdfundError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    CampaignNotFound = 4,
    CampaignNotActive = 5,
    CampaignExpired = 6,
    CampaignNotSuccessful = 7,
    CampaignNotExpired = 8,
    InvalidGoal = 9,
    InvalidDeadline = 10,
    InvalidAmount = 11,
    NothingToWithdraw = 12,
    NoDonationFound = 13,
    TransferFailed = 14,
}
