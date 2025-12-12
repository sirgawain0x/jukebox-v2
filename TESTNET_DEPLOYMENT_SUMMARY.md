# Testnet Deployment Summary

Quick reference guide for deploying and testing the Automated Prediction Market on Base Sepolia.

## Quick Start

### 1. Set Environment Variables

Create `.env.testnet` or add to `.env`:

```bash
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
CHAINLINK_FUNCTIONS_SUBSCRIPTION_ID=508
CHAINLINK_FUNCTIONS_ROUTER=0xf9B8fc078197181C841c296C876945aaa425B278
CHAINLINK_FUNCTIONS_DON_ID=0x66756e2d626173652d7365706f6c69612d310000000000000000000000000000

# Deployment (choose one)
PRIVATE_KEY=<your_private_key>
# OR
DEPLOYER_ACCOUNT=deployer

# Optional: For contract verification
BASESCAN_API_KEY=<your_api_key>
```

### 2. Deploy Contract

**Option A: Using Deployment Script (Recommended)**

Add to `.env.testnet`:
```bash
PRIVATE_KEY=<your_private_key>
# OR
DEPLOYER_ACCOUNT=deployer  # If using Foundry account
```

Then run:
```bash
./scripts/deploy-automated-market-sepolia.sh
```

**Option B: Manual Deployment**

```bash
source .env.testnet
forge script script/DeployAutomatedPredictionMarket.s.sol:DeployAutomatedPredictionMarket \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```

**Note:** You need either `PRIVATE_KEY` or `DEPLOYER_ACCOUNT` set, or use `--interactive` flag.

### 3. Update Frontend Config

After deployment, update `lib/contracts/automated-prediction-market.ts`:

```typescript
84532: "0x<YOUR_DEPLOYED_ADDRESS>" as Address
```

### 4. Chainlink Setup

**Functions:**
1. Go to https://functions.chain.link/
2. Switch to Base Sepolia
3. Open subscription 508
4. Click "Add Consumer"
5. Enter deployed contract address

**Automation:**
1. Go to https://automation.chain.link/
2. Switch to Base Sepolia
3. Register New Upkeep → Custom Logic
4. Enter contract address
5. Set gas limit: 500,000
6. Fund with 2-5 LINK

### 5. Create First Market

```bash
cast send <CONTRACT_ADDRESS> \
  "createWeeklyMarket()" \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY
```

### 6. Test Betting

```bash
# Approve USDC
cast send $USDC_ADDRESS \
  "approve(address,uint256)" \
  <CONTRACT_ADDRESS> 100000000 \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY

# Place bet
cast send <CONTRACT_ADDRESS> \
  "placeBet(uint256,string,uint256)" \
  1 "Track Title" 100000000 \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY
```

## Verification Commands

```bash
# Check market count
cast call <CONTRACT_ADDRESS> "s_marketCount()" --rpc-url $BASE_SEPOLIA_RPC_URL

# Check market details
cast call <CONTRACT_ADDRESS> "markets(uint256)" 1 --rpc-url $BASE_SEPOLIA_RPC_URL

# Check upkeep status
cast call <CONTRACT_ADDRESS> "checkUpkeep(bytes)" "" --rpc-url $BASE_SEPOLIA_RPC_URL

# Get market bets
cast call <CONTRACT_ADDRESS> "getMarketBets(uint256)" 1 --rpc-url $BASE_SEPOLIA_RPC_URL
```

## Testnet Addresses

- **USDC**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **LINK**: `0xe4ab69c077896252fafbd49efd26b5d171a32410`
- **Functions Router**: `0xf9B8fc078197181C841c296C876945aaa425B278`
- **Functions DON ID**: `0x66756e2d626173652d7365706f6c69612d310000000000000000000000000000`
- **Subscription ID**: `508`

## Resources

- [Full Testing Guide](./TESTNET_TESTING.md)
- [Chainlink Setup Guide](./CHAINLINK_SETUP.md)
- [Base Sepolia Faucet](https://www.alchemy.com/faucets/base-sepolia)
- [Chainlink Faucet](https://faucets.chain.link/base-sepolia)
