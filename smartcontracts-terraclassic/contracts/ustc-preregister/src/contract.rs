use cosmwasm_std::{
    BankMsg, Deps, DepsMut, Env, MessageInfo, Response, StdResult, Uint128, to_json_binary,
};
use cw2::set_contract_version;

use crate::error::ContractError;
use crate::helpers::{validate_denom, verify_owner, remove_user_from_index};
use crate::msg::{ExecuteMsg, InstantiateMsg, QueryMsg, GetUserDepositResponse, GetAllUsersResponse, GetUserCountResponse, GetTotalDepositsResponse, GetConfigResponse, ValidateIndexResponse, GetWithdrawalInfoResponse};
use crate::state::{Config, CONFIG, USERS, TOTAL_DEPOSITS, USER_COUNT, USER_INDEX, USER_INDEX_REVERSE, WITHDRAWAL_DESTINATION, WITHDRAWAL_UNLOCK_TIMESTAMP};

const CONTRACT_NAME: &str = "crates.io:ustc-preregister";
const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");
/// USTC denomination on Terra Classic (hardcoded as per proposal requirement)
const USTC_DENOM: &str = "uusd";
/// Default pagination limit for GetAllUsers query (hardcoded for consistency)
const DEFAULT_QUERY_LIMIT: u32 = 30;
/// Maximum pagination limit for GetAllUsers query (hardcoded to prevent excessive gas usage)
const MAX_QUERY_LIMIT: u32 = 100;

/// Instantiate the contract with owner address
/// 
/// # Arguments
/// * `deps` - Dependencies for storage and API access
/// * `_env` - Contract environment information
/// * `_info` - Message information (sender, funds)
/// * `msg` - Instantiation message containing owner address
/// 
/// # Returns
/// * `Response` with instantiation attributes
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    _info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;
    
    // Owner address is already validated as Addr type during deserialization
    let config = Config {
        owner: msg.owner,
        ustc_denom: USTC_DENOM.to_string(),
    };
    
    CONFIG.save(deps.storage, &config)?;
    TOTAL_DEPOSITS.save(deps.storage, &Uint128::zero())?;
    USER_COUNT.save(deps.storage, &0u32)?;
    
    // Initialize withdrawal destination to None and unlock timestamp to 0
    WITHDRAWAL_DESTINATION.save(deps.storage, &None)?;
    WITHDRAWAL_UNLOCK_TIMESTAMP.save(deps.storage, &0u64)?;
    
    Ok(Response::new()
        .add_attribute("action", "instantiate")
        .add_attribute("owner", config.owner.to_string())
        .add_attribute("ustc_denom", config.ustc_denom))
}

pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::Deposit {} => execute_deposit(deps, info),
        ExecuteMsg::Withdraw { amount } => execute_withdraw(deps, info, amount),
        ExecuteMsg::OwnerWithdraw {} => execute_owner_withdraw(deps, env, info),
        ExecuteMsg::UpdateConfig { owner } => execute_update_config(deps, info, owner),
        ExecuteMsg::SetWithdrawalDestination { destination, unlock_timestamp } => {
            execute_set_withdrawal_destination(deps, env, info, destination, unlock_timestamp)
        },
    }
}

/// Execute a deposit of USTC tokens
/// 
/// # Arguments
/// * `deps` - Dependencies for storage and API access
/// * `info` - Message information containing sender and funds
/// 
/// # Returns
/// * `Response` with deposit event attributes
pub fn execute_deposit(
    deps: DepsMut,
    info: MessageInfo,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    
    // Validate funds contain only USTC with correct denom
    let amount = validate_denom(&info.funds, &config.ustc_denom)?;
    
    let user = &info.sender;
    
    // Get current deposit or 0
    let current_deposit = USERS.may_load(deps.storage, user)?.unwrap_or(Uint128::zero());
    let is_new_user = current_deposit.is_zero();
    let new_deposit = current_deposit + amount;
    
    // Update user deposit
    USERS.save(deps.storage, user, &new_deposit)?;
    
    // Update total deposits
    let total_deposits = TOTAL_DEPOSITS.load(deps.storage)?;
    TOTAL_DEPOSITS.save(deps.storage, &(total_deposits + amount))?;
    
    // If new user, add to index-based storage
    if is_new_user {
        let user_count = USER_COUNT.load(deps.storage)?;
        let new_index = user_count;
        
        USER_INDEX.save(deps.storage, new_index, user)?;
        USER_INDEX_REVERSE.save(deps.storage, user, &new_index)?;
        USER_COUNT.save(deps.storage, &(user_count + 1))?;
    }
    
    let mut response = Response::new()
        .add_attribute("action", "deposit")
        .add_attribute("user", user.to_string())
        .add_attribute("amount", amount.to_string())
        .add_attribute("event", "deposit");
    
    if is_new_user {
        response = response.add_attribute("event", "user_added");
    }
    
    Ok(response)
}

/// Execute a withdrawal of USTC tokens
/// 
/// # Arguments
/// * `deps` - Dependencies for storage and API access
/// * `info` - Message information containing sender
/// * `amount` - Amount to withdraw
/// 
/// # Returns
/// * `Response` with withdrawal event and BankMsg to transfer tokens
pub fn execute_withdraw(
    deps: DepsMut,
    info: MessageInfo,
    amount: Uint128,
) -> Result<Response, ContractError> {
    // Validate amount > 0
    if amount.is_zero() {
        return Err(ContractError::InvalidAmount {});
    }
    
    let config = CONFIG.load(deps.storage)?;
    let user = &info.sender;
    
    // Get user deposit
    let current_deposit = USERS
        .may_load(deps.storage, user)?
        .unwrap_or(Uint128::zero());
    
    // Check sufficient balance
    if current_deposit < amount {
        return Err(ContractError::InsufficientBalance {});
    }
    
    // Subtract amount from deposit
    let new_deposit = current_deposit - amount;
    
    // Update user's deposit record and total deposits
    if new_deposit.is_zero() {
        USERS.remove(deps.storage, user);
        
        // Remove user from index-based storage when balance becomes zero
        // This uses the swap-and-remove pattern to maintain compact indices
        remove_user_from_index(deps.storage, user)?;
    } else {
        USERS.save(deps.storage, user, &new_deposit)?;
    }
    
    // Update total deposits
    let total_deposits = TOTAL_DEPOSITS.load(deps.storage)?;
    TOTAL_DEPOSITS.save(deps.storage, &(total_deposits - amount))?;
    
    // Transfer tokens via BankMsg
    let bank_msg = BankMsg::Send {
        to_address: user.to_string(),
        amount: vec![cosmwasm_std::Coin {
            denom: config.ustc_denom.clone(),
            amount,
        }],
    };
    
    Ok(Response::new()
        .add_message(bank_msg)
        .add_attribute("action", "withdraw")
        .add_attribute("user", user.to_string())
        .add_attribute("amount", amount.to_string())
        .add_attribute("event", "withdraw"))
}

/// Owner-only function to withdraw all accumulated USTC tokens
/// 
/// This function transfers all USTC tokens from the preregistration contract to the
/// withdrawal destination address (set via SetWithdrawalDestination). The withdrawal
/// is subject to a 7-day timelock: the unlock timestamp must be set and must have passed.
/// 
/// Requires:
/// - Withdrawal destination must be set via SetWithdrawalDestination
/// - Withdrawal unlock timestamp must be set and current time >= unlock timestamp
/// 
/// # Arguments
/// * `deps` - Dependencies for storage and API access
/// * `env` - Contract environment information
/// * `info` - Message information containing sender
/// 
/// # Returns
/// * `Response` with owner withdrawal event and BankMsg to transfer tokens
pub fn execute_owner_withdraw(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    
    // Check caller is owner
    verify_owner(&info, &config)?;
    
    // Check withdrawal destination is set
    let destination = WITHDRAWAL_DESTINATION
        .load(deps.storage)?
        .ok_or(ContractError::WithdrawalDestinationNotSet {})?;
    
    // Check unlock timestamp is set and has passed
    let unlock_timestamp = WITHDRAWAL_UNLOCK_TIMESTAMP.load(deps.storage)?;
    if unlock_timestamp == 0 {
        return Err(ContractError::WithdrawalTimestampNotSet {});
    }
    
    let current_time = env.block.time.seconds();
    if current_time < unlock_timestamp {
        return Err(ContractError::WithdrawalNotUnlocked {});
    }
    
    // Get contract balance
    let balance = deps.querier.query_balance(&env.contract.address, &config.ustc_denom)?;
    
    if balance.amount.is_zero() {
        return Err(ContractError::NoBalanceToWithdraw {});
    }
    
    // Transfer all to withdrawal destination via BankMsg
    let bank_msg = BankMsg::Send {
        to_address: destination.to_string(),
        amount: vec![balance.clone()],
    };
    
    Ok(Response::new()
        .add_message(bank_msg)
        .add_attribute("action", "owner_withdraw")
        .add_attribute("destination", destination.to_string())
        .add_attribute("amount", balance.amount.to_string())
        .add_attribute("event", "owner_withdraw"))
}

/// Owner-only function to set withdrawal destination and unlock timestamp
/// 
/// Sets the destination address for timelocked withdrawals and the timestamp when
/// withdrawal becomes available. The timestamp must be at least 7 days (604800 seconds)
/// in the future. Can be called multiple times to update the destination, but timestamp
/// always resets to the new value.
/// 
/// # Arguments
/// * `deps` - Dependencies for storage and API access
/// * `env` - Contract environment information
/// * `info` - Message information containing sender
/// * `destination` - Address to receive USTC withdrawals
/// * `unlock_timestamp` - Unix timestamp (in seconds) when withdrawal becomes available
/// 
/// # Returns
/// * `Response` with withdrawal destination set event attributes
pub fn execute_set_withdrawal_destination(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    destination: cosmwasm_std::Addr,
    unlock_timestamp: u64,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    
    // Check caller is owner
    verify_owner(&info, &config)?;
    
    // Validate timestamp is at least 7 days in the future
    let current_time = env.block.time.seconds();
    let min_timestamp = current_time + 7 * 24 * 60 * 60; // 7 days in seconds
    
    if unlock_timestamp < min_timestamp {
        return Err(ContractError::InvalidTimestamp {});
    }
    
    // Save withdrawal destination and unlock timestamp
    WITHDRAWAL_DESTINATION.save(deps.storage, &Some(destination.clone()))?;
    WITHDRAWAL_UNLOCK_TIMESTAMP.save(deps.storage, &unlock_timestamp)?;
    
    Ok(Response::new()
        .add_attribute("action", "set_withdrawal_destination")
        .add_attribute("destination", destination.to_string())
        .add_attribute("unlock_timestamp", unlock_timestamp.to_string()))
}

/// Owner-only function to update contract configuration
/// 
/// # Arguments
/// * `deps` - Dependencies for storage and API access
/// * `info` - Message information containing sender
/// * `owner` - Optional new owner address
/// 
/// # Returns
/// * `Response` with config update event attributes
pub fn execute_update_config(
    deps: DepsMut,
    info: MessageInfo,
    owner: Option<cosmwasm_std::Addr>,
) -> Result<Response, ContractError> {
    let mut config = CONFIG.load(deps.storage)?;
    
    // Check caller is owner
    verify_owner(&info, &config)?;
    
    // Update owner if provided
    if let Some(new_owner) = owner {
        // Owner address is already validated as Addr type during deserialization
        config.owner = new_owner;
        CONFIG.save(deps.storage, &config)?;
    }
    
    Ok(Response::new()
        .add_attribute("action", "update_config")
        .add_attribute("owner", config.owner.to_string())
        .add_attribute("event", "config_updated"))
}

pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<cosmwasm_std::Binary> {
    match msg {
        QueryMsg::GetUserDeposit { user } => to_json_binary(&query_user_deposit(deps, user)?),
        QueryMsg::GetAllUsers { start_after, limit } => {
            query_all_users(deps, start_after, limit)
                .map_err(|e| cosmwasm_std::StdError::generic_err(e.to_string()))
                .and_then(|res| to_json_binary(&res))
        },
        QueryMsg::GetUserCount {} => to_json_binary(&query_user_count(deps)?),
        QueryMsg::GetTotalDeposits {} => to_json_binary(&query_total_deposits(deps)?),
        QueryMsg::GetConfig {} => to_json_binary(&query_config(deps)?),
        QueryMsg::ValidateIndex {} => to_json_binary(&query_validate_index(deps)?),
        QueryMsg::GetWithdrawalInfo {} => to_json_binary(&query_withdrawal_info(deps)?),
    }
}

/// Query the deposit balance for a specific user
/// 
/// # Arguments
/// * `deps` - Dependencies for storage and API access
/// * `user` - Address of the user to query
/// 
/// # Returns
/// * `GetUserDepositResponse` containing user address and deposit amount
pub fn query_user_deposit(
    deps: Deps,
    user: cosmwasm_std::Addr,
) -> StdResult<GetUserDepositResponse> {
    let deposit = USERS.may_load(deps.storage, &user)?.unwrap_or(Uint128::zero());
    Ok(GetUserDepositResponse {
        user,
        deposit,
    })
}

/// Query all users with pagination support
/// 
/// Returns a paginated list of users and their deposits. Uses index-based storage
/// for efficient enumeration without loading the entire user list.
/// 
/// # Arguments
/// * `deps` - Dependencies for storage and API access
/// * `start_after` - Optional user address to start pagination after
/// * `limit` - Optional limit on number of results (default: 30, max: 100)
/// 
/// # Returns
/// * `GetAllUsersResponse` containing users list and optional next cursor
pub fn query_all_users(
    deps: Deps,
    start_after: Option<cosmwasm_std::Addr>,
    limit: Option<u32>,
) -> Result<GetAllUsersResponse, ContractError> {
    let limit = limit.unwrap_or(DEFAULT_QUERY_LIMIT).min(MAX_QUERY_LIMIT) as usize;
    let user_count_u32 = USER_COUNT.load(deps.storage)?;
    let user_count = user_count_u32 as usize;
    
    // Determine starting index
    let start_idx = if let Some(start_after) = start_after {
        // Find the index of the start_after user
        // Return explicit error if start_after user is not found in index
        // 
        // PAGINATION EDGE CASE: If a user withdraws all funds between pagination calls,
        // they will be removed from the index. If that user was used as a cursor (start_after),
        // the next pagination query will fail with StartAfterUserNotFound error.
        // Frontend should handle this gracefully by restarting pagination from the beginning
        // if this error is encountered.
        let idx = USER_INDEX_REVERSE
            .may_load(deps.storage, &start_after)?
            .ok_or(ContractError::StartAfterUserNotFound {})?;
        (idx as usize) + 1
    } else {
        0
    };
    
    let mut users = Vec::new();
    
    // Iterate through user indices starting from start_idx
    for idx in start_idx..user_count {
        // Get user at this index
        // Convert usize to u32, error if conversion fails (shouldn't happen in practice)
        let idx_u32 = u32::try_from(idx)
            .map_err(|_| ContractError::IndexConversionFailed {})?;
        if let Some(user) = USER_INDEX.may_load(deps.storage, idx_u32)? {
            // Only include users with non-zero balance
            if let Some(deposit) = USERS.may_load(deps.storage, &user)? {
                if !deposit.is_zero() {
                    users.push((user.clone(), deposit));
                    
                    // If we've reached the limit, determine if there are more users
                    if users.len() >= limit {
                        // Check if there are more indices to process
                        // We don't need to look ahead through all remaining users - just check if there are more indices
                        let has_more = (idx + 1) < user_count;
                        
                        if has_more {
                            // next cursor is the last user we included (for cursor-based pagination)
                            let last_user = users.last().map(|(user, _)| user.clone());
                            if let Some(next_cursor) = last_user {
                                return Ok(GetAllUsersResponse {
                                    users,
                                    next: Some(next_cursor),
                                });
                            }
                        }
                        break;
                    }
                }
            }
        }
    }
    
    // No more users to paginate, so next is None
    Ok(GetAllUsersResponse { users, next: None })
}

/// Query the total number of unique users with non-zero balances
/// 
/// Uses the stored user_count which is efficiently maintained during deposits/withdrawals.
/// 
/// # Arguments
/// * `deps` - Dependencies for storage and API access
/// 
/// # Returns
/// * `GetUserCountResponse` containing the user count
pub fn query_user_count(deps: Deps) -> StdResult<GetUserCountResponse> {
    let count = USER_COUNT.load(deps.storage)?;
    Ok(GetUserCountResponse { count })
}

/// Query the total amount of USTC deposited across all users
/// 
/// # Arguments
/// * `deps` - Dependencies for storage and API access
/// 
/// # Returns
/// * `GetTotalDepositsResponse` containing the total deposit amount
pub fn query_total_deposits(deps: Deps) -> StdResult<GetTotalDepositsResponse> {
    let total = TOTAL_DEPOSITS.load(deps.storage)?;
    Ok(GetTotalDepositsResponse { total })
}

/// Query the contract configuration
/// 
/// # Arguments
/// * `deps` - Dependencies for storage and API access
/// 
/// # Returns
/// * `GetConfigResponse` containing owner address and USTC denomination
pub fn query_config(deps: Deps) -> StdResult<GetConfigResponse> {
    let config = CONFIG.load(deps.storage)?;
    Ok(GetConfigResponse {
        owner: config.owner,
        ustc_denom: config.ustc_denom,
    })
}

/// Validate index consistency
/// 
/// Performs comprehensive validation of the index storage system:
/// - Checks that user_count matches actual number of users in index
/// - Verifies all indices are valid and point to users with non-zero balances
/// - Validates reverse index matches forward index
/// - Checks for gaps in indices
/// 
/// # Arguments
/// * `deps` - Dependencies for storage and API access
/// 
/// # Returns
/// * `ValidateIndexResponse` containing validation results and any issues found
pub fn query_validate_index(deps: Deps) -> StdResult<ValidateIndexResponse> {
    let user_count_stored = USER_COUNT.load(deps.storage)?;
    let mut issues = Vec::new();
    let mut users_found = 0u32;
    let mut total_in_index = 0u32;
    
    // Iterate through all stored indices
    for idx in 0..user_count_stored {
        if let Some(user) = USER_INDEX.may_load(deps.storage, idx)? {
            total_in_index += 1;
            
            // Check if user exists in USERS map
            if let Some(deposit) = USERS.may_load(deps.storage, &user)? {
                if !deposit.is_zero() {
                    users_found += 1;
                } else {
                    issues.push(format!("User {} at index {} has zero balance but is in index", user, idx));
                }
            } else {
                issues.push(format!("User {} at index {} not found in USERS map", user, idx));
            }
            
            // Check reverse index consistency
            if let Some(reverse_idx) = USER_INDEX_REVERSE.may_load(deps.storage, &user)? {
                if reverse_idx != idx {
                    issues.push(format!("Reverse index mismatch: user {} has index {} in forward, {} in reverse", user, idx, reverse_idx));
                }
            } else {
                issues.push(format!("User {} at index {} missing in reverse index", user, idx));
            }
        } else {
            issues.push(format!("Gap detected: index {} is missing", idx));
        }
    }
    
    // Check for users in reverse index that aren't in forward index
    // Note: We can't easily iterate USER_INDEX_REVERSE, so we rely on the forward check above
    
    // Check stored count vs actual count
    if user_count_stored != users_found {
        issues.push(format!(
            "User count mismatch: stored count is {}, actual users with non-zero balance is {}",
            user_count_stored, users_found
        ));
    }
    
    let is_consistent = issues.is_empty();
    
    Ok(ValidateIndexResponse {
        is_consistent,
        issues,
        user_count_stored,
        user_count_actual: users_found,
        total_users_in_index: total_in_index,
    })
}

/// Query withdrawal information
/// 
/// Returns the withdrawal destination address, unlock timestamp, and whether
/// withdrawal is configured (both destination and timestamp are set).
/// 
/// # Arguments
/// * `deps` - Dependencies for storage and API access
/// 
/// # Returns
/// * `GetWithdrawalInfoResponse` containing withdrawal configuration
pub fn query_withdrawal_info(deps: Deps) -> StdResult<GetWithdrawalInfoResponse> {
    let destination = WITHDRAWAL_DESTINATION.load(deps.storage)?;
    let unlock_timestamp = WITHDRAWAL_UNLOCK_TIMESTAMP.load(deps.storage)?;
    let is_configured = destination.is_some() && unlock_timestamp != 0;
    
    Ok(GetWithdrawalInfoResponse {
        destination,
        unlock_timestamp,
        is_configured,
    })
}

