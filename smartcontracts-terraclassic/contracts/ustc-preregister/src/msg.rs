use cosmwasm_schema::{cw_serde, QueryResponses};
use cosmwasm_std::Addr;
use cosmwasm_std::Uint128;

#[cw_serde]
pub struct InstantiateMsg {
    pub owner: Addr,
}

#[cw_serde]
pub enum ExecuteMsg {
    Deposit {},
    Withdraw { amount: Uint128 },
    OwnerWithdraw {},
    UpdateConfig { owner: Option<Addr> },
}

#[cw_serde]
#[derive(QueryResponses)]
pub enum QueryMsg {
    #[returns(GetUserDepositResponse)]
    GetUserDeposit { user: Addr },
    
    /// Get all users with pagination support
    /// 
    /// Returns a paginated list of users and their deposits.
    /// 
    /// # Parameters
    /// * `start_after` - Optional user address to start pagination after (for cursor-based pagination)
    /// * `limit` - Optional limit on number of results (default: 30, max: 100)
    /// 
    /// # Example
    /// ```json
    /// {
    ///   "get_all_users": {
    ///     "start_after": null,
    ///     "limit": 50
    ///   }
    /// }
    /// ```
    #[returns(GetAllUsersResponse)]
    GetAllUsers { 
        /// User address to start pagination after (cursor for next page)
        start_after: Option<Addr>, 
        /// Maximum number of results to return (default: 30, max: 100)
        limit: Option<u32> 
    },
    
    #[returns(GetUserCountResponse)]
    GetUserCount {},
    
    #[returns(GetTotalDepositsResponse)]
    GetTotalDeposits {},
    
    #[returns(GetConfigResponse)]
    GetConfig {},
    
    /// Validate index consistency
    /// 
    /// Checks that the index storage is consistent:
    /// - user_count matches actual number of users in index
    /// - All indices are valid and point to users with non-zero balances
    /// - Reverse index matches forward index
    /// 
    /// This is useful for debugging and ensuring data integrity.
    #[returns(ValidateIndexResponse)]
    ValidateIndex {},
}

// Response types
#[cw_serde]
pub struct GetUserDepositResponse {
    pub user: Addr,
    pub deposit: Uint128,
}


#[cw_serde]
pub struct GetUserCountResponse {
    pub count: u32,
}

#[cw_serde]
pub struct GetAllUsersResponse {
    pub users: Vec<(Addr, Uint128)>,
    pub next: Option<Addr>, // For pagination
}

#[cw_serde]
pub struct GetTotalDepositsResponse {
    pub total: Uint128,
}

#[cw_serde]
pub struct GetConfigResponse {
    pub owner: Addr,
    pub ustc_denom: String,
}

#[cw_serde]
pub struct ValidateIndexResponse {
    pub is_consistent: bool,
    pub issues: Vec<String>,
    pub user_count_stored: u32,
    pub user_count_actual: u32,
    pub total_users_in_index: u32,
}

