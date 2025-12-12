# Testnet Testing Guide for Automated Prediction Market

This guide provides step-by-step instructions for testing the Automated Prediction Market on Base Sepolia testnet.

## Prerequisites

- Foundry installed
- Wallet with Base Sepolia ETH (for gas)
- Testnet LINK tokens (for Chainlink services)
- Testnet USDC tokens (for betting)

## Step 1: Environment Setup

Create a `.env.testnet` file in the project root:

```bash
# Base Sepolia Testnet Configuration
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# Contract Addresses
USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
LINK_TOKEN_ADDRESS=0xe4ab69c077896252fafbd49efd26b5d171a32410

# Chainlink Functions Configuration
CHAINLINK_FUNCTIONS_SUBSCRIPTION_ID=508
CHAINLINK_FUNCTIONS_ROUTER=0xf9B8fc078197181C841c296C876945aaa425B278
CHAINLINK_FUNCTIONS_DON_ID=0x66756e2d626173652d7365706f6c69612d310000000000000000000000000000

# Optional: For contract verification
BASESCAN_API_KEY=your_api_key_here
```

## Step 2: Get Testnet Tokens

### Get Base Sepolia ETH
Visit: https://www.alchemy.com/faucets/base-sepolia
- Connect wallet
- Request ETH

### Get Testnet LINK
Visit: https://faucets.chain.link/base-sepolia
- Connect wallet
- Request LINK tokens
- You'll need LINK for:
  - Funding Functions subscription
  - Funding Automation upkeep

### Get Testnet USDC
Visit: https://faucet.circle.com/
- Select "USDC" token
- Select "Base Sepolia" network
- Enter wallet address
- Request testnet USDC

## Step 3: Deploy Contract

### Option A: Using Deployment Script

```bash
./scripts/deploy-automated-market-sepolia.sh
```

### Option B: Manual Deployment

```bash
# Load environment variables
source .env.testnet

# Deploy
forge script script/DeployAutomatedPredictionMarket.s.sol:DeployAutomatedPredictionMarket \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```

**Note the deployed contract address** - you'll need it for the next steps.

## Step 4: Chainlink Functions Setup

### 4.1 Fund Subscription 508

1. Go to [Chainlink Functions](https://functions.chain.link/)
2. Switch network to **Base Sepolia**
3. Find subscription **508**
4. Click "Add Funds" and transfer testnet LINK
5. Recommended: 5+ LINK for testing

### 4.2 Add Contract as Consumer

1. In subscription 508 dashboard, click "Add Consumer"
2. Enter your deployed contract address
3. Confirm the transaction
4. Verify contract appears in consumers list

## Step 5: Chainlink Automation Setup

### 5.1 Register Contract

1. Go to [Chainlink Automation](https://automation.chain.link/)
2. Switch network to **Base Sepolia**
3. Click "Register New Upkeep"
4. Select "Custom Logic"
5. Enter your contract address
6. Configure:
   - **Name**: "Automated Prediction Market Resolution (Testnet)"
   - **Starting Balance**: 2-5 LINK
   - **Gas Limit**: 500,000
   - **Check Data**: (leave empty)
7. Confirm registration

### 5.2 Verify Upkeep

- Check upkeep shows as "Active"
- Verify balance is sufficient
- Note the upkeep ID for monitoring

## Step 6: Create Test Market

### Using cast (Command Line)

```bash
# Set variables
CONTRACT_ADDRESS=<your_deployed_contract_address>
PRIVATE_KEY=<your_private_key>

# Create market
cast send $CONTRACT_ADDRESS \
  "createWeeklyMarket()" \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY
```

### Verify Market Created

```bash
# Check market count
cast call $CONTRACT_ADDRESS \
  "s_marketCount()" \
  --rpc-url $BASE_SEPOLIA_RPC_URL

# Check market details (market ID 1)
cast call $CONTRACT_ADDRESS \
  "markets(uint256)" \
  1 \
  --rpc-url $BASE_SEPOLIA_RPC_URL
```

## Step 7: Place Test Bets

### Approve USDC

```bash
USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
BET_AMOUNT=100000000  # 100 USDC (6 decimals)

cast send $USDC_ADDRESS \
  "approve(address,uint256)" \
  $CONTRACT_ADDRESS $BET_AMOUNT \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY
```

### Place Bet

```bash
MARKET_ID=1
TRACK_TITLE="Test Track Title"

cast send $CONTRACT_ADDRESS \
  "placeBet(uint256,string,uint256)" \
  $MARKET_ID "$TRACK_TITLE" $BET_AMOUNT \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY
```

### Verify Bet

```bash
# Check total pool
cast call $CONTRACT_ADDRESS \
  "markets(uint256)" \
  $MARKET_ID \
  --rpc-url $BASE_SEPOLIA_RPC_URL

# Get market bets
cast call $CONTRACT_ADDRESS \
  "getMarketBets(uint256)" \
  $MARKET_ID \
  --rpc-url $BASE_SEPOLIA_RPC_URL
```

## Step 8: Test Market Resolution

### Option A: Wait for Actual Resolution Time

1. Create market normally (resolves next Monday 5:00 AM UTC)
2. Wait until `resolveTime` passes
3. Monitor Automation dashboard for execution
4. Check contract events for `MarketResolved`

### Option B: Create Market with Near-Term Resolution (For Testing)

For faster testing, you can temporarily modify the contract's `getNextMondayEST()` function to return a near-term timestamp, or create a test that uses `vm.warp()` to simulate time passage.

### Verify Resolution

```bash
# Check if market is resolved
cast call $CONTRACT_ADDRESS \
  "markets(uint256)" \
  $MARKET_ID \
  --rpc-url $BASE_SEPOLIA_RPC_URL

# Check winning track
# (winningTrack is in the markets struct)
```

## Step 9: Test Claiming Winnings

### Claim Winnings (Winner)

```bash
cast send $CONTRACT_ADDRESS \
  "claimWinnings(uint256)" \
  $MARKET_ID \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --private-key $WINNER_PRIVATE_KEY
```

### Verify Claim

- Check user's USDC balance increased
- Verify `WinningsClaimed` event emitted
- Check bet's `claimed` flag is true

## Step 10: Monitor Services

### Chainlink Functions

- Monitor subscription 508 balance
- Check request history
- Verify successful executions

### Chainlink Automation

- Monitor upkeep balance
- Check execution history
- Verify `checkUpkeep` and `performUpkeep` calls

## Testing Checklist

- [ ] Contract deployed successfully
- [ ] Contract verified on BaseScan
- [ ] Functions subscription 508 funded
- [ ] Contract added as Functions consumer
- [ ] Automation upkeep registered and active
- [ ] Test market created
- [ ] Multiple bets placed
- [ ] Automation triggered (or verified `checkUpkeep` works)
- [ ] Market resolved correctly
- [ ] Fees calculated correctly (10%)
- [ ] Winners can claim
- [ ] Losers cannot claim
- [ ] Pro-rata payouts correct

## Troubleshooting

### Contract Deployment Fails

- Verify you have Base Sepolia ETH for gas
- Check environment variables are set correctly
- Verify Router and DON_ID addresses are correct

### Functions Request Fails

- Check subscription 508 has sufficient LINK
- Verify contract is added as consumer
- Check gas limit is sufficient (300,000)

### Automation Not Triggering

- Verify upkeep is registered and active
- Check upkeep has sufficient LINK balance
- Verify gas limit is 500,000
- Check that `resolveTime` has actually passed
- Manually call `checkUpkeep()` to verify it returns true

### Market Not Resolving

- Check `resolveTime` has passed
- Verify no pending request exists (`marketHasPendingRequest[marketId]`)
- Check Functions request was successful
- Review contract events

## Next Steps

After successful testnet testing:

1. Document any issues found
2. Fix any bugs
3. Measure gas costs
4. Update frontend integration
5. Prepare for mainnet deployment

## Useful Commands

```bash
# Check contract owner
cast call $CONTRACT_ADDRESS "owner()" --rpc-url $BASE_SEPOLIA_RPC_URL

# Check protocol fee
cast call $CONTRACT_ADDRESS "protocolFeeBasisPoints()" --rpc-url $BASE_SEPOLIA_RPC_URL

# Check accumulated fees
cast call $CONTRACT_ADDRESS "accumulatedFees()" --rpc-url $BASE_SEPOLIA_RPC_URL

# Get next Monday EST time
cast call $CONTRACT_ADDRESS "getNextMondayEST()" --rpc-url $BASE_SEPOLIA_RPC_URL

# Check if upkeep is needed
cast call $CONTRACT_ADDRESS "checkUpkeep(bytes)" "" --rpc-url $BASE_SEPOLIA_RPC_URL
```
