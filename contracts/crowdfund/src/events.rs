use soroban_sdk::{Address, Env, String, Symbol, symbol_short};

/// Emitted when a new campaign is created.
pub fn campaign_created(
    env: &Env,
    campaign_id: u32,
    creator: &Address,
    title: &String,
    goal: i128,
    deadline: u64,
) {
    env.events().publish(
        (Symbol::new(env, "campaign"), Symbol::new(env, "created")),
        (campaign_id, creator, title, goal, deadline),
    );
}

/// Emitted when a donation is made.
pub fn donation_made(
    env: &Env,
    campaign_id: u32,
    donor: &Address,
    amount: i128,
    total_raised: i128,
) {
    env.events().publish(
        (Symbol::new(env, "donation"), Symbol::new(env, "made")),
        (campaign_id, donor, amount, total_raised),
    );
}

/// Emitted when a campaign creator withdraws funds.
pub fn funds_withdrawn(
    env: &Env,
    campaign_id: u32,
    creator: &Address,
    amount: i128,
) {
    env.events().publish(
        (Symbol::new(env, "funds"), Symbol::new(env, "withdrawn")),
        (campaign_id, creator, amount),
    );
}

/// Emitted when a donor is refunded.
pub fn refund_issued(
    env: &Env,
    campaign_id: u32,
    donor: &Address,
    amount: i128,
) {
    env.events().publish(
        (Symbol::new(env, "refund"), Symbol::new(env, "issued")),
        (campaign_id, donor, amount),
    );
}
