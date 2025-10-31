use cosmwasm_std::{Coin, MessageInfo, StdError, Uint128};
use crate::error::ContractError;
use crate::state::Config;

/// Validate that funds contain only the expected denomination
pub fn validate_denom(funds: &[Coin], expected_denom: &str) -> Result<Uint128, ContractError> {
    if funds.is_empty() {
        return Err(ContractError::InvalidAmount {});
    }
    
    if funds.len() > 1 {
        return Err(ContractError::Std(StdError::generic_err(
            "Multiple denominations not allowed"
        )));
    }
    
    let coin = &funds[0];
    if coin.denom != expected_denom {
        return Err(ContractError::InvalidDenom {
            expected: expected_denom.to_string(),
            got: coin.denom.clone(),
        });
    }
    
    if coin.amount.is_zero() {
        return Err(ContractError::InvalidAmount {});
    }
    
    Ok(coin.amount)
}

/// Verify that the caller is the owner
pub fn verify_owner(info: &MessageInfo, config: &Config) -> Result<(), ContractError> {
    if info.sender != config.owner {
        return Err(ContractError::Unauthorized {});
    }
    Ok(())
}

/// Remove a user from the index-based storage system.
/// 
/// This function implements the swap-and-remove pattern to maintain compact indices:
/// - If the user to remove is not the last user, swap it with the last user
/// - Then remove the last index entry
/// - This ensures indices remain compact and contiguous (0..user_count-1)
/// 
/// # Arguments
/// * `storage` - Mutable storage reference
/// * `user` - Address of the user to remove from index
/// 
/// # Returns
/// * `Ok(())` if removal was successful
/// * `Err(ContractError)` if index validation fails
pub fn remove_user_from_index(
    storage: &mut dyn cosmwasm_std::Storage,
    user: &cosmwasm_std::Addr,
) -> Result<(), crate::error::ContractError> {
    use crate::state::{USER_COUNT, USER_INDEX, USER_INDEX_REVERSE};
    
    // Get user's index from reverse mapping
    let user_index = if let Some(idx) = USER_INDEX_REVERSE.may_load(storage, user)? {
        idx
    } else {
        // User not in index, nothing to remove
        return Ok(());
    };
    
    // Get current user count
    let user_count = USER_COUNT.load(storage)?;
    
    // Validate that user_index is within valid range
    if user_index >= user_count {
        return Err(crate::error::ContractError::IndexInconsistency {});
    }
    
    // If there are other users, swap the removed user with the last one to maintain compact indices
    if user_count > 0 {
        let last_index = user_count - 1;
        
        // If removing user is not the last one, swap with last
        if user_index != last_index {
            // Get the last user - must exist if user_count > 0
            let last_user = USER_INDEX
                .may_load(storage, last_index)?
                .ok_or(crate::error::ContractError::IndexInconsistency {})?;
            
            // Swap: move last user to the position of the removed user
            USER_INDEX.save(storage, user_index, &last_user)?;
            USER_INDEX_REVERSE.save(storage, &last_user, &user_index)?;
        }
        
        // Remove the last index entry (which may now be the removed user's position after swap)
        USER_INDEX.remove(storage, last_index);
        
        // Decrement user count
        USER_COUNT.save(storage, &(user_count - 1))?;
    }
    
    // Always remove the reverse index entry
    USER_INDEX_REVERSE.remove(storage, user);
    
    Ok(())
}

/// Lightweight consistency check for index storage
/// 
/// Verifies basic consistency between forward and reverse index.
/// This is a minimal check that doesn't iterate all indices to avoid gas costs.
/// For full validation, use the ValidateIndex query.
/// 
/// Returns Ok(()) if consistent, or Err with description of inconsistency.
#[cfg(test)]
pub fn check_index_consistency_minimal(
    storage: &dyn cosmwasm_std::Storage,
    user: &cosmwasm_std::Addr,
    expected_index: u32,
) -> Result<(), String> {
    use crate::state::{USER_INDEX, USER_INDEX_REVERSE};
    
    // Check reverse index matches
    if let Some(reverse_idx) = USER_INDEX_REVERSE.may_load(storage, user)
        .map_err(|e| format!("Failed to load reverse index: {}", e))? {
        if reverse_idx != expected_index {
            return Err(format!(
                "Index mismatch: forward index has {}, reverse index has {}",
                expected_index, reverse_idx
            ));
        }
    } else {
        return Err(format!("User {} missing in reverse index", user));
    }
    
    // Check forward index matches
    if let Some(user_at_index) = USER_INDEX.may_load(storage, expected_index)
        .map_err(|e| format!("Failed to load forward index: {}", e))? {
        if user_at_index != *user {
            return Err(format!(
                "User mismatch at index {}: expected {}, found {}",
                expected_index, user, user_at_index
            ));
        }
    } else {
        return Err(format!("User {} missing in forward index at {}", user, expected_index));
    }
    
    Ok(())
}

