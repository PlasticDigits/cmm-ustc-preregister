# USTC Preregister - BSC Smart Contract

Smart contract for handling USTC-cb deposits, withdrawals, and user enumeration on Binance Smart Chain (BSC).

## Overview

The `USTCPreregister` contract allows users to:
- Deposit USTC-cb tokens into the contract
- Withdraw their deposited tokens
- Enumerate all users who have deposited

The contract owner can withdraw all accumulated tokens.

## Public deployments

BSC Mainnet: `0xe50DaD8c95dd7A43D792a040146EFaA4801d62B8`

## Features

- ✅ Enumerable user list using OpenZeppelin's `EnumerableSet`
- ✅ Reentrancy protection using `ReentrancyGuard`
- ✅ Owner-only withdrawal functionality
- ✅ Safe ERC20 token transfers using `SafeERC20`
- ✅ 100% test coverage
- ✅ Comprehensive event emission for transparency

## Contract Details

- **Token**: USTC-cb (ERC20) at `0xA4224f910102490Dc02AAbcBc6cb3c59Ff390055`
- **Owner**: `0x745A676C5c472b50B50e18D4b59e9AeEEc597046`
- **Network**: Binance Smart Chain (BSC)
- **Solidity Version**: 0.8.23

## Project Structure

```
smartcontracts-bsc/
├── script/
│   └── Deploy.s.sol              # Deployment script
├── src/
│   ├── USTCPreregister.sol       # Main contract
│   └── interfaces/
│       └── IUSTCPreregister.sol  # Interface for frontend integration
├── test/
│   ├── USTCPreregister.t.sol     # Comprehensive test suite
│   └── helpers/
│       └── MockERC20.sol         # Mock ERC20 token for testing
├── foundry.toml                  # Foundry configuration
└── README.md                     # This file
```

## Setup

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) installed
- Node.js (for dependency management)

### Installation

1. Clone the repository and navigate to the contract directory:
```bash
cd smartcontracts-bsc
```

2. Install dependencies (OpenZeppelin contracts):
```bash
forge install
```

## Development

### Compile Contracts

```bash
forge build
```

### Run Tests

```bash
# Run all tests
forge test

# Run with verbose output
forge test -vvv

# Run specific test
forge test --match-test test_Deposit_Success
```

### Test Coverage

```bash
# Generate coverage report
forge coverage

# Generate LCOV report
forge coverage --report lcov
```

**Current Coverage**: 100% (Lines, Statements, Branches, Functions)

## Contract Functions

### User Functions

#### `deposit(uint256 amount)`
Deposit USTC-cb tokens into the contract. Users must approve the contract to spend tokens before calling this function.

**Requirements**:
- `amount > 0`
- User has sufficient balance
- User has approved sufficient allowance

**Events**: `Deposit`, `UserAdded` (if new user)

#### `withdraw(uint256 amount)`
Withdraw deposited USTC-cb tokens from the contract.

**Requirements**:
- `amount > 0`
- User has sufficient deposit balance

**Events**: `Withdraw`

### Owner Functions

#### `ownerWithdraw()`
Withdraw all accumulated USTC-cb tokens from the contract. Only callable by the contract owner.

**Requirements**:
- Withdrawal destination must be set via `setWithdrawalDestination`
- Withdrawal unlock timestamp must be set and current time >= unlock timestamp
- Contract must have a balance > 0
- Caller must be the owner

**Important**: This function withdraws the contract's token balance but does NOT modify user deposit records. User balances remain tracked in storage for future conversion to tokens in a separate contract. This function can be called multiple times - after a withdrawal, if users deposit additional tokens, the owner can withdraw again (subject to timelock requirements).

**Events**: `OwnerWithdraw`

### View Functions

#### `getUserCount() → uint256`
Returns the total number of unique users who have deposited.

#### `getUserAtIndex(uint256 index) → address`
Returns the user address at the given index in the enumerable set.

**Requirements**:
- `index < getUserCount()`

#### `getUserDeposit(address user) → uint256`
Returns the deposit balance for a specific user.

#### `getAllUsers() → address[]`
Returns an array of all user addresses who have deposited.

**Note**: Gas cost increases with the number of users.

#### `getTotalDeposits() → uint256`
Returns the total amount of USTC-cb deposited across all users.

### State Variables

- `ustcToken() → IERC20`: The USTC-cb token contract address
- `deposits(address) → uint256`: Mapping of user address to deposit balance
- `totalDeposits() → uint256`: Total amount deposited across all users

## Owner Withdrawal and User Balance Conversion

The contract is designed to support a two-phase process:

1. **Preregistration Phase**: Users deposit USTC-cb tokens, which are tracked in the contract's storage. The owner can withdraw accumulated tokens (subject to a 7-day timelock) while user deposit records remain intact.

2. **Token Conversion Phase**: A future contract will read user deposit balances from this contract and issue tokens accordingly. User balances are preserved in storage specifically for this purpose, even after owner withdrawals.

**Important Notes**:
- When the owner withdraws via `ownerWithdraw()`, only the contract's token balance decreases (not `totalDeposits` or individual user `deposits`). This is intentional.
- User deposit records remain tracked for future token conversion, independent of contract balance.
- The owner can call `ownerWithdraw()` multiple times - after a withdrawal, if users deposit additional tokens, the owner can withdraw again (subject to timelock requirements).

## Events

- `Deposit(address indexed user, uint256 amount)`: Emitted when a user deposits tokens
- `Withdraw(address indexed user, uint256 amount)`: Emitted when a user withdraws tokens
- `OwnerWithdraw(address indexed owner, uint256 amount)`: Emitted when the owner withdraws all tokens
- `UserAdded(address indexed user)`: Emitted when a new user makes their first deposit

## Deployment

### Environment Variables

Set the following environment variables:

```bash
export RPC_URL=https://bsc-dataseed.binance.org/  # or BSC testnet URL
export ETHERSCAN_API_KEY=your_bscscan_api_key_here
export DEPLOYER_ADDRESS=your_deployer_address_here
```

### Deploy to BSC Testnet

```bash
forge script script/Deploy.s.sol:DeployScript \
  --broadcast \
  --verify \
  --verifier etherscan \
  -vvv \
  --rpc-url $RPC_URL \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  -i 1 \
  --sender $DEPLOYER_ADDRESS
```

### Deploy to BSC Mainnet

```bash
forge script script/Deploy.s.sol:DeployScript \
  --broadcast \
  --verify \
  --verifier etherscan \
  -vvv \
  --rpc-url $RPC_URL \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  -i 1 \
  --sender $DEPLOYER_ADDRESS
```

### Verify Contract (if automatic verification fails)

If automatic verification fails, you can verify manually:

**Option 1: Using forge verify-contract**
```bash
forge verify-contract \
  0xe50DaD8c95dd7A43D792a040146EFaA4801d62B8 \
  src/USTCPreregister.sol:USTCPreregister \
  --constructor-args $(cast abi-encode "constructor(address,address)" 0xA4224f910102490Dc02AAbcBc6cb3c59Ff390055 0x745A676C5c472b50B50e18D4b59e9AeEEc597046) \
  --compiler-version 0.8.23 \
  --optimizer-runs 200 \
  --chain-id 56 \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --watch
```

**Option 2: Manual verification on BSCScan**
1. Go to https://bscscan.com/address/0xe50DaD8c95dd7A43D792a040146EFaA4801d62B8#code
2. Click "Contract" tab → "Verify and Publish"
3. Select "Via Standard JSON Input" or "Via Solidity (Standard JSON Input)"
4. Use these settings:
   - Compiler Version: `0.8.23`
   - Optimization: `Yes` with `200` runs
   - EVM Version: `Default` or `Istanbul`
   - Constructor Arguments: `000000000000000000000000a4224f910102490dc02aabcbc6cb3c59ff390055000000000000000000000000745a676c5c472b50b50e18d4b59e9aeeec597046`
5. Upload the source code files (include all OpenZeppelin dependencies)

## Security Considerations

- ✅ **Reentrancy Protection**: All state-changing functions use `nonReentrant` modifier
- ✅ **Checks-Effects-Interactions**: State updates occur before external calls
- ✅ **Access Control**: Owner-only functions protected by `onlyOwner` modifier
- ✅ **Input Validation**: All inputs validated (zero address, zero amount, etc.)
- ✅ **Safe Token Transfers**: Uses OpenZeppelin's `SafeERC20` for secure token transfers
- ✅ **Bounds Checking**: Array access protected with bounds checking

## Testing

The test suite includes comprehensive coverage of:

- ✅ Constructor initialization and validation
- ✅ Deposit functionality (success, failures, multiple users)
- ✅ Withdraw functionality (success, failures, partial/full withdrawals)
- ✅ Owner withdrawal functionality (including multiple withdrawals)
- ✅ User enumeration (count, index access, list retrieval)
- ✅ Edge cases (zero deposits, many users, sequential operations)
- ✅ Reentrancy protection verification
- ✅ Error handling and revert conditions

Run tests with:
```bash
forge test -vvv
```

## Known Limitations

1. **Gas Cost for Enumeration**: The `getAllUsers()` function has O(n) gas complexity where n is the number of users. For contracts with many users, consider implementing pagination.

2. **User Removal**: Users are not removed from the enumerable set when their balance reaches zero. This ensures enumeration consistency but may increase gas costs over time.

## License

AGPL-3.0

## Author

Deployed and maintained by the USTC Preregistration team.
