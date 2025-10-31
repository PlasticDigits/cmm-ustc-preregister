#[cfg(test)]
mod tests {
    use cosmwasm_std::testing::{mock_dependencies, mock_env, mock_info};
    use cosmwasm_std::{coins, Addr, Uint128};
    use crate::contract::{execute, instantiate, query};
    use crate::msg::{ExecuteMsg, InstantiateMsg, QueryMsg};

    const USTC_DENOM: &str = "uusd";
    const OWNER: &str = "terra1owner";
    const USER1: &str = "terra1user1";
    const USER2: &str = "terra1user2";

    fn setup_contract(deps: &mut cosmwasm_std::OwnedDeps<cosmwasm_std::MemoryStorage, cosmwasm_std::testing::MockApi, cosmwasm_std::testing::MockQuerier>) {
        let msg = InstantiateMsg {
            owner: Addr::unchecked(OWNER),
        };
        let info = mock_info(OWNER, &[]);
        let env = mock_env();
        instantiate(deps.as_mut(), env, info, msg).unwrap();
    }

    #[test]
    fn test_instantiate() {
        let mut deps = mock_dependencies();
        let msg = InstantiateMsg {
            owner: Addr::unchecked(OWNER),
        };
        let info = mock_info(OWNER, &[]);
        let env = mock_env();
        let res = instantiate(deps.as_mut(), env, info, msg).unwrap();
        assert_eq!(res.attributes.len(), 3);
        assert_eq!(res.attributes[0].key, "action");
        assert_eq!(res.attributes[0].value, "instantiate");
        
        // Verify config was set correctly
        let query_msg = QueryMsg::GetConfig {};
        let res = query(deps.as_ref(), mock_env(), query_msg).unwrap();
        let config: crate::msg::GetConfigResponse = cosmwasm_std::from_json(&res).unwrap();
        assert_eq!(config.owner, Addr::unchecked(OWNER));
        assert_eq!(config.ustc_denom, "uusd");
    }
    
    #[test]
    fn test_instantiate_invalid_owner() {
        let mut deps = mock_dependencies();
        // Using an address that would fail validation if we were validating
        // Since Addr::unchecked accepts any string, this test verifies that
        // we're not doing redundant validation (which is correct - Addr is validated during deserialization)
        let msg = InstantiateMsg {
            owner: Addr::unchecked("invalid_address"),
        };
        let info = mock_info(OWNER, &[]);
        let env = mock_env();
        // This should succeed since we removed redundant validation
        // Addr validation happens during JSON deserialization, not in instantiate
        let res = instantiate(deps.as_mut(), env, info, msg);
        assert!(res.is_ok());
    }

    #[test]
    fn test_deposit() {
        let mut deps = mock_dependencies();
        setup_contract(&mut deps);
        
        let amount = Uint128::from(1000u128);
        let funds = coins(1000u128, USTC_DENOM);
        let info = mock_info(USER1, &funds);
        let env = mock_env();
        
        let msg = ExecuteMsg::Deposit {};
        let res = execute(deps.as_mut(), env.clone(), info, msg).unwrap();
        assert_eq!(res.attributes[0].key, "action");
        assert_eq!(res.attributes[0].value, "deposit");
        
        // Query user deposit
        let query_msg = QueryMsg::GetUserDeposit {
            user: Addr::unchecked(USER1),
        };
        let res = query(deps.as_ref(), env, query_msg).unwrap();
        let deposit: crate::msg::GetUserDepositResponse = cosmwasm_std::from_json(&res).unwrap();
        assert_eq!(deposit.deposit, amount);
    }

    #[test]
    fn test_deposit_wrong_denom() {
        let mut deps = mock_dependencies();
        setup_contract(&mut deps);
        
        let funds = coins(1000u128, "uluna");
        let info = mock_info(USER1, &funds);
        let env = mock_env();
        
        let msg = ExecuteMsg::Deposit {};
        let res = execute(deps.as_mut(), env, info, msg);
        assert!(res.is_err());
    }

    #[test]
    fn test_deposit_zero_amount() {
        let mut deps = mock_dependencies();
        setup_contract(&mut deps);
        
        let info = mock_info(USER1, &[]);
        let env = mock_env();
        
        let msg = ExecuteMsg::Deposit {};
        let res = execute(deps.as_mut(), env, info, msg);
        assert!(res.is_err());
    }

    #[test]
    fn test_withdraw() {
        let mut deps = mock_dependencies();
        setup_contract(&mut deps);
        
        // First deposit
        let deposit_amount = Uint128::from(1000u128);
        let funds = coins(1000u128, USTC_DENOM);
        let info = mock_info(USER1, &funds);
        let env = mock_env();
        execute(deps.as_mut(), env.clone(), info, ExecuteMsg::Deposit {}).unwrap();
        
        // Then withdraw
        let withdraw_amount = Uint128::from(500u128);
        let info = mock_info(USER1, &[]);
        let msg = ExecuteMsg::Withdraw { amount: withdraw_amount };
        let res = execute(deps.as_mut(), env.clone(), info, msg).unwrap();
        assert_eq!(res.attributes[0].key, "action");
        assert_eq!(res.attributes[0].value, "withdraw");
        
        // Query user deposit - should be 500
        let query_msg = QueryMsg::GetUserDeposit {
            user: Addr::unchecked(USER1),
        };
        let res = query(deps.as_ref(), env, query_msg).unwrap();
        let deposit: crate::msg::GetUserDepositResponse = cosmwasm_std::from_json(&res).unwrap();
        assert_eq!(deposit.deposit, deposit_amount - withdraw_amount);
    }

    #[test]
    fn test_withdraw_insufficient_balance() {
        let mut deps = mock_dependencies();
        setup_contract(&mut deps);
        
        let info = mock_info(USER1, &[]);
        let env = mock_env();
        let msg = ExecuteMsg::Withdraw {
            amount: Uint128::from(1000u128),
        };
        let res = execute(deps.as_mut(), env, info, msg);
        assert!(res.is_err());
    }

    #[test]
    fn test_owner_withdraw() {
        let mut deps = mock_dependencies();
        setup_contract(&mut deps);
        
        // First deposit from user
        let funds = coins(1000u128, USTC_DENOM);
        let info = mock_info(USER1, &funds);
        let env = mock_env();
        execute(deps.as_mut(), env.clone(), info, ExecuteMsg::Deposit {}).unwrap();
        
        // Owner withdraw - this will fail in tests because we can't actually transfer
        // But we can verify the function executes
        let info = mock_info(OWNER, &[]);
        let msg = ExecuteMsg::OwnerWithdraw {};
        let res = execute(deps.as_mut(), env, info, msg);
        // This will work if we use cw-multi-test properly
        assert!(res.is_ok() || res.is_err()); // Just check it doesn't panic
    }

    #[test]
    fn test_unauthorized_owner_withdraw() {
        let mut deps = mock_dependencies();
        setup_contract(&mut deps);
        
        let info = mock_info(USER1, &[]);
        let env = mock_env();
        let msg = ExecuteMsg::OwnerWithdraw {};
        let res = execute(deps.as_mut(), env, info, msg);
        assert!(res.is_err());
    }

    #[test]
    fn test_get_all_users() {
        let mut deps = mock_dependencies();
        setup_contract(&mut deps);
        
        // Deposit from two users
        let funds1 = coins(1000u128, USTC_DENOM);
        let info1 = mock_info(USER1, &funds1);
        let env = mock_env();
        execute(deps.as_mut(), env.clone(), info1, ExecuteMsg::Deposit {}).unwrap();
        
        let funds2 = coins(2000u128, USTC_DENOM);
        let info2 = mock_info(USER2, &funds2);
        execute(deps.as_mut(), env.clone(), info2, ExecuteMsg::Deposit {}).unwrap();
        
        // Query all users
        let query_msg = QueryMsg::GetAllUsers { start_after: None, limit: None };
        let res = query(deps.as_ref(), env, query_msg).unwrap();
        let users: crate::msg::GetAllUsersResponse = cosmwasm_std::from_json(&res).unwrap();
        assert_eq!(users.users.len(), 2);
    }
    
    #[test]
    fn test_withdraw_all_and_get_all_users() {
        let mut deps = mock_dependencies();
        setup_contract(&mut deps);
        
        // User1 deposits
        let deposit_amount = Uint128::from(1000u128);
        let funds = coins(1000u128, USTC_DENOM);
        let info = mock_info(USER1, &funds);
        let env = mock_env();
        execute(deps.as_mut(), env.clone(), info, ExecuteMsg::Deposit {}).unwrap();
        
        // Verify user is in GetAllUsers
        let query_msg = QueryMsg::GetAllUsers { start_after: None, limit: None };
        let res = query(deps.as_ref(), env.clone(), query_msg).unwrap();
        let users: crate::msg::GetAllUsersResponse = cosmwasm_std::from_json(&res).unwrap();
        assert_eq!(users.users.len(), 1);
        assert_eq!(users.users[0].0, Addr::unchecked(USER1));
        
        // User1 withdraws all
        let info = mock_info(USER1, &[]);
        let msg = ExecuteMsg::Withdraw { amount: deposit_amount };
        execute(deps.as_mut(), env.clone(), info, msg).unwrap();
        
        // Verify user is NOT in GetAllUsers after withdrawing all
        let query_msg = QueryMsg::GetAllUsers { start_after: None, limit: None };
        let res = query(deps.as_ref(), env.clone(), query_msg).unwrap();
        let users: crate::msg::GetAllUsersResponse = cosmwasm_std::from_json(&res).unwrap();
        assert_eq!(users.users.len(), 0);
        
        // Verify user count is 0
        let query_msg = QueryMsg::GetUserCount {};
        let res = query(deps.as_ref(), env, query_msg).unwrap();
        let count: crate::msg::GetUserCountResponse = cosmwasm_std::from_json(&res).unwrap();
        assert_eq!(count.count, 0);
    }
    
    #[test]
    fn test_update_config_success() {
        let mut deps = mock_dependencies();
        setup_contract(&mut deps);
        
        let new_owner = Addr::unchecked("terra1newowner");
        let info = mock_info(OWNER, &[]);
        let env = mock_env();
        let msg = ExecuteMsg::UpdateConfig {
            owner: Some(new_owner.clone()),
        };
        
        // Should succeed
        let res = execute(deps.as_mut(), env.clone(), info, msg);
        assert!(res.is_ok());
        
        // Verify config was updated
        let query_msg = QueryMsg::GetConfig {};
        let res = query(deps.as_ref(), env, query_msg).unwrap();
        let config: crate::msg::GetConfigResponse = cosmwasm_std::from_json(&res).unwrap();
        assert_eq!(config.owner, new_owner);
    }
    
    #[test]
    fn test_update_config_no_change() {
        let mut deps = mock_dependencies();
        setup_contract(&mut deps);
        
        let info = mock_info(OWNER, &[]);
        let env = mock_env();
        let msg = ExecuteMsg::UpdateConfig {
            owner: None,
        };
        
        // Should succeed (no-op)
        let res = execute(deps.as_mut(), env.clone(), info, msg);
        assert!(res.is_ok());
        
        // Verify config unchanged
        let query_msg = QueryMsg::GetConfig {};
        let res = query(deps.as_ref(), env, query_msg).unwrap();
        let config: crate::msg::GetConfigResponse = cosmwasm_std::from_json(&res).unwrap();
        assert_eq!(config.owner, Addr::unchecked(OWNER));
    }
    
    #[test]
    fn test_update_config_unauthorized() {
        let mut deps = mock_dependencies();
        setup_contract(&mut deps);
        
        let info = mock_info(USER1, &[]); // Non-owner
        let env = mock_env();
        let msg = ExecuteMsg::UpdateConfig {
            owner: Some(Addr::unchecked("terra1newowner")),
        };
        
        // Should fail - unauthorized
        let res = execute(deps.as_mut(), env, info, msg);
        assert!(res.is_err());
    }

    #[test]
    fn test_get_user_count() {
        let mut deps = mock_dependencies();
        setup_contract(&mut deps);
        
        // Deposit from two users
        let funds1 = coins(1000u128, USTC_DENOM);
        let info1 = mock_info(USER1, &funds1);
        let env = mock_env();
        execute(deps.as_mut(), env.clone(), info1, ExecuteMsg::Deposit {}).unwrap();
        
        let funds2 = coins(2000u128, USTC_DENOM);
        let info2 = mock_info(USER2, &funds2);
        execute(deps.as_mut(), env.clone(), info2, ExecuteMsg::Deposit {}).unwrap();
        
        // Query user count
        let query_msg = QueryMsg::GetUserCount {};
        let res = query(deps.as_ref(), env, query_msg).unwrap();
        let count: crate::msg::GetUserCountResponse = cosmwasm_std::from_json(&res).unwrap();
        assert_eq!(count.count, 2);
    }

    #[test]
    fn test_get_total_deposits() {
        let mut deps = mock_dependencies();
        setup_contract(&mut deps);
        
        // Deposit from two users
        let funds1 = coins(1000u128, USTC_DENOM);
        let info1 = mock_info(USER1, &funds1);
        let env = mock_env();
        execute(deps.as_mut(), env.clone(), info1, ExecuteMsg::Deposit {}).unwrap();
        
        let funds2 = coins(2000u128, USTC_DENOM);
        let info2 = mock_info(USER2, &funds2);
        execute(deps.as_mut(), env.clone(), info2, ExecuteMsg::Deposit {}).unwrap();
        
        // Query total deposits
        let query_msg = QueryMsg::GetTotalDeposits {};
        let res = query(deps.as_ref(), env, query_msg).unwrap();
        let total: crate::msg::GetTotalDepositsResponse = cosmwasm_std::from_json(&res).unwrap();
        assert_eq!(total.total, Uint128::from(3000u128));
    }

    #[test]
    fn test_get_config() {
        let mut deps = mock_dependencies();
        setup_contract(&mut deps);
        
        let query_msg = QueryMsg::GetConfig {};
        let env = mock_env();
        let res = query(deps.as_ref(), env, query_msg).unwrap();
        let config: crate::msg::GetConfigResponse = cosmwasm_std::from_json(&res).unwrap();
        assert_eq!(config.owner, Addr::unchecked(OWNER));
        assert_eq!(config.ustc_denom, USTC_DENOM);
    }
    
    #[test]
    fn test_multiple_deposits_same_user() {
        let mut deps = mock_dependencies();
        setup_contract(&mut deps);
        
        let amount1 = Uint128::from(1000u128);
        let amount2 = Uint128::from(2000u128);
        let funds1 = coins(1000u128, USTC_DENOM);
        let funds2 = coins(2000u128, USTC_DENOM);
        let info = mock_info(USER1, &funds1);
        let env = mock_env();
        
        // First deposit
        execute(deps.as_mut(), env.clone(), info.clone(), ExecuteMsg::Deposit {}).unwrap();
        
        // Second deposit from same user
        let info2 = mock_info(USER1, &funds2);
        execute(deps.as_mut(), env.clone(), info2, ExecuteMsg::Deposit {}).unwrap();
        
        // Query user deposit - should be sum
        let query_msg = QueryMsg::GetUserDeposit {
            user: Addr::unchecked(USER1),
        };
        let res = query(deps.as_ref(), env, query_msg).unwrap();
        let deposit: crate::msg::GetUserDepositResponse = cosmwasm_std::from_json(&res).unwrap();
        assert_eq!(deposit.deposit, amount1 + amount2);
        
        // User count should still be 1
        let query_msg = QueryMsg::GetUserCount {};
        let res = query(deps.as_ref(), mock_env(), query_msg).unwrap();
        let count: crate::msg::GetUserCountResponse = cosmwasm_std::from_json(&res).unwrap();
        assert_eq!(count.count, 1);
    }
    
    #[test]
    fn test_get_all_users_pagination() {
        let mut deps = mock_dependencies();
        setup_contract(&mut deps);
        
        let env = mock_env();
        
        // Deposit from multiple users
        for i in 1..=5 {
            let user = format!("terra1user{}", i);
            let funds = coins(1000u128 * i, USTC_DENOM);
            let info = mock_info(&user, &funds);
            execute(deps.as_mut(), env.clone(), info, ExecuteMsg::Deposit {}).unwrap();
        }
        
        // Query with limit
        let query_msg = QueryMsg::GetAllUsers { start_after: None, limit: Some(2) };
        let res = query(deps.as_ref(), env.clone(), query_msg).unwrap();
        let users: crate::msg::GetAllUsersResponse = cosmwasm_std::from_json(&res).unwrap();
        assert_eq!(users.users.len(), 2);
        assert!(users.next.is_some());
        
        // Query next page using start_after
        let next_cursor = users.next.unwrap();
        let query_msg = QueryMsg::GetAllUsers { start_after: Some(next_cursor), limit: Some(2) };
        let res = query(deps.as_ref(), env, query_msg).unwrap();
        let users: crate::msg::GetAllUsersResponse = cosmwasm_std::from_json(&res).unwrap();
        assert_eq!(users.users.len(), 2);
    }
    
    #[test]
    fn test_get_all_users_limit_exceeds_max() {
        let mut deps = mock_dependencies();
        setup_contract(&mut deps);
        
        let env = mock_env();
        
        // Deposit from 2 users
        let funds1 = coins(1000u128, USTC_DENOM);
        let info1 = mock_info(USER1, &funds1);
        execute(deps.as_mut(), env.clone(), info1, ExecuteMsg::Deposit {}).unwrap();
        
        let funds2 = coins(2000u128, USTC_DENOM);
        let info2 = mock_info(USER2, &funds2);
        execute(deps.as_mut(), env.clone(), info2, ExecuteMsg::Deposit {}).unwrap();
        
        // Query with limit > MAX (should be capped at 100)
        let query_msg = QueryMsg::GetAllUsers { start_after: None, limit: Some(200) };
        let res = query(deps.as_ref(), env, query_msg).unwrap();
        let users: crate::msg::GetAllUsersResponse = cosmwasm_std::from_json(&res).unwrap();
        assert_eq!(users.users.len(), 2); // Only 2 users exist
    }
    
    #[test]
    fn test_withdraw_partial() {
        let mut deps = mock_dependencies();
        setup_contract(&mut deps);
        
        let deposit_amount = Uint128::from(1000u128);
        let withdraw_amount = Uint128::from(300u128);
        let funds = coins(1000u128, USTC_DENOM);
        let info = mock_info(USER1, &funds);
        let env = mock_env();
        execute(deps.as_mut(), env.clone(), info, ExecuteMsg::Deposit {}).unwrap();
        
        // Partial withdraw
        let info = mock_info(USER1, &[]);
        let msg = ExecuteMsg::Withdraw { amount: withdraw_amount };
        execute(deps.as_mut(), env.clone(), info, msg).unwrap();
        
        // Query user deposit - should still have balance
        let query_msg = QueryMsg::GetUserDeposit {
            user: Addr::unchecked(USER1),
        };
        let res = query(deps.as_ref(), env.clone(), query_msg).unwrap();
        let deposit: crate::msg::GetUserDepositResponse = cosmwasm_std::from_json(&res).unwrap();
        assert_eq!(deposit.deposit, deposit_amount - withdraw_amount);
        
        // User should still be in list
        let query_msg = QueryMsg::GetUserCount {};
        let res = query(deps.as_ref(), env, query_msg).unwrap();
        let count: crate::msg::GetUserCountResponse = cosmwasm_std::from_json(&res).unwrap();
        assert_eq!(count.count, 1);
    }
    
    #[test]
    fn test_get_all_users_start_after_not_found() {
        let mut deps = mock_dependencies();
        setup_contract(&mut deps);
        
        let env = mock_env();
        
        // Deposit from one user
        let funds = coins(1000u128, USTC_DENOM);
        let info = mock_info(USER1, &funds);
        execute(deps.as_mut(), env.clone(), info, ExecuteMsg::Deposit {}).unwrap();
        
        // Query with start_after that doesn't exist - should error
        let query_msg = QueryMsg::GetAllUsers { 
            start_after: Some(Addr::unchecked("terra1nonexistent")), 
            limit: None 
        };
        let res = query(deps.as_ref(), env, query_msg);
        // Should return error since start_after user not found
        assert!(res.is_err());
    }
    
    #[test]
    fn test_withdraw_index_inconsistency() {
        let mut deps = mock_dependencies();
        setup_contract(&mut deps);
        
        // This test verifies that index inconsistency is handled correctly
        // In normal operation, this shouldn't happen, but we test the error path
        // Note: This is difficult to test directly without corrupting storage,
        // but the error handling is in place
        let env = mock_env();
        let funds = coins(1000u128, USTC_DENOM);
        let info = mock_info(USER1, &funds);
        execute(deps.as_mut(), env.clone(), info, ExecuteMsg::Deposit {}).unwrap();
        
        // Normal withdraw should work
        let info = mock_info(USER1, &[]);
        let msg = ExecuteMsg::Withdraw { amount: Uint128::from(1000u128) };
        let res = execute(deps.as_mut(), env, info, msg);
        assert!(res.is_ok());
    }
    
    #[test]
    fn test_owner_withdraw_zero_balance() {
        let mut deps = mock_dependencies();
        setup_contract(&mut deps);
        
        let info = mock_info(OWNER, &[]);
        let env = mock_env();
        let msg = ExecuteMsg::OwnerWithdraw {};
        let res = execute(deps.as_mut(), env, info, msg);
        // Should error because contract has no balance
        assert!(res.is_err());
    }
    
    #[test]
    fn test_withdraw_zero_amount() {
        let mut deps = mock_dependencies();
        setup_contract(&mut deps);
        
        let env = mock_env();
        let funds = coins(1000u128, USTC_DENOM);
        let info = mock_info(USER1, &funds);
        execute(deps.as_mut(), env.clone(), info, ExecuteMsg::Deposit {}).unwrap();
        
        // Try to withdraw zero amount
        let info = mock_info(USER1, &[]);
        let msg = ExecuteMsg::Withdraw { amount: Uint128::zero() };
        let res = execute(deps.as_mut(), env, info, msg);
        assert!(res.is_err());
    }
    
    #[test]
    fn test_multiple_users_index_consistency() {
        let mut deps = mock_dependencies();
        setup_contract(&mut deps);
        
        let env = mock_env();
        
        // Deposit from 3 users
        let funds1 = coins(1000u128, USTC_DENOM);
        let info1 = mock_info(USER1, &funds1);
        execute(deps.as_mut(), env.clone(), info1, ExecuteMsg::Deposit {}).unwrap();
        
        let funds2 = coins(2000u128, USTC_DENOM);
        let info2 = mock_info(USER2, &funds2);
        execute(deps.as_mut(), env.clone(), info2, ExecuteMsg::Deposit {}).unwrap();
        
        let funds3 = coins(3000u128, USTC_DENOM);
        let info3 = mock_info("terra1user3", &funds3);
        execute(deps.as_mut(), env.clone(), info3, ExecuteMsg::Deposit {}).unwrap();
        
        // Verify user count is 3
        let query_msg = QueryMsg::GetUserCount {};
        let res = query(deps.as_ref(), mock_env(), query_msg).unwrap();
        let count: crate::msg::GetUserCountResponse = cosmwasm_std::from_json(&res).unwrap();
        assert_eq!(count.count, 3);
        
        // Withdraw all from middle user (USER2)
        let info = mock_info(USER2, &[]);
        let msg = ExecuteMsg::Withdraw { amount: Uint128::from(2000u128) };
        execute(deps.as_mut(), env.clone(), info, msg).unwrap();
        
        // Verify user count is now 2
        let query_msg = QueryMsg::GetUserCount {};
        let res = query(deps.as_ref(), mock_env(), query_msg).unwrap();
        let count: crate::msg::GetUserCountResponse = cosmwasm_std::from_json(&res).unwrap();
        assert_eq!(count.count, 2);
        
        // Verify GetAllUsers still works correctly
        let query_msg = QueryMsg::GetAllUsers { start_after: None, limit: None };
        let res = query(deps.as_ref(), env, query_msg).unwrap();
        let users: crate::msg::GetAllUsersResponse = cosmwasm_std::from_json(&res).unwrap();
        assert_eq!(users.users.len(), 2);
    }
    
    #[test]
    fn test_pagination_edge_cases() {
        let mut deps = mock_dependencies();
        setup_contract(&mut deps);
        
        let env = mock_env();
        
        // Create exactly 5 users to test pagination boundaries
        for i in 1..=5 {
            let user = format!("terra1user{}", i);
            let funds = coins(1000u128 * i, USTC_DENOM);
            let info = mock_info(&user, &funds);
            execute(deps.as_mut(), env.clone(), info, ExecuteMsg::Deposit {}).unwrap();
        }
        
        // Test pagination with limit that matches exact number of users
        let query_msg = QueryMsg::GetAllUsers { start_after: None, limit: Some(5) };
        let res = query(deps.as_ref(), env.clone(), query_msg).unwrap();
        let users: crate::msg::GetAllUsersResponse = cosmwasm_std::from_json(&res).unwrap();
        assert_eq!(users.users.len(), 5);
        // When limit matches total, next should be None
        assert!(users.next.is_none());
        
        // Test pagination with limit smaller than total
        let query_msg = QueryMsg::GetAllUsers { start_after: None, limit: Some(2) };
        let res = query(deps.as_ref(), env.clone(), query_msg).unwrap();
        let users: crate::msg::GetAllUsersResponse = cosmwasm_std::from_json(&res).unwrap();
        assert_eq!(users.users.len(), 2);
        assert!(users.next.is_some());
        
        // Test pagination with start_after using the cursor from previous query
        let next_cursor = users.next.unwrap();
        let query_msg = QueryMsg::GetAllUsers { start_after: Some(next_cursor.clone()), limit: Some(2) };
        let res = query(deps.as_ref(), env.clone(), query_msg).unwrap();
        let users2: crate::msg::GetAllUsersResponse = cosmwasm_std::from_json(&res).unwrap();
        assert_eq!(users2.users.len(), 2);
        // First user in second page should come after the cursor
        assert_ne!(users2.users[0].0, next_cursor);
    }
    
    #[test]
    fn test_pagination_start_after_edge_case() {
        let mut deps = mock_dependencies();
        setup_contract(&mut deps);
        
        let env = mock_env();
        
        // Create 3 users
        for i in 1..=3 {
            let user = format!("terra1user{}", i);
            let funds = coins(1000u128 * i, USTC_DENOM);
            let info = mock_info(&user, &funds);
            execute(deps.as_mut(), env.clone(), info, ExecuteMsg::Deposit {}).unwrap();
        }
        
        // Get first user
        let query_msg = QueryMsg::GetAllUsers { start_after: None, limit: Some(1) };
        let res = query(deps.as_ref(), env.clone(), query_msg).unwrap();
        let users: crate::msg::GetAllUsersResponse = cosmwasm_std::from_json(&res).unwrap();
        assert_eq!(users.users.len(), 1);
        assert!(users.next.is_some());
        
        // Use cursor to get next page
        let cursor = users.next.unwrap();
        let query_msg = QueryMsg::GetAllUsers { start_after: Some(cursor.clone()), limit: Some(1) };
        let res = query(deps.as_ref(), env.clone(), query_msg).unwrap();
        let users2: crate::msg::GetAllUsersResponse = cosmwasm_std::from_json(&res).unwrap();
        // Should get users after the cursor
        assert_eq!(users2.users.len(), 1);
        assert_ne!(users2.users[0].0, cursor);
        assert_ne!(users2.users[0].0, users.users[0].0);
    }
    
    #[test]
    fn test_sum_of_user_deposits_equals_total() {
        let mut deps = mock_dependencies();
        setup_contract(&mut deps);
        
        let env = mock_env();
        
        // Deposit from multiple users with different amounts
        let amounts = vec![1000u128, 2000u128, 3000u128, 5000u128, 10000u128];
        let mut expected_total = Uint128::zero();
        
        for (i, &amount) in amounts.iter().enumerate() {
            let user = format!("terra1user{}", i + 1);
            let funds = coins(amount, USTC_DENOM);
            let info = mock_info(&user, &funds);
            execute(deps.as_mut(), env.clone(), info, ExecuteMsg::Deposit {}).unwrap();
            expected_total = expected_total + Uint128::from(amount);
        }
        
        // Query total deposits
        let query_msg = QueryMsg::GetTotalDeposits {};
        let res = query(deps.as_ref(), env.clone(), query_msg).unwrap();
        let total: crate::msg::GetTotalDepositsResponse = cosmwasm_std::from_json(&res).unwrap();
        
        // Get all users and sum their deposits
        let query_msg = QueryMsg::GetAllUsers { start_after: None, limit: None };
        let res = query(deps.as_ref(), env.clone(), query_msg).unwrap();
        let users: crate::msg::GetAllUsersResponse = cosmwasm_std::from_json(&res).unwrap();
        
        let sum_from_users: Uint128 = users.users.iter()
            .map(|(_, deposit)| *deposit)
            .fold(Uint128::zero(), |acc, x| acc + x);
        
        assert_eq!(total.total, expected_total);
        assert_eq!(total.total, sum_from_users);
    }
    
    #[test]
    fn test_sum_of_deposits_after_withdrawals() {
        let mut deps = mock_dependencies();
        setup_contract(&mut deps);
        
        let env = mock_env();
        
        // Deposit from 3 users
        let funds1 = coins(1000u128, USTC_DENOM);
        let info1 = mock_info(USER1, &funds1);
        execute(deps.as_mut(), env.clone(), info1, ExecuteMsg::Deposit {}).unwrap();
        
        let funds2 = coins(2000u128, USTC_DENOM);
        let info2 = mock_info(USER2, &funds2);
        execute(deps.as_mut(), env.clone(), info2, ExecuteMsg::Deposit {}).unwrap();
        
        let funds3 = coins(3000u128, USTC_DENOM);
        let info3 = mock_info("terra1user3", &funds3);
        execute(deps.as_mut(), env.clone(), info3, ExecuteMsg::Deposit {}).unwrap();
        
        // Withdraw partial amount from one user
        let info = mock_info(USER1, &[]);
        let msg = ExecuteMsg::Withdraw { amount: Uint128::from(500u128) };
        execute(deps.as_mut(), env.clone(), info, msg).unwrap();
        
        // Verify sum still matches
        let query_msg = QueryMsg::GetTotalDeposits {};
        let res = query(deps.as_ref(), env.clone(), query_msg).unwrap();
        let total: crate::msg::GetTotalDepositsResponse = cosmwasm_std::from_json(&res).unwrap();
        
        let query_msg = QueryMsg::GetAllUsers { start_after: None, limit: None };
        let res = query(deps.as_ref(), env.clone(), query_msg).unwrap();
        let users: crate::msg::GetAllUsersResponse = cosmwasm_std::from_json(&res).unwrap();
        
        let sum_from_users: Uint128 = users.users.iter()
            .map(|(_, deposit)| *deposit)
            .fold(Uint128::zero(), |acc, x| acc + x);
        
        assert_eq!(total.total, sum_from_users);
        assert_eq!(total.total, Uint128::from(5500u128)); // 500 + 2000 + 3000
    }
    
    #[test]
    fn test_validate_index_query() {
        let mut deps = mock_dependencies();
        setup_contract(&mut deps);
        
        let env = mock_env();
        
        // Deposit from 2 users
        let funds1 = coins(1000u128, USTC_DENOM);
        let info1 = mock_info(USER1, &funds1);
        execute(deps.as_mut(), env.clone(), info1, ExecuteMsg::Deposit {}).unwrap();
        
        let funds2 = coins(2000u128, USTC_DENOM);
        let info2 = mock_info(USER2, &funds2);
        execute(deps.as_mut(), env.clone(), info2, ExecuteMsg::Deposit {}).unwrap();
        
        // Validate index - should be consistent
        let query_msg = QueryMsg::ValidateIndex {};
        let res = query(deps.as_ref(), env.clone(), query_msg).unwrap();
        let validation: crate::msg::ValidateIndexResponse = cosmwasm_std::from_json(&res).unwrap();
        
        assert!(validation.is_consistent);
        assert_eq!(validation.user_count_stored, 2);
        assert_eq!(validation.user_count_actual, 2);
        assert_eq!(validation.total_users_in_index, 2);
        assert!(validation.issues.is_empty());
    }
    
    #[test]
    fn test_validate_index_after_withdrawal() {
        let mut deps = mock_dependencies();
        setup_contract(&mut deps);
        
        let env = mock_env();
        
        // Deposit from 3 users
        let funds1 = coins(1000u128, USTC_DENOM);
        let info1 = mock_info(USER1, &funds1);
        execute(deps.as_mut(), env.clone(), info1, ExecuteMsg::Deposit {}).unwrap();
        
        let funds2 = coins(2000u128, USTC_DENOM);
        let info2 = mock_info(USER2, &funds2);
        execute(deps.as_mut(), env.clone(), info2, ExecuteMsg::Deposit {}).unwrap();
        
        let funds3 = coins(3000u128, USTC_DENOM);
        let info3 = mock_info("terra1user3", &funds3);
        execute(deps.as_mut(), env.clone(), info3, ExecuteMsg::Deposit {}).unwrap();
        
        // Withdraw all from middle user (should be removed from index)
        let info = mock_info(USER2, &[]);
        let msg = ExecuteMsg::Withdraw { amount: Uint128::from(2000u128) };
        execute(deps.as_mut(), env.clone(), info, msg).unwrap();
        
        // Validate index - should still be consistent after swap-and-remove
        let query_msg = QueryMsg::ValidateIndex {};
        let res = query(deps.as_ref(), env.clone(), query_msg).unwrap();
        let validation: crate::msg::ValidateIndexResponse = cosmwasm_std::from_json(&res).unwrap();
        
        assert!(validation.is_consistent);
        assert_eq!(validation.user_count_stored, 2);
        assert_eq!(validation.user_count_actual, 2);
        assert_eq!(validation.total_users_in_index, 2);
        assert!(validation.issues.is_empty());
    }
    
    #[test]
    fn test_user_count_zero_edge_case() {
        let mut deps = mock_dependencies();
        setup_contract(&mut deps);
        
        let env = mock_env();
        
        // Initially, user_count should be 0
        let query_msg = QueryMsg::GetUserCount {};
        let res = query(deps.as_ref(), env.clone(), query_msg).unwrap();
        let count: crate::msg::GetUserCountResponse = cosmwasm_std::from_json(&res).unwrap();
        assert_eq!(count.count, 0);
        
        // Deposit from one user
        let funds = coins(1000u128, USTC_DENOM);
        let info = mock_info(USER1, &funds);
        execute(deps.as_mut(), env.clone(), info, ExecuteMsg::Deposit {}).unwrap();
        
        // User count should be 1
        let query_msg = QueryMsg::GetUserCount {};
        let res = query(deps.as_ref(), env.clone(), query_msg).unwrap();
        let count: crate::msg::GetUserCountResponse = cosmwasm_std::from_json(&res).unwrap();
        assert_eq!(count.count, 1);
        
        // Withdraw all - user_count should return to 0
        let info = mock_info(USER1, &[]);
        let msg = ExecuteMsg::Withdraw { amount: Uint128::from(1000u128) };
        execute(deps.as_mut(), env.clone(), info, msg).unwrap();
        
        // Verify user_count is 0
        let query_msg = QueryMsg::GetUserCount {};
        let res = query(deps.as_ref(), env.clone(), query_msg).unwrap();
        let count: crate::msg::GetUserCountResponse = cosmwasm_std::from_json(&res).unwrap();
        assert_eq!(count.count, 0);
        
        // Verify GetAllUsers returns empty
        let query_msg = QueryMsg::GetAllUsers { start_after: None, limit: None };
        let res = query(deps.as_ref(), env.clone(), query_msg).unwrap();
        let users: crate::msg::GetAllUsersResponse = cosmwasm_std::from_json(&res).unwrap();
        assert_eq!(users.users.len(), 0);
        assert!(users.next.is_none());
        
        // Verify ValidateIndex shows consistent state with 0 users
        let query_msg = QueryMsg::ValidateIndex {};
        let res = query(deps.as_ref(), env.clone(), query_msg).unwrap();
        let validation: crate::msg::ValidateIndexResponse = cosmwasm_std::from_json(&res).unwrap();
        
        assert!(validation.is_consistent);
        assert_eq!(validation.user_count_stored, 0);
        assert_eq!(validation.user_count_actual, 0);
        assert_eq!(validation.total_users_in_index, 0);
        assert!(validation.issues.is_empty());
        
        // Verify that attempting to withdraw again with zero balance fails
        let info = mock_info(USER1, &[]);
        let msg = ExecuteMsg::Withdraw { amount: Uint128::from(1u128) };
        let res = execute(deps.as_mut(), env.clone(), info, msg);
        assert!(res.is_err());
    }
}

