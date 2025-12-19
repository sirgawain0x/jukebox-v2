# Superfluid Pool Claiming Integration

## Overview

This guide covers connecting to and claiming from Superfluid Distribution Pools using the GDAv1Forwarder contract. Artists can connect to pools to receive real-time streams or claim accumulated tokens manually.

## Key Concepts

### Connecting to a Pool
- When an artist connects to a pool, they start receiving streams in real-time
- The artist's balance automatically reflects incoming tokens
- **Connecting automatically claims all previously available tokens**
- Ideal for continuous, real-time token distribution

### Claiming from a Pool
- Claiming is the explicit process of withdrawing accumulated tokens
- Artists can claim periodically to move tokens from pool to personal balance
- Useful for manual token management or specific accounting needs

## Implementation

### Service Layer

**File**: `lib/superfluid-pool-claiming.ts`

Provides functions for:
- `connectToPool()` - Connect to pool and start receiving streams
- `disconnectFromPool()` - Stop receiving streams from pool
- `claimAllFromPool()` - Claim all accumulated tokens
- `isConnectedToPool()` - Check connection status
- `getClaimableAmount()` - Get amount available to claim

### UI Component

**File**: `app/components/music/PoolInteractionManager.tsx`

Complete UI for:
- Connecting/disconnecting from pools
- Claiming tokens
- Viewing connection status
- Displaying claimable amounts

### API Endpoint

**File**: `app/api/superfluid/pool/claim/route.ts`

API for preparing claim operations (security: actual execution happens on frontend with user wallet)

## Usage

### Connect to Pool

```typescript
import { connectToPool } from '@/lib/superfluid-pool-claiming';
import { useWalletClient } from 'wagmi';

const { data: walletClient } = useWalletClient();

const handleConnect = async () => {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  
  const result = await connectToPool(signer, poolAddress);
  
  if (result.success) {
    console.log('Connected!', result.transactionHash);
  }
};
```

### Claim Tokens

```typescript
import { claimAllFromPool } from '@/lib/superfluid-pool-claiming';

const handleClaim = async () => {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  
  const result = await claimAllFromPool(
    signer,
    poolAddress,
    memberAddress
  );
  
  if (result.success) {
    console.log('Claimed!', result.transactionHash);
  }
};
```

### Check Status

```typescript
import { isConnectedToPool, getClaimableAmount } from '@/lib/superfluid-pool-claiming';

const provider = new ethers.BrowserProvider(window.ethereum);

// Check if connected
const connected = await isConnectedToPool(
  provider,
  poolAddress,
  memberAddress
);

// Get claimable amount
const claimable = await getClaimableAmount(
  provider,
  poolAddress,
  memberAddress
);
const claimableFormatted = ethers.formatUnits(claimable, 6); // USDC
```

## GDAv1Forwarder Contract

**Address**: `0x6DA13Bde224A05a288748d857b9e7DDEffd1dE08`

This address is the same on all Superfluid chains (Base, Optimism, etc.)

### Key Functions

1. **connectPool(address pool, bytes userData)**
   - Connects member to pool
   - Automatically claims all previously available tokens
   - Starts real-time streaming

2. **disconnectPool(address pool, bytes userData)**
   - Disconnects member from pool
   - Stops receiving streams

3. **claimAll(address pool, address memberAddress, bytes userData)**
   - Claims all accumulated tokens for member
   - Can be called by anyone (not just the member)

## UI Component Usage

```tsx
import { PoolInteractionManager } from '@/app/components/music/PoolInteractionManager';

// With pool address
<PoolInteractionManager poolAddress="0x..." marketId={1} />

// Without pool address (user enters it)
<PoolInteractionManager />
```

## Integration with Artist Royalty Card

You can integrate pool claiming into the ArtistRoyaltyCard:

```tsx
import { PoolInteractionManager } from './PoolInteractionManager';

// In ArtistRoyaltyCard component
{data.pools.map((pool) => (
  <div key={pool.marketId}>
    <PoolInteractionManager 
      poolAddress={pool.poolAddress}
      marketId={pool.marketId}
    />
  </div>
))}
```

## Best Practices

1. **Auto-Connect on First Royalty**
   - When artist receives first royalty, prompt to connect
   - Explain benefits of real-time streaming

2. **Show Claimable Amount**
   - Display claimable amount prominently
   - Update periodically (every 10-30 seconds)

3. **Connection Status**
   - Show clear connection status
   - Indicate when streams are active

4. **Gas Optimization**
   - Connect once, receive streams continuously
   - Only claim if artist prefers manual management

## Error Handling

Common errors and solutions:

### "User rejected transaction"
- User cancelled in wallet
- Show friendly message

### "Insufficient funds"
- User doesn't have enough ETH for gas
- Show gas estimate before transaction

### "Invalid pool address"
- Pool doesn't exist or wrong address
- Validate pool address before connecting

### "Already connected"
- Member is already connected
- Check status before connecting

## Security Considerations

1. **Frontend Execution**: All transactions execute on frontend with user's wallet
2. **No Server-Side Signing**: Never sign transactions server-side
3. **User Approval**: Always require explicit user approval
4. **Address Validation**: Validate all addresses before use

## Testing

1. Deploy test pool on Base Sepolia
2. Add test members with units
3. Test connection flow
4. Test claiming flow
5. Test disconnection
6. Verify real-time streaming works

## Next Steps

1. Add pool connection to artist onboarding
2. Show connection status in artist dashboard
3. Add notifications for new claimable amounts
4. Implement batch claiming for multiple pools
5. Add analytics for connection/claiming patterns

