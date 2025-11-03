use cosmwasm_std::Addr;
use cw_storage_plus::{Item, Map};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use cosmwasm_std::Uint128;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, JsonSchema)]
pub struct Config {
    pub owner: Addr,
    pub ustc_denom: String,
}

pub const CONFIG: Item<Config> = Item::new("config");
pub const USERS: Map<&Addr, Uint128> = Map::new("users");
pub const TOTAL_DEPOSITS: Item<Uint128> = Item::new("total_deposits");
pub const USER_COUNT: Item<u32> = Item::new("user_count");

// Index-based storage for user enumeration to prevent loading full vector
// Uses a simple counter-based index mapping: index => user_address
pub const USER_INDEX: Map<u32, Addr> = Map::new("user_idx");
// Reverse mapping: user_address => index
pub const USER_INDEX_REVERSE: Map<&Addr, u32> = Map::new("user_idx_rev");

/// Withdrawal destination address for timelocked withdrawals
/// Initialized to None, must be set by owner before withdrawal is possible
pub const WITHDRAWAL_DESTINATION: Item<Option<Addr>> = Item::new("withdrawal_dest");

/// Timestamp when withdrawal becomes available (Unix timestamp in seconds)
/// Initialized to 0, must be set by owner before withdrawal is possible
/// Must be at least 7 days (604800 seconds) in the future when set
pub const WITHDRAWAL_UNLOCK_TIMESTAMP: Item<u64> = Item::new("withdrawal_unlock");

