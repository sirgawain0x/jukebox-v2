# Superfluid Macro Integration Update

## Overview

The implementation has been updated to use **Superfluid Macros** for batching pool operations. This provides better gas efficiency and atomicity for complex operations.

## What Changed

### New Components

1. **SuperfluidRewardsMacro.sol** - Smart contract for batching operations
2. **lib/superfluid-macro.ts** - Service for executing macros
3. **lib/superfluid-flow-rate.ts** - Flow rate conversion utilities
4. **lib/superfluid-pool-validation.ts** - Pool and balance validation
5. **lib/superfluid-network.ts** - Network switching utilities
6. **app/api/superfluid/pool/batch/route.ts** - Batch operation API

### Key Features

#### 1. Batch Operations
All pool operations can now be batched into a single transaction:
- Update member units
- Create/update flow to pool
- All atomic (all succeed or all fail)

#### 2. Flow Rate Conversion
Utilities for converting between different time periods:
- Tokens/day → wei/second
- Tokens/hour → wei/second
- Tokens/minute → wei/second
- Formatting for display

#### 3. Pool Validation
- Validate pool addresses
- Check super token balances
- Verify sufficient balance for flow rates

#### 4. Network Management
- Switch to Base Mainnet/Sepolia
- Network validation
- Chain ID constants

## Usage

### Deploy RewardsMacro Contract

```bash
# Set environment variables
export SUPERFLUID_HOST=0x...
export SUPERFLUID_GDA=0x...
export SUPERFLUID_CFA=0x...

# Deploy
forge script script/DeploySuperfluidRewardsMacro.s.sol:DeploySuperfluidRewardsMacro \
  --rpc-url $BASE_MAINNET_RPC_URL \
  --broadcast \
  --verify
```

### Execute Macro (Frontend)

```typescript
import { executeRewardsMacro, type MacroRecipient } from '@/lib/superfluid-macro';
import { useAccount, useWalletClient } from 'wagmi';

function MyComponent() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  const handleBatchUpdate = async () => {
    const recipients: MacroRecipient[] = [
      { address: '0x...', units: 100n },
      { address: '0x...', units: 200n },
    ];

    const signer = await walletClient?.toEthers();
    if (!signer) return;

    const tx = await executeRewardsMacro(signer, {
      poolAddress: '0x...',
      recipients,
      flowRatePerDay: '100', // 100 USDC per day
      decimals: 6,
    });

    await tx.wait();
  };
}
```

### Validate Pool Before Execution

```typescript
import { validatePoolAndBalance } from '@/lib/superfluid-pool-validation';
import { getProvider } from '@/lib/utils';

const provider = getProvider();
const validation = await validatePoolAndBalance(
  provider,
  poolAddress,
  userAddress
);

if (!validation.isValid) {
  console.error('Invalid pool:', validation.error);
  return;
}

if (Number(validation.balance) === 0) {
  console.warn('Insufficient balance');
  return;
}
```

### Convert Flow Rates

```typescript
import { convertFlowRateToWeiPerSecond, formatFlowRate } from '@/lib/superfluid-flow-rate';

// Convert 100 USDC/day to wei/second
const flowRate = convertFlowRateToWeiPerSecond('100', 6, 'day');

// Format for display
const formatted = formatFlowRate(flowRate, 6);
// Returns: { perSecond: "...", perDay: "...", formatted: "$100.00/day" }
```

## API Endpoints

### POST /api/superfluid/pool/batch

Prepare batch operation parameters:

```json
{
  "marketId": 1,
  "poolAddress": "0x...",
  "recipients": [
    { "address": "0x...", "units": "100" },
    { "address": "0x...", "units": "200" }
  ],
  "flowRatePerDay": "100"
}
```

Response:
```json
{
  "success": true,
  "macroParams": {
    "poolAddress": "0x...",
    "recipients": [...],
    "flowRatePerDay": "100",
    "decimals": 6
  }
}
```

## Environment Variables

Add to `.env`:

```bash
# Macro Contract
NEXT_PUBLIC_SUPERFLUID_REWARDS_MACRO_ADDRESS=0x...
NEXT_PUBLIC_SUPERFLUID_MACRO_FORWARDER_ADDRESS=0x... # Optional

# Superfluid Contracts
SUPERFLUID_HOST=0x...
SUPERFLUID_GDA=0x...
SUPERFLUID_CFA=0x...
SUPERFLUID_FUSDCX=0x...
```

## Benefits

1. **Gas Efficiency** - Batch operations reduce transaction costs
2. **Atomicity** - All operations succeed or fail together
3. **Better UX** - Single transaction for complex operations
4. **Scalability** - Handle many recipients efficiently

## Migration from Old Implementation

The old implementation still works, but new code should use macros:

### Old Way
```typescript
// Multiple transactions
await updateMemberUnits(pool, address1, units1);
await updateMemberUnits(pool, address2, units2);
await createFlow(pool, flowRate);
```

### New Way (Macro)
```typescript
// Single transaction
await executeRewardsMacro(signer, {
  poolAddress: pool,
  recipients: [
    { address: address1, units: units1 },
    { address: address2, units: units2 },
  ],
  flowRatePerDay: '100',
});
```

## Testing

1. Deploy RewardsMacro contract to testnet
2. Create a test pool using GDAv1Forwarder
3. Test batch operations with multiple recipients
4. Verify gas savings vs individual operations
5. Test flow rate conversions
6. Validate pool addresses and balances

## Next Steps

1. Deploy macro contract to Base Mainnet
2. Update frontend to use macro execution
3. Add UI for batch recipient management
4. Implement gas estimation display
5. Add transaction status tracking

