# Superfluid GDA Royalty Integration Setup

## Overview

This document describes the setup and configuration for the Superfluid GDA (General Distribution Agreement) royalty system that transforms the 3% artist fee into real-time streaming royalties.

**Note**: This integration supports both **Macro-based** and **Host batchCall** approaches. See [SUPERFLUID_BATCH_CALL.md](./SUPERFLUID_BATCH_CALL.md) for batch call documentation. **Recommendation**: Use Host `batchCall` for most operations (no deployment needed, lower gas costs).

## Environment Variables

Add these to your `.env` file:

```bash
# Superfluid Configuration
SUPERFLUID_HOST=0x5674AB30f95E2A0a639A6B4C0a0e8b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4
SUPERFLUID_RESOLVER=0x5674AB30f95E2A0a639A6B4C0a0e8b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4
SUPERFLUID_CFA=0x5674AB30f95E2A0a639A6B4C0a0e8b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4
SUPERFLUID_GDA=0x5674AB30f95E2A0a639A6B4C0a0e8b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4
SUPERFLUID_FUSDCX=0x5674AB30f95E2A0a639A6B4C0a0e8b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4

# Router Contract (deployed)
SUPERFLUID_ROUTER_ADDRESS=0x0000000000000000000000000000000000000000
SUPERFLUID_PLAY_RATE_ORACLE=0x0000000000000000000000000000000000000000

# Macro Contract (for batching operations)
NEXT_PUBLIC_SUPERFLUID_REWARDS_MACRO_ADDRESS=0x0000000000000000000000000000000000000000
NEXT_PUBLIC_SUPERFLUID_MACRO_FORWARDER_ADDRESS=0x0000000000000000000000000000000000000000

# Pool Configuration
SUPERFLUID_POOL_SEED_AMOUNT=10000000  # 10 USDC (6 decimals)
SUPERFLUID_MIN_COMPLETION_RATE=5000   # 50% (basis points)
```

### Base Mainnet Addresses

```bash
# Superfluid Host (Base Mainnet)
SUPERFLUID_HOST=0x5674AB30f95E2A0a639A6B4C0a0e8b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4

# fUSDCx (Superfluid USDC) - Base Mainnet
SUPERFLUID_FUSDCX=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

# GDA Forwarder - Base Mainnet
SUPERFLUID_GDA=0x5674AB30f95E2A0a639A6B4C0a0e8b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4
```

### Base Sepolia (Testnet) Addresses

```bash
# Superfluid Host (Base Sepolia)
SUPERFLUID_HOST=0x5674AB30f95E2A0a639A6B4C0a0e8b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4

# fUSDCx (Superfluid USDC) - Base Sepolia
SUPERFLUID_FUSDCX=0x036CbD53842c5426634e7929541eC2318f3dCF7e

# GDA Forwarder - Base Sepolia
SUPERFLUID_GDA=0x5674AB30f95E2A0a639A6B4C0a0e8b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4
```

**Note:** Replace placeholder addresses with actual Superfluid contract addresses for your network. Check [Superfluid documentation](https://docs.superfluid.finance/) for the latest addresses.

## Deployment Steps

### 1. Deploy SuperfluidRewardsMacro Contract

```bash
# Set environment variables
export SUPERFLUID_HOST=0x...
export SUPERFLUID_GDA=0x...
export SUPERFLUID_CFA=0x...

# Deploy using Foundry
forge script script/DeploySuperfluidRewardsMacro.s.sol:DeploySuperfluidRewardsMacro \
  --rpc-url $BASE_MAINNET_RPC_URL \
  --broadcast \
  --verify
```

After deployment, add to `.env`:
```bash
NEXT_PUBLIC_SUPERFLUID_REWARDS_MACRO_ADDRESS=0xYourDeployedMacroAddress
```

### 2. Deploy SuperfluidRoyaltyRouter Contract

```bash
# Set environment variables
export USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913  # Base Mainnet USDC
export PLAY_RATE_ORACLE=0xYourBackendServiceAddress

# Deploy using Foundry
forge script script/DeploySuperfluidRouter.s.sol:DeploySuperfluidRouter \
  --rpc-url $BASE_MAINNET_RPC_URL \
  --broadcast \
  --verify
```

### 3. Configure Router Contract

After deployment, set the Superfluid addresses:

```solidity
// Call on deployed router contract
router.setSuperfluidAddresses(
  fUSDCxAddress,
  hostAddress,
  gdaAddress
);
```

### 4. Set Play Rate Oracle

Set your backend service address as the oracle:

```solidity
router.setPlayRateOracle(yourBackendServiceAddress);
```

### 5. Update Environment Variables

Add the deployed router address to your `.env`:

```bash
SUPERFLUID_ROUTER_ADDRESS=0xYourDeployedRouterAddress
```

## Architecture

### Components

1. **SuperfluidRoyaltyRouter.sol** - On-chain router contract
2. **lib/superfluid-pool.ts** - Pool management service
3. **lib/superfluid-units.ts** - Unit calculation and updates
4. **lib/superfluid-play-oracle.ts** - Play rate verification (anti-spam)
5. **lib/superfluid-fan-boost.ts** - Fan boost management
6. **lib/superfluid-jackpot-stream.ts** - Jackpot streaming

### API Endpoints

- `GET /api/superfluid/pool?marketId={id}` - Get pool information
- `POST /api/superfluid/pool` - Create/update pool
- `POST /api/superfluid/pool/batch-host` - Prepare batch operation (Host batchCall)
- `POST /api/superfluid/pool/batch` - Execute batch operation (Macro-based)
- `GET /api/superfluid/royalties/live` - Get live royalty data
- `GET /api/superfluid/royalties/live?artist={address}` - Get artist royalties
- `POST /api/superfluid/fanboost` - Apply fan boost
- `POST /api/superfluid/units` - Update pool units

### UI Components

- `<LiveRoyaltiesTicker />` - Real-time royalty display
- `<ArtistRoyaltyCard />` - Artist-specific royalty card

## Integration Flow

1. **Market Creation**: When a market is created, backend creates a Superfluid GDA pool
2. **Play Tracking**: When users play songs, play duration is tracked
3. **Unit Updates**: Backend periodically updates pool units based on verified play counts
4. **Royalty Distribution**: When market resolves, 3% artist fee is routed to Superfluid pool
5. **Real-time Streaming**: Artists receive royalties in real-time based on their pool units
6. **Pool Connection**: Artists connect to pools to receive streams automatically
7. **Token Claiming**: Artists can claim accumulated tokens manually if preferred

## Anti-Spam Mechanism

The system uses a **listen-through rate filter**:
- Minimum completion rate: 50%
- Only verified plays (>=30 seconds) count toward units
- Artists with low completion rates get 0 units

## Fan Boost

Fans can boost artists by increasing their flow rate multiplier:
- Range: 1.0x to 5.0x
- Duration: Up to 7 days
- Applied automatically to flow rate calculations

## Next Steps

1. Install dependencies: `npm install`
2. Deploy router contract
3. Configure environment variables
4. Set up background jobs for unit updates
5. Integrate UI components into your app

## Testing

Test the integration on Base Sepolia first:

1. Deploy router contract to testnet
2. Create a test market
3. Simulate play events
4. Verify unit updates
5. Test fan boost functionality

## Support

For Superfluid-specific questions, refer to:
- [Superfluid Documentation](https://docs.superfluid.finance/)
- [Superfluid SDK](https://github.com/superfluid-finance/protocol-monorepo)

