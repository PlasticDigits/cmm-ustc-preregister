# USTC Preregister - Terra Classic Smart Contract

This is a CosmWasm smart contract for handling USTC deposits, withdrawals, and user enumeration on Terra Classic.

## Overview

The contract allows users to:
- Deposit native USTC tokens
- Withdraw their deposited USTC tokens
- Query their deposit balance
- Enumerate all users and their deposits

The contract owner can:
- Withdraw all accumulated USTC tokens
- Update contract configuration

## Project Structure

```
smartcontracts-terraclassic/
├── contracts/
│   └── ustc-preregister/
│       ├── Cargo.toml
│       ├── src/
│       │   ├── lib.rs              # Contract entry point
│       │   ├── contract.rs         # Execute, query, instantiate handlers
│       │   ├── state.rs            # State storage definitions
│       │   ├── msg.rs              # Message and query definitions
│       │   ├── error.rs            # Custom error types
│       │   ├── helpers.rs          # Utility functions
│       │   └── tests.rs            # Unit tests
│       ├── examples/
│       │   └── schema.rs           # Schema generation example
│       └── schema/                 # Generated JSON schemas
├── scripts/
│   ├── optimize.sh                 # Build optimization script
│   └── deploy.sh                   # Deployment script
├── tests/
│   └── integration.rs              # Integration tests
└── README.md
```

## Prerequisites

- Rust (latest stable version)
- Docker (for contract optimization)
- Terra Classic CLI (`terrad`) - for deployment

## Setup

1. **Install Rust** (if not already installed):
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **Clone the repository** (if not already cloned):
   ```bash
   git clone <repository-url>
   cd cmm-ustc-preregister/smartcontracts-terraclassic
   ```

3. **Build the contract**:
   ```bash
   cd contracts/ustc-preregister
   cargo build --release
   ```

## Testing

Run unit tests:
```bash
cd contracts/ustc-preregister
cargo test
```

All tests should pass. The test suite includes:
- Instantiation tests
- Deposit tests (including error cases)
- Withdraw tests (including error cases)
- Owner withdrawal tests
- Query tests (user deposits, all users, user count, total deposits, config)

## Building Optimized Contract

Before deploying, you need to build an optimized version of the contract:

```bash
cd smartcontracts-terraclassic
./scripts/optimize.sh
```

This will create an optimized WASM file in the `artifacts/` directory.

## Generating Schemas

To generate JSON schemas for the contract:

```bash
cd contracts/ustc-preregister
cargo run --example schema
```

The schemas will be generated in the `schema/` directory.

## Deployment

### Prerequisites for Deployment

1. Install `terrad` (Terra Classic CLI)
2. Configure your key with `terrad keys add <key-name>`
3. Fund your account with LUNA for gas fees

### Deploy to Testnet

```bash
cd smartcontracts-terraclassic
./scripts/deploy.sh testnet <your-terra-address> uusd
```

Follow the instructions provided by the script.

### Deploy to Mainnet

```bash
cd smartcontracts-terraclassic
./scripts/deploy.sh mainnet <your-terra-address> uusd
```

**⚠️ WARNING**: Only deploy to mainnet after thorough testing on testnet!

## Contract Functions

### Instantiate

```rust
{
  "owner": "terra1..."
}
```

Note: The USTC denomination is hardcoded to "uusd" and cannot be changed.

### Execute Messages

#### Deposit
```rust
{
  "deposit": {}
}
```
Sends native USTC tokens with the message.

#### Withdraw
```rust
{
  "withdraw": {
    "amount": "1000"
  }
}
```

#### Owner Withdraw
```rust
{
  "owner_withdraw": {}
}
```
Only callable by the contract owner. Withdraws all USTC tokens from the contract to the withdrawal destination (set via `SetWithdrawalDestination`). Requires a 7-day timelock to have passed.

**Important**: This function can be called multiple times. After a withdrawal, if users deposit additional USTC, the owner can withdraw again (subject to timelock requirements). User deposit records are preserved for future token conversion.

#### Update Config
```rust
{
  "update_config": {
    "owner": "terra1..." // optional
  }
}
```
Only callable by the contract owner.

### Query Messages

#### Get User Deposit
```rust
{
  "get_user_deposit": {
    "user": "terra1..."
  }
}
```

#### Get All Users
```rust
{
  "get_all_users": {
    "start_after": "terra1...", // Optional: user address to start pagination after
    "limit": 30                   // Optional: maximum number of results (default: 30, max: 100)
  }
}
```

Returns a paginated list of all users and their deposits. The response includes:
- `users`: Array of `(address, deposit)` tuples
- `next`: Optional cursor (user address) for the next page. If `None`, there are no more users.

Example pagination flow:
1. First query: `{"get_all_users": {"limit": 30}}` → Returns first 30 users, `next` contains cursor
2. Next query: `{"get_all_users": {"start_after": "<cursor>", "limit": 30}}` → Returns next 30 users

#### Get User Count
```rust
{
  "get_user_count": {}
}
```

#### Get Total Deposits
```rust
{
  "get_total_deposits": {}
}
```

#### Get Config
```rust
{
  "get_config": {}
}
```

#### Validate Index
```rust
{
  "validate_index": {}
}
```

Validates the consistency of the index storage system. Returns:
- `is_consistent`: Boolean indicating if all checks passed
- `issues`: Array of strings describing any issues found
- `user_count_stored`: The stored user count value
- `user_count_actual`: The actual number of users with non-zero balances
- `total_users_in_index`: Total entries in the index storage

This query is useful for debugging and ensuring data integrity.

## State Management

The contract uses an efficient index-based storage system for user enumeration:

- **User Storage**: `Map<&Addr, Uint128>` - O(1) lookup for user deposits
- **Index Storage**: `Map<u32, Addr>` and `Map<&Addr, u32>` - Efficient enumeration without loading entire user list
- **User Count**: `Item<u32>` - O(1) query for total user count
- **Index Maintenance**: When a user withdraws all funds and is removed, the last user is swapped to fill the gap, maintaining compact indices
- **Total Deposits**: `Item<Uint128>` - Tracks sum of all user deposits

This design supports 100k+ users efficiently and prevents gas issues from loading large arrays.

### Total Deposits vs Contract Balance

**Important Note**: The `total_deposits` value represents the sum of all user deposits tracked through the `Deposit` function. It does NOT necessarily equal the contract's actual USTC balance in the following scenarios:

1. **External Transfers**: If USTC tokens are sent directly to the contract address (not via the `Deposit` function), they will increase the contract balance but NOT the `total_deposits` counter. The owner can still withdraw these funds via `OwnerWithdraw`.

2. **Unaccounted Balance**: This allows the contract to handle edge cases like:
   - Accidental direct transfers
   - Airdrops
   - Refunds from other contracts
   - Any other mechanism that deposits USTC without using the `Deposit` function

3. **User Withdrawals**: When users withdraw, both `total_deposits` and the contract balance decrease.

4. **Owner Withdrawals**: When the owner withdraws via `OwnerWithdraw`, only the contract balance decreases (not `total_deposits`). **This is intentional**: user deposit records remain in storage to enable future conversion to tokens in a separate contract. The owner can call `OwnerWithdraw` multiple times - after a withdrawal, if users deposit additional USTC, the owner can withdraw again (subject to timelock requirements).

**Use Cases**:
- `total_deposits`: Use this to track how much users have deposited through the contract interface
- Contract balance (via queries): Use this to know the actual USTC amount available for owner withdrawal
- User balances: Tracked in storage for future token conversion, independent of contract balance

The `ValidateIndex` query can help verify that the sum of individual user deposits matches `total_deposits` for validation purposes.

### Owner Withdrawal and User Balance Conversion

The contract is designed to support a two-phase process:

1. **Preregistration Phase**: Users deposit USTC tokens, which are tracked in the contract's storage. The owner can withdraw accumulated USTC tokens (subject to a 7-day timelock) while user deposit records remain intact.

2. **Token Conversion Phase**: A future contract will read user deposit balances from this contract and issue tokens accordingly. User balances are preserved in storage specifically for this purpose, even after owner withdrawals.

This design allows the owner to access funds while maintaining the deposit history needed for token conversion.

## Error Handling

The contract includes comprehensive error handling:

- `Unauthorized` - Only owner can call owner-only functions
- `InvalidAmount` - Amount must be greater than zero
- `InsufficientBalance` - User does not have enough balance to withdraw
- `InvalidDenom` - Wrong token denomination provided
- `UserNotFound` - User not found (for queries)
- `NoBalanceToWithdraw` - Contract has no balance for owner withdrawal
- `IndexInconsistency` - Index storage corruption detected (should not occur in normal operation)
- `StartAfterUserNotFound` - Pagination cursor user not found in index
- `IndexConversionFailed` - Index conversion error (theoretical, unlikely in practice)

## Security Considerations

- Access control: Owner-only functions are protected
- Input validation: All amounts are validated (> 0)
- Denomination validation: Only the configured USTC denomination is accepted
- Balance checks: Users cannot withdraw more than they deposited
- Index consistency: Index corruption is detected and reported with explicit errors
- Error handling: Comprehensive error messages for debugging

## Dependencies

- `cosmwasm-std`: Core CosmWasm standard library
- `cw-storage-plus`: Enhanced storage utilities
- `cw2`: Contract versioning
- `thiserror`: Error handling
- `schemars`: JSON schema generation

## License

AGPL-3.0

## Support

For issues or questions, please open an issue on the repository.

