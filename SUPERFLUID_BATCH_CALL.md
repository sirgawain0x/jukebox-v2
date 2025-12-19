# Superfluid Host Batch Call Integration

## Overview

This guide covers using Superfluid's Host contract `batchCall` function to execute multiple operations in a single atomic transaction. This approach is **more gas-efficient** than macros and requires **no custom contract deployment**.

## Key Advantages

1. **No Deployment Needed** - Uses existing Superfluid Host contract
2. **Lower Gas Costs** - Direct calls, no proxy overhead
3. **Full Control** - Complete flexibility over operations
4. **Atomic Execution** - All operations succeed or fail together

## Contract Addresses

### Base Sepolia (Testnet)
- **Host**: `0x109412E3C84f0539b43d39dB691B08c90f58dC7c`
- **CFA Forwarder**: `0xcfA132E353cB4E398080B9700609bb008eceB125`
- **GDA Forwarder**: `0x6DA13Bde224A05a288748d857b9e7DDEffd1dE08`

### Base Mainnet
- **Host**: Update with actual mainnet address
- **CFA Forwarder**: Update with actual mainnet address
- **GDA Forwarder**: `0x6DA13Bde224A05a288748d857b9e7DDEffd1dE08` (same on all chains)

## Operation Types

```typescript
OPERATION_TYPE = {
  SUPERTOKEN_UPGRADE: 101,
  SUPERTOKEN_DOWNGRADE: 102,
  SUPERFLUID_CALL_AGREEMENT: 201,  // For CFA/GDA calls
  // ... others
}
```

## Usage Examples

### 1. Batch: Upgrade Tokens + Create Flow

```typescript
import { batchUpgradeAndFlow } from '@/lib/superfluid-batch-call';

const signer = await provider.getSigner();
const tx = await batchUpgradeAndFlow(
  signer,
  superTokenAddress,
  receiverAddress,
  '1000',        // Amount to upgrade
  '100',         // Flow rate per day
  8453,          // Base Mainnet chain ID
  6              // USDC decimals
);

await tx.wait();
```

### 2. Batch: Update Pool Units + Distribute Flow

```typescript
import { batchPoolUpdateAndFlow } from '@/lib/superfluid-batch-call';

const tx = await batchPoolUpdateAndFlow(
  signer,
  {
    poolAddress: '0x...',
    recipients: [
      { address: '0x...', units: 100n },
      { address: '0x...', units: 200n },
    ],
    superTokenAddress: '0x...',
    flowRatePerDay: '100',
    decimals: 6,
  },
  8453  // chainId
);

await tx.wait();
```

### 3. Batch: Create Multiple Flows

```typescript
import { batchCreateFlows } from '@/lib/superfluid-batch-call';

const tx = await batchCreateFlows(
  signer,
  superTokenAddress,
  [
    { receiver: '0x...', flowRatePerDay: '50' },
    { receiver: '0x...', flowRatePerDay: '75' },
    { receiver: '0x...', flowRatePerDay: '100' },
  ],
  8453,
  6
);

await tx.wait();
```

### 4. Batch: Update Multiple Flows

```typescript
import { batchUpdateFlows } from '@/lib/superfluid-batch-call';

const tx = await batchUpdateFlows(
  signer,
  superTokenAddress,
  [
    { receiver: '0x...', flowRatePerDay: '100' },
    { receiver: '0x...', flowRatePerDay: '150' },
  ],
  8453,
  6
);

await tx.wait();
```

### 5. Batch: Delete Multiple Flows

```typescript
import { batchDeleteFlows } from '@/lib/superfluid-batch-call';

const tx = await batchDeleteFlows(
  signer,
  superTokenAddress,
  ['0x...', '0x...', '0x...'], // Receiver addresses
  8453
);

await tx.wait();
```

### 6. Batch: Create Pool and Distribute

```typescript
import { 
  createPoolOperation,
  createDistributeFlowOperation,
  executeBatchCall,
  getGDAForwarderAddress,
} from '@/lib/superfluid-batch-call';

const operations = [
  // Create pool
  createPoolOperation(
    superTokenAddress,
    adminAddress,
    {
      transferabilityForUnitsOwner: true,
      distributionFromAnyAddress: false,
    }
  ),
  // Distribute flow to pool
  createDistributeFlowOperation(
    superTokenAddress,
    senderAddress,
    poolAddress,
    flowRate
  ),
];

const tx = await executeBatchCall(signer, operations, chainId);
await tx.wait();
```

### 7. Custom Batch Operations

```typescript
import { 
  executeBatchCall,
  createUpgradeOperation,
  createFlowOperation,
  getCFAForwarderAddress,
} from '@/lib/superfluid-batch-call';

const operations = [
  // Upgrade tokens
  createUpgradeOperation(superTokenAddress, ethers.parseUnits('1000', 6)),
  
  // Create flow
  createFlowOperation(
    getCFAForwarderAddress(8453),
    superTokenAddress,
    senderAddress,
    receiverAddress,
    flowRate
  ),
];

const tx = await executeBatchCall(signer, operations, 8453);
await tx.wait();
```

## Common Patterns

### Pattern 1: Wrap and Stream
Upgrade tokens and immediately start streaming:

```typescript
const operations = [
  createUpgradeOperation(superToken, amount),
  createFlowOperation(cfaForwarder, superToken, sender, receiver, flowRate),
];
```

**Note**: Token approval must be done separately before batch call.

### Pattern 2: Pool Setup
Create pool, update units, and start distribution:

```typescript
// 1. Create pool (separate transaction or include in batch)
// 2. Batch: Update units + distribute flow
const operations = [
  createUpdateMemberUnitsOperation(poolAddress, recipients),
  createDistributeFlowOperation(superToken, sender, poolAddress, flowRate),
];
```

### Pattern 3: Multi-Flow Management
Update multiple flows in one transaction:

```typescript
const operations = flows.map(flow => 
  createFlowOperation(cfaForwarder, superToken, sender, flow.receiver, flow.rate)
);
```

## React Hooks

The implementation includes React hooks for easy integration with wagmi:

### Using Hooks

```typescript
import { useBatchCreateFlows } from '@/app/hooks/useSuperfluidBatch';

function MyComponent() {
  const { execute, isLoading, error } = useBatchCreateFlows({
    onSuccess: (txHash) => {
      console.log('Success!', txHash);
    },
    onError: (error) => {
      console.error('Error:', error);
    },
  });

  const handleCreateFlows = async () => {
    await execute(
      superTokenAddress,
      [
        { receiver: '0x...', flowRatePerDay: '100' },
        { receiver: '0x...', flowRatePerDay: '200' },
      ],
      6 // decimals
    );
  };

  return (
    <button onClick={handleCreateFlows} disabled={isLoading}>
      {isLoading ? 'Creating...' : 'Create Batch Flows'}
    </button>
  );
}
```

### Available Hooks

- `useBatchCall` - Execute custom batch operations
- `useUpgradeAndFlow` - Upgrade tokens and create flow
- `useBatchCreateFlows` - Create multiple flows
- `useBatchUpdateFlows` - Update multiple flows
- `useBatchDeleteFlows` - Delete multiple flows
- `useBatchPoolUpdate` - Pool batch operations
- `useEstimateBatchGas` - Estimate gas for batch operations

### Example Component

See `app/components/examples/BatchFlowManager.tsx` for a complete example component demonstrating batch flow management.

## Conditional Batch Operations

Build batch operations conditionally based on current state:

```typescript
import { buildConditionalBatch, executeBatchCall } from '@/lib/superfluid-batch-call';

// Check balance first (separate call)
const balance = await superToken.balanceOf(userAddress);
const minBalance = ethers.parseUnits('100', 6);

const operations = buildConditionalBatch({
  superTokenAddress,
  userAddress,
  upgradeIfNeeded: balance < minBalance ? {
    amount: ethers.parseUnits('1000', 6),
  } : undefined,
  flows: [
    { receiver: '0x...', flowRatePerDay: '50' },
    { receiver: '0x...', flowRatePerDay: '75' },
  ],
  chainId: 8453,
});

if (operations.length > 0) {
  const tx = await executeBatchCall(signer, operations, 8453);
  await tx.wait();
}
```

## Integration with Existing Code

### Update Pool Service

Instead of using macros, use Host batchCall:

```typescript
// Old way (macro)
await executeRewardsMacro(signer, macroParams);

// New way (Host batchCall)
await batchPoolUpdateAndFlow(signer, params, chainId);
```

### Update API Endpoints

Use the new batch-host endpoint:

```typescript
// POST /api/superfluid/pool/batch-host
const response = await fetch('/api/superfluid/pool/batch-host', {
  method: 'POST',
  body: JSON.stringify({
    marketId: 1,
    poolAddress: '0x...',
    recipients: [...],
    superTokenAddress: '0x...',
    flowRatePerDay: '100',
    chainId: 8453,
  }),
});
```

## Gas Estimation

```typescript
import { estimateBatchCallGas } from '@/lib/superfluid-batch-call';

const gasEstimate = await estimateBatchCallGas(
  provider,
  operations,
  chainId,
  userAddress
);

console.log(`Estimated gas: ${gasEstimate.toString()}`);
```

## Error Handling

```typescript
try {
  const tx = await executeBatchCall(signer, operations, chainId);
  const receipt = await tx.wait();
  console.log('Batch call succeeded:', receipt.hash);
} catch (error) {
  // All operations are reverted atomically
  console.error('Batch call failed:', error);
}
```

## Comparison: Host batchCall vs Macro

| Feature | Host batchCall | Macro |
|---------|----------------|-------|
| **Deployment** | ✅ None needed | ❌ Requires macro contract |
| **Gas Cost** | ✅ Lower | Higher (proxy overhead) |
| **Flexibility** | ✅ Full control | Limited to macro logic |
| **Complexity** | Medium | Lower (pre-built) |
| **Reusability** | Manual | ✅ Reusable macro |

## Available Operations

### Flow Operations
- `createFlowOperation` - Create a new flow
- `createUpdateFlowOperation` - Update an existing flow
- `createDeleteFlowOperation` - Delete a flow
- `batchCreateFlows` - Create multiple flows in one transaction
- `batchUpdateFlows` - Update multiple flows in one transaction
- `batchDeleteFlows` - Delete multiple flows in one transaction

### Token Operations
- `createUpgradeOperation` - Upgrade underlying tokens to Super Tokens
- `createDowngradeOperation` - Downgrade Super Tokens to underlying tokens
- `batchUpgradeAndFlow` - Upgrade and create flow in one transaction

### Pool Operations
- `createPoolOperation` - Create a new GDA pool
- `createUpdateMemberUnitsOperation` - Update pool member units
- `createDistributeFlowOperation` - Distribute flow to pool
- `createDistributeOperation` - One-time distribution to pool
- `batchPoolUpdateAndFlow` - Update units and distribute flow

### Utility Functions
- `getHostAddress` - Get Host contract address for chain
- `getCFAForwarderAddress` - Get CFA Forwarder address for chain
- `getGDAForwarderAddress` - Get GDA Forwarder address (same on all chains)
- `buildConditionalBatch` - Build conditional batch operations
- `estimateBatchCallGas` - Estimate gas for batch operations

## Best Practices

1. **Approve Separately**: Token approvals cannot be in batch (msg.sender changes)
2. **Order Matters**: Operations execute sequentially
3. **Validate First**: Check balances/state before building batch
4. **Estimate Gas**: Always estimate gas before execution
5. **Error Handling**: Batch calls are atomic - all or nothing
6. **Use Hooks**: Prefer React hooks for better error handling and state management
7. **Conditional Operations**: Use `buildConditionalBatch` for dynamic batch building

## Migration from Macro

If you've already deployed a macro contract, you can:

1. **Keep Both**: Use macros for complex reusable patterns, Host batchCall for ad-hoc operations
2. **Migrate Gradually**: Replace macro calls with Host batchCall over time
3. **Hybrid Approach**: Use Host batchCall for new features, keep macros for existing flows

## Next Steps

1. Update frontend to use Host batchCall
2. Replace macro calls where appropriate
3. Test gas savings
4. Update documentation

---

**Recommendation**: Use Host `batchCall` for most operations. Keep macros only for complex, reusable patterns that need custom logic.

