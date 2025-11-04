use cosmwasm_std::{Addr, Coin, Uint128};
use cw_multi_test::{App, AppBuilder, Contract, ContractWrapper, Executor};
use ustc_preregister::msg::{ExecuteMsg, InstantiateMsg, QueryMsg, GetUserDepositResponse, GetAllUsersResponse, GetUserCountResponse, GetTotalDepositsResponse, GetConfigResponse};

fn mock_app() -> App {
    AppBuilder::new().build(|router, _, storage| {
        router
            .bank
            .init_balance(storage, &Addr::unchecked("user1"), vec![Coin {
                denom: "uusd".to_string(),
                amount: Uint128::from(1000000u128),
            }])
            .unwrap();
        router
            .bank
            .init_balance(storage, &Addr::unchecked("user2"), vec![Coin {
                denom: "uusd".to_string(),
                amount: Uint128::from(1000000u128),
            }])
            .unwrap();
    })
}

fn contract_ustc_preregister() -> Box<dyn Contract<cosmwasm_std::Empty>> {
    let contract = ContractWrapper::new(
        ustc_preregister::contract::execute,
        ustc_preregister::contract::instantiate,
        ustc_preregister::contract::query,
    );
    Box::new(contract)
}

const USTC_DENOM: &str = "uusd";
const OWNER: &str = "owner";
const USER1: &str = "user1";
const USER2: &str = "user2";
const WITHDRAWAL_DEST: &str = "withdrawal_dest";

#[test]
fn test_instantiate() {
    let mut app = mock_app();
    let code_id = app.store_code(contract_ustc_preregister());

    let msg = InstantiateMsg {
        owner: Addr::unchecked(OWNER),
    };

    let contract_addr = app
        .instantiate_contract(
            code_id,
            Addr::unchecked(OWNER),
            &msg,
            &[],
            "USTC Preregister",
            None,
        )
        .unwrap();

    // Query config
    let query_msg = QueryMsg::GetConfig {};
    let res: GetConfigResponse = app
        .wrap()
        .query_wasm_smart(contract_addr.clone(), &query_msg)
        .unwrap();
    assert_eq!(res.owner, Addr::unchecked(OWNER));
    assert_eq!(res.ustc_denom, USTC_DENOM);
}

#[test]
fn test_deposit() {
    let mut app = mock_app();
    let code_id = app.store_code(contract_ustc_preregister());

    let msg = InstantiateMsg {
        owner: Addr::unchecked(OWNER),
    };

    let contract_addr = app
        .instantiate_contract(
            code_id,
            Addr::unchecked(OWNER),
            &msg,
            &[],
            "USTC Preregister",
            None,
        )
        .unwrap();

    // User1 deposits
    let deposit_amount = Uint128::from(1000u128);
    let msg = ExecuteMsg::Deposit {};
    app.execute_contract(
        Addr::unchecked(USER1),
        contract_addr.clone(),
        &msg,
        &[Coin {
            denom: USTC_DENOM.to_string(),
            amount: deposit_amount,
        }],
    )
    .unwrap();

    // Query user deposit
    let query_msg = QueryMsg::GetUserDeposit {
        user: Addr::unchecked(USER1),
    };
    let res: GetUserDepositResponse = app
        .wrap()
        .query_wasm_smart(contract_addr.clone(), &query_msg)
        .unwrap();
    assert_eq!(res.deposit, deposit_amount);

    // Query total deposits
    let query_msg = QueryMsg::GetTotalDeposits {};
    let res: GetTotalDepositsResponse = app
        .wrap()
        .query_wasm_smart(contract_addr.clone(), &query_msg)
        .unwrap();
    assert_eq!(res.total, deposit_amount);

    // Query user count
    let query_msg = QueryMsg::GetUserCount {};
    let res: GetUserCountResponse = app
        .wrap()
        .query_wasm_smart(contract_addr.clone(), &query_msg)
        .unwrap();
    assert_eq!(res.count, 1);
}

#[test]
fn test_withdraw() {
    let mut app = mock_app();
    let code_id = app.store_code(contract_ustc_preregister());

    let msg = InstantiateMsg {
        owner: Addr::unchecked(OWNER),
    };

    let contract_addr = app
        .instantiate_contract(
            code_id,
            Addr::unchecked(OWNER),
            &msg,
            &[],
            "USTC Preregister",
            None,
        )
        .unwrap();

    // User1 deposits
    let deposit_amount = Uint128::from(1000u128);
    let msg = ExecuteMsg::Deposit {};
    app.execute_contract(
        Addr::unchecked(USER1),
        contract_addr.clone(),
        &msg,
        &[Coin {
            denom: USTC_DENOM.to_string(),
            amount: deposit_amount,
        }],
    )
    .unwrap();

    // User1 withdraws
    let withdraw_amount = Uint128::from(500u128);
    let msg = ExecuteMsg::Withdraw {
        amount: withdraw_amount,
    };
    app.execute_contract(
        Addr::unchecked(USER1),
        contract_addr.clone(),
        &msg,
        &[],
    )
    .unwrap();

    // Query user deposit - should be 500
    let query_msg = QueryMsg::GetUserDeposit {
        user: Addr::unchecked(USER1),
    };
    let res: GetUserDepositResponse = app
        .wrap()
        .query_wasm_smart(contract_addr.clone(), &query_msg)
        .unwrap();
    assert_eq!(res.deposit, deposit_amount - withdraw_amount);
}

#[test]
fn test_multiple_users() {
    let mut app = mock_app();
    let code_id = app.store_code(contract_ustc_preregister());

    let msg = InstantiateMsg {
        owner: Addr::unchecked(OWNER),
    };

    let contract_addr = app
        .instantiate_contract(
            code_id,
            Addr::unchecked(OWNER),
            &msg,
            &[],
            "USTC Preregister",
            None,
        )
        .unwrap();

    // User1 deposits
    let msg = ExecuteMsg::Deposit {};
    app.execute_contract(
        Addr::unchecked(USER1),
        contract_addr.clone(),
        &msg,
        &[Coin {
            denom: USTC_DENOM.to_string(),
            amount: Uint128::from(1000u128),
        }],
    )
    .unwrap();

    // User2 deposits
    let msg = ExecuteMsg::Deposit {};
    app.execute_contract(
        Addr::unchecked(USER2),
        contract_addr.clone(),
        &msg,
        &[Coin {
            denom: USTC_DENOM.to_string(),
            amount: Uint128::from(2000u128),
        }],
    )
    .unwrap();

    // Query all users
    let query_msg = QueryMsg::GetAllUsers { start_after: None, limit: None };
    let res: GetAllUsersResponse = app
        .wrap()
        .query_wasm_smart(contract_addr.clone(), &query_msg)
        .unwrap();
    assert_eq!(res.users.len(), 2);

    // Query total deposits
    let query_msg = QueryMsg::GetTotalDeposits {};
    let res: GetTotalDepositsResponse = app
        .wrap()
        .query_wasm_smart(contract_addr.clone(), &query_msg)
        .unwrap();
    assert_eq!(res.total, Uint128::from(3000u128));
}

#[test]
fn test_owner_withdraw() {
    let mut app = mock_app();
    let code_id = app.store_code(contract_ustc_preregister());

    let msg = InstantiateMsg {
        owner: Addr::unchecked(OWNER),
    };

    let contract_addr = app
        .instantiate_contract(
            code_id,
            Addr::unchecked(OWNER),
            &msg,
            &[],
            "USTC Preregister",
            None,
        )
        .unwrap();

    // User1 deposits
    let msg = ExecuteMsg::Deposit {};
    app.execute_contract(
        Addr::unchecked(USER1),
        contract_addr.clone(),
        &msg,
        &[Coin {
            denom: USTC_DENOM.to_string(),
            amount: Uint128::from(1000u128),
        }],
    )
    .unwrap();

    // Get current block time
    let block_info = app.block_info();
    let current_time = block_info.time.seconds();
    
    // Set withdrawal destination with unlock timestamp (7 days + 1 second in the future)
    let unlock_timestamp = current_time + 7 * 24 * 60 * 60 + 1; // 7 days + 1 second
    let msg = ExecuteMsg::SetWithdrawalDestination {
        destination: Addr::unchecked(WITHDRAWAL_DEST),
        unlock_timestamp,
    };
    app.execute_contract(
        Addr::unchecked(OWNER),
        contract_addr.clone(),
        &msg,
        &[],
    )
    .unwrap();

    // Advance block time to pass the unlock timestamp
    app.update_block(|block| {
        block.time = block.time.plus_seconds(7 * 24 * 60 * 60 + 1);
    });

    // Owner withdraws
    let msg = ExecuteMsg::OwnerWithdraw {};
    app.execute_contract(
        Addr::unchecked(OWNER),
        contract_addr.clone(),
        &msg,
        &[],
    )
    .unwrap();

    // Verify withdrawal destination has the funds (not the owner)
    let balance = app
        .wrap()
        .query_balance(&Addr::unchecked(WITHDRAWAL_DEST), USTC_DENOM)
        .unwrap();
    assert_eq!(balance.amount, Uint128::from(1000u128));
}

#[test]
fn test_unauthorized_owner_withdraw() {
    let mut app = mock_app();
    let code_id = app.store_code(contract_ustc_preregister());

    let msg = InstantiateMsg {
        owner: Addr::unchecked(OWNER),
    };

    let contract_addr = app
        .instantiate_contract(
            code_id,
            Addr::unchecked(OWNER),
            &msg,
            &[],
            "USTC Preregister",
            None,
        )
        .unwrap();

    // Non-owner tries to withdraw
    let msg = ExecuteMsg::OwnerWithdraw {};
    let res = app.execute_contract(
        Addr::unchecked(USER1),
        contract_addr.clone(),
        &msg,
        &[],
    );
    assert!(res.is_err());
}

