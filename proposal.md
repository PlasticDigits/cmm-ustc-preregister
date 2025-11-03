# Proposal: Add 7-Day Timelock for USTC Transfers

## Overview

This proposal outlines breaking changes to add a 7-day timelock mechanism for USTC withdrawals to a destination address controlled by the contract owner. The changes affect three components:

1. **smartcontracts-bsc** - BSC smart contract
2. **smartcontracts-terraclassic** - Terra Classic smart contract  
3. **frontend-dapp** - Frontend application

Additionally, the TerraClassic deployment will be made non-upgradeable to enhance security and immutability.

## Motivation

The current implementation allows the contract owner to immediately withdraw all accumulated USTC tokens to their address. This proposal introduces a timelock mechanism that:

- Provides transparency and security by requiring a 7-day delay before withdrawals
- Allows the destination address to be changed, but always resets the timelock
- Enables users to monitor withdrawal status and countdown in the frontend
- Makes the TerraClassic contract immutable by removing upgradeability

## Breaking Changes

### ⚠️ Important Notes

- **No backwards compatibility**: This is a breaking change that modifies the contract behavior
- **Contract behavior changes**: The `ownerWithdraw` function will now require timelock configuration and transfer to a destination address instead of the owner

## Smart Contract Changes

### 1. BSC Contract (`smartcontracts-bsc/src/USTCPreregister.sol`)

#### New State Variables

```solidity
/// @notice Destination address for timelocked withdrawals
address public withdrawalDestination;

/// @notice Timestamp when withdrawal becomes available (Unix timestamp)
uint256 public withdrawalUnlockTimestamp;
```

#### Initial State

- `withdrawalDestination` initialized to `address(0)`
- `withdrawalUnlockTimestamp` initialized to `0`

#### New Function: `setWithdrawalDestination`

```solidity
/**
 * @notice Owner function to set withdrawal destination and unlock timestamp
 * @param destination Address to receive USTC withdrawals
 * @param unlockTimestamp Unix timestamp when withdrawal becomes available
 * @dev Timestamp must be at least 7 days (604800 seconds) in the future
 * @dev Can be called multiple times to update destination, but timestamp always resets
 */
function setWithdrawalDestination(address destination, uint256 unlockTimestamp) 
    external 
    onlyOwner 
{
    require(destination != address(0), "USTCPreregister: zero destination address");
    require(unlockTimestamp >= block.timestamp + 7 days, "USTCPreregister: timestamp must be at least 7 days in future");
    
    withdrawalDestination = destination;
    withdrawalUnlockTimestamp = unlockTimestamp;
    
    emit WithdrawalDestinationSet(destination, unlockTimestamp);
}
```

#### Modified Function: `ownerWithdraw`

```solidity
/**
 * @notice Owner function to withdraw all accumulated USTC-cb tokens
 * @dev Only callable by the contract owner
 * @dev Requires withdrawalDestination and withdrawalUnlockTimestamp to be set
 * @dev Requires current timestamp >= withdrawalUnlockTimestamp
 * @dev Transfers tokens to withdrawalDestination instead of owner
 */
function ownerWithdraw() external onlyOwner nonReentrant {
    require(withdrawalDestination != address(0), "USTCPreregister: withdrawal destination not set");
    require(withdrawalUnlockTimestamp != 0, "USTCPreregister: withdrawal timestamp not set");
    require(block.timestamp >= withdrawalUnlockTimestamp, "USTCPreregister: withdrawal not yet unlocked");
    
    uint256 balance = ustcToken.balanceOf(address(this));
    require(balance > 0, "USTCPreregister: no balance to withdraw");
    
    // Transfer all tokens to withdrawal destination
    ustcToken.safeTransfer(withdrawalDestination, balance);
    
    emit OwnerWithdraw(withdrawalDestination, balance);
}
```

#### New Events

```solidity
event WithdrawalDestinationSet(address indexed destination, uint256 unlockTimestamp);
```

#### New View Functions

```solidity
/**
 * @notice Get withdrawal destination address
 * @return Address set for withdrawals, or address(0) if not set
 */
function getWithdrawalDestination() external view returns (address) {
    return withdrawalDestination;
}

/**
 * @notice Get withdrawal unlock timestamp
 * @return Unix timestamp when withdrawal becomes available, or 0 if not set
 */
function getWithdrawalUnlockTimestamp() external view returns (uint256) {
    return withdrawalUnlockTimestamp;
}

/**
 * @notice Check if withdrawal destination is configured
 * @return True if both destination and timestamp are set
 */
function isWithdrawalConfigured() external view returns (bool) {
    return withdrawalDestination != address(0) && withdrawalUnlockTimestamp != 0;
}
```

### 2. Terra Classic Contract (`smartcontracts-terraclassic`)

#### State Changes (`src/state.rs`)

Add new storage items:

```rust
/// Withdrawal destination address for timelocked withdrawals
pub const WITHDRAWAL_DESTINATION: Item<Option<Addr>> = Item::new("withdrawal_dest");

/// Timestamp when withdrawal becomes available (Unix timestamp in seconds)
pub const WITHDRAWAL_UNLOCK_TIMESTAMP: Item<u64> = Item::new("withdrawal_unlock");
```

Initial state:
- `WITHDRAWAL_DESTINATION` initialized to `None`
- `WITHDRAWAL_UNLOCK_TIMESTAMP` initialized to `0`

#### New Execute Message (`src/msg.rs`)

```rust
#[cw_serde]
pub enum ExecuteMsg {
    Deposit {},
    Withdraw { amount: Uint128 },
    OwnerWithdraw {},
    UpdateConfig { owner: Option<Addr> },
    SetWithdrawalDestination { 
        destination: Addr,
        unlock_timestamp: u64,
    },
}
```

#### New Query Message (`src/msg.rs`)

```rust
#[cw_serde]
#[derive(QueryResponses)]
pub enum QueryMsg {
    // ... existing queries ...
    #[returns(GetWithdrawalInfoResponse)]
    GetWithdrawalInfo {},
}

#[cw_serde]
pub struct GetWithdrawalInfoResponse {
    pub destination: Option<Addr>,
    pub unlock_timestamp: u64,
    pub is_configured: bool,
}
```

#### New Execute Handler (`src/contract.rs`)

```rust
pub fn execute_set_withdrawal_destination(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    destination: Addr,
    unlock_timestamp: u64,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    verify_owner(&info, &config)?;
    
    let current_time = env.block.time.seconds();
    let min_timestamp = current_time + 7 * 24 * 60 * 60; // 7 days in seconds
    
    if unlock_timestamp < min_timestamp {
        return Err(ContractError::InvalidTimestamp {});
    }
    
    WITHDRAWAL_DESTINATION.save(deps.storage, &Some(destination.clone()))?;
    WITHDRAWAL_UNLOCK_TIMESTAMP.save(deps.storage, &unlock_timestamp)?;
    
    Ok(Response::new()
        .add_attribute("action", "set_withdrawal_destination")
        .add_attribute("destination", destination.to_string())
        .add_attribute("unlock_timestamp", unlock_timestamp.to_string()))
}
```

#### Modified Execute Handler: `execute_owner_withdraw`

```rust
pub fn execute_owner_withdraw(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    verify_owner(&info, &config)?;
    
    // Check withdrawal destination is set
    let destination = WITHDRAWAL_DESTINATION
        .may_load(deps.storage)?
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
    
    // Transfer all to withdrawal destination
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
```

#### New Query Handler (`src/contract.rs`)

```rust
pub fn query_withdrawal_info(deps: Deps) -> StdResult<GetWithdrawalInfoResponse> {
    let destination = WITHDRAWAL_DESTINATION.may_load(deps.storage)?;
    let unlock_timestamp = WITHDRAWAL_UNLOCK_TIMESTAMP.load(deps.storage)?;
    let is_configured = destination.is_some() && unlock_timestamp != 0;
    
    Ok(GetWithdrawalInfoResponse {
        destination,
        unlock_timestamp,
        is_configured,
    })
}
```

#### New Error Types (`src/error.rs`)

```rust
#[derive(Error, Debug, PartialEq)]
pub enum ContractError {
    // ... existing errors ...
    #[error("Withdrawal destination not set")]
    WithdrawalDestinationNotSet {},
    
    #[error("Withdrawal timestamp not set")]
    WithdrawalTimestampNotSet {},
    
    #[error("Withdrawal not yet unlocked")]
    WithdrawalNotUnlocked {},
    
    #[error("Invalid timestamp: must be at least 7 days in the future")]
    InvalidTimestamp {},
}
```

#### Deployment Changes - Non-Upgradeable

Modify deployment script (`scripts/deploy.sh`) to remove `--admin` flag:

```bash
# OLD (with admin for upgradeability):
terrad tx wasm instantiate <code-id> '{"owner":"$OWNER"}' --from <your-key> --admin $OWNER --chain-id $CHAIN_ID ...

# NEW (non-upgradeable):
terrad tx wasm instantiate <code-id> '{"owner":"$OWNER"}' --from <your-key> --admin "" --chain-id $CHAIN_ID ...
```

Or use `--no-admin` flag if supported:

```bash
terrad tx wasm instantiate <code-id> '{"owner":"$OWNER"}' --from <your-key> --no-admin --chain-id $CHAIN_ID ...
```

**Note**: The contract will be permanently immutable after deployment. Ensure the contract code is thoroughly tested before deployment.

### 3. Frontend Changes (`frontend-dapp`)

#### New Contract Interface Methods

##### BSC Contract (`src/services/bsc/contract.ts`)

Add to contract ABI:

```typescript
{
  inputs: [],
  name: 'getWithdrawalDestination',
  outputs: [{ name: '', type: 'address' }],
  stateMutability: 'view',
  type: 'function',
},
{
  inputs: [],
  name: 'getWithdrawalUnlockTimestamp',
  outputs: [{ name: '', type: 'uint256' }],
  stateMutability: 'view',
  type: 'function',
},
{
  inputs: [],
  name: 'isWithdrawalConfigured',
  outputs: [{ name: '', type: 'bool' }],
  stateMutability: 'view',
  type: 'function',
},
{
  inputs: [
    { name: 'destination', type: 'address' },
    { name: 'unlockTimestamp', type: 'uint256' },
  ],
  name: 'setWithdrawalDestination',
  outputs: [],
  stateMutability: 'nonpayable',
  type: 'function',
},
{
  anonymous: false,
  inputs: [
    { indexed: true, name: 'destination', type: 'address' },
    { indexed: false, name: 'unlockTimestamp', type: 'uint256' },
  ],
  name: 'WithdrawalDestinationSet',
  type: 'event',
},
```

##### Terra Classic Contract (`src/services/terraclassic/contract.ts`)

Add query method:

```typescript
async getWithdrawalInfo(): Promise<{
  destination: string | null;
  unlock_timestamp: number;
  is_configured: boolean;
}> {
  // Query GetWithdrawalInfo
}
```

#### New Hook (`src/hooks/useWithdrawalInfo.ts`)

```typescript
export function useWithdrawalInfo(
  chain: 'bsc' | 'terraclassic',
  contract: Contract | null
) {
  const withdrawalInfo = useQuery({
    queryKey: [chain, 'withdrawalInfo'],
    queryFn: async () => {
      if (!contract) return null;
      
      if (chain === 'bsc') {
        const [destination, timestamp, isConfigured] = await Promise.all([
          contract.getWithdrawalDestination(),
          contract.getWithdrawalUnlockTimestamp(),
          contract.isWithdrawalConfigured(),
        ]);
        
        return {
          destination: destination === ethers.ZeroAddress ? null : destination,
          unlockTimestamp: Number(timestamp),
          isConfigured,
        };
      } else {
        // Terra Classic query
        const info = await contract.getWithdrawalInfo();
        return {
          destination: info.destination || null,
          unlockTimestamp: info.unlock_timestamp,
          isConfigured: info.is_configured,
        };
      }
    },
    enabled: !!contract,
    refetchInterval: 10000, // Refresh every 10 seconds
  });
  
  const timeRemaining = useMemo(() => {
    if (!withdrawalInfo.data?.isConfigured) return null;
    const now = Math.floor(Date.now() / 1000);
    const remaining = withdrawalInfo.data.unlockTimestamp - now;
    return remaining > 0 ? remaining : 0;
  }, [withdrawalInfo.data]);
  
  const isUnlocked = useMemo(() => {
    return timeRemaining !== null && timeRemaining === 0;
  }, [timeRemaining]);
  
  return {
    withdrawalInfo: withdrawalInfo.data,
    isLoading: withdrawalInfo.isLoading,
    timeRemaining,
    isUnlocked,
  };
}
```

#### UI Components

##### Withdrawal Status Card

Add to both `BSCPage.tsx` and `TerraClassicPage.tsx`:

```typescript
const { withdrawalInfo, timeRemaining, isUnlocked } = useWithdrawalInfo(
  'bsc', // or 'terraclassic'
  contract
);

// Display card showing:
// - Whether withdrawal destination is configured
// - Destination address (if configured)
// - Countdown timer (if configured and not unlocked)
// - Unlocked status (if timestamp has passed)
```

Example UI structure:

```tsx
<Card>
  <h3>Withdrawal Status</h3>
  {withdrawalInfo?.isConfigured ? (
    <>
      <p>Destination: {withdrawalInfo.destination}</p>
      {isUnlocked ? (
        <p style={{ color: 'green' }}>✅ Ready to withdraw</p>
      ) : (
        <p>
          Unlocks in: {formatTimeRemaining(timeRemaining)}
        </p>
      )}
    </>
  ) : (
    <p style={{ color: 'var(--text-muted)' }}>
      Withdrawal destination not yet configured
    </p>
  )}
</Card>
```

#### Utility Function

Add to `src/utils/format.ts`:

```typescript
export function formatTimeRemaining(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return '0 seconds';
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
  return parts.join(' ');
}
```

## Implementation Steps

### Phase 1: Smart Contract Development
1. ✅ Implement BSC contract changes
2. ✅ Implement Terra Classic contract changes
3. ✅ Add comprehensive tests for timelock functionality

### Phase 2: Frontend Development
1. ✅ Update contract ABIs/interfaces
2. ✅ Create `useWithdrawalInfo` hook
3. ✅ Add withdrawal status UI components
4. ✅ Add countdown timer functionality
5. ✅ Update both BSC and TerraClassic pages

### Phase 3: Testing
1. ✅ Unit tests for smart contracts
2. ✅ Integration tests for smart contracts
3. ✅ Frontend integration testing
4. ✅ Testnet testing (for validation purposes)

### Phase 4: Documentation and Comments
1. ✅ Update README files with timelock mechanism documentation
2. ✅ Add inline code comments explaining timelock logic
3. ✅ Update contract interfaces with new function documentation
4. ✅ Document non-upgradeable deployment process for TerraClassic
5. ✅ Update deployment script comments
6. ✅ Add JSDoc comments for frontend hooks and utilities

## Security Considerations

1. **Timelock Duration**: 7 days provides a balance between security and practicality
2. **Destination Changes**: Allowing destination changes with timestamp reset maintains flexibility while preserving security
3. **Non-Upgradeable Contract**: TerraClassic contract becomes immutable, preventing future modifications
4. **Access Control**: Only owner can set withdrawal destination
5. **Validation**: Timestamp must be at least 7 days in future on each update

## Testing Checklist

### Smart Contract Tests
- [ ] Test setting withdrawal destination with valid timestamp
- [ ] Test setting withdrawal destination with invalid timestamp (< 7 days)
- [ ] Test ownerWithdraw reverts when destination not set
- [ ] Test ownerWithdraw reverts when timestamp not set
- [ ] Test ownerWithdraw reverts when timestamp not yet passed
- [ ] Test ownerWithdraw succeeds when timestamp has passed
- [ ] Test ownerWithdraw transfers to destination (not owner)
- [ ] Test updating destination resets timestamp
- [ ] Test updating destination requires new timestamp >= 7 days

### Frontend Tests
- [ ] Test withdrawal info display when not configured
- [ ] Test withdrawal info display when configured
- [ ] Test countdown timer accuracy
- [ ] Test countdown timer updates
- [ ] Test unlocked status display
- [ ] Test both BSC and TerraClassic implementations

## Timeline Estimate

- **Smart Contract Development**: 3-5 days
- **Testing**: 2-3 days
- **Frontend Development**: 2-3 days
- **Integration Testing**: 2-3 days
- **Documentation and Comments**: 1-2 days

**Total**: ~2-3 weeks

## Conclusion

This proposal introduces a robust timelock mechanism for USTC withdrawals, enhancing security and transparency while maintaining flexibility for the contract owner. The removal of upgradeability from the TerraClassic contract further strengthens the immutability and trustworthiness of the system.

The breaking changes are necessary to implement this security improvement and will be included in the initial deployment of the contracts.

