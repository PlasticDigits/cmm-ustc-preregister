# USTC Preregister - BSC Smart Contract

Smart contract for handling USTC-cb deposits, withdrawals, and user enumeration on Binance Smart Chain (BSC).

## Overview

The `USTCPreregister` contract allows users to:
- Deposit USTC-cb tokens into the contract
- Withdraw their deposited tokens
- Enumerate all users who have deposited

The contract owner can withdraw all accumulated tokens.

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
- Contract must have a balance > 0
- Caller must be the owner

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
- ✅ Owner withdrawal functionality
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
