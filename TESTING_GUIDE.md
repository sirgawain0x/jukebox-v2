# Testing Guide for Automated Prediction Market

Now that your contract is deployed and Chainlink Functions subscription is set up, follow this guide to test everything end-to-end.

## Quick Start Testing Checklist

- [ ] Contract deployed: `0xbB22f1b5BF17e2eAD9aA1a012b8dA9A980797855`
- [ ] Chainlink Functions subscription 508 funded and contract added as consumer
- [ ] Chainlink Automation registered (if testing automation)
- [ ] Testnet USDC tokens for betting
- [ ] Testnet ETH for gas

## Step 1: Verify Contract Setup

### Check Contract Configuration

```bash
# Set your contract address
export CONTRACT_ADDRESS=0xbB22f1b5BF17e2eAD9aA1a012b8dA9A980797855
export RPC_URL=https://sepolia.base.org

# Check USDC token address
cast call $CONTRACT_ADDRESS "usdcToken()" --rpc-url $RPC_URL

# Check subscription ID
cast call $CONTRACT_ADDRESS "s_subscriptionId()" --rpc-url $RPC_URL

# Check protocol fee (should be 1000 = 10%)
cast call $CONTRACT_ADDRESS "protocolFeeBasisPoints()" --rpc-url $RPC_URL

# Check owner
cast call $CONTRACT_ADDRESS "owner()" --rpc-url $RPC_URL
```

### Verify Chainlink Functions Consumer

1. Go to [Chainlink Functions Dashboard](https://functions.chain.link/)
2. Switch to **Base Sepolia** network
3. Open subscription **508**
4. Verify your contract address appears in the "Consumers" list
5. Check subscription balance (should have LINK for requests)

## Step 2: Create Your First Test Market

### Using Cast (Command Line)

```bash
# Set your private key (or use --interactive)
export PRIVATE_KEY=<your_private_key>

# Create weekly market
cast send $CONTRACT_ADDRESS \
  "createWeeklyMarket()" \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY

# Verify market was created
cast call $CONTRACT_ADDRESS "s_marketCount()" --rpc-url $RPC_URL
# Should return: 1

# Get market details
cast call $CONTRACT_ADDRESS "markets(uint256)" 1 --rpc-url $RPC_URL
```

### Using Frontend (React Hooks)

If you have a frontend set up:

```typescript
import { useCreateWeeklyMarket } from '@/lib/contracts/automated-prediction-market-hooks';

function CreateMarketButton() {
  const { createWeeklyMarket, isPending, isSuccess } = useCreateWeeklyMarket();
  
  return (
    <button 
      onClick={() => createWeeklyMarket()} 
      disabled={isPending}
    >
      {isPending ? 'Creating...' : 'Create Weekly Market'}
    </button>
  );
}
```

### Verify Market Details

After creating, check the market:

```bash
# Get full market struct (returns: id, endTime, resolveTime, resolved, winningTrack, totalPool)
cast call $CONTRACT_ADDRESS "markets(uint256)" 1 --rpc-url $RPC_URL

# Get next Monday EST time
cast call $CONTRACT_ADDRESS "getNextMondayEST()" --rpc-url $RPC_URL
# Convert timestamp to readable date:
cast --to-dec $(cast call $CONTRACT_ADDRESS "getNextMondayEST()" --rpc-url $RPC_URL) | xargs -I {} date -r {}
```

## Step 3: Test Placing Bets

### Get Testnet USDC

1. Visit [Circle Faucet](https://faucet.circle.com/)
2. Select **USDC** and **Base Sepolia**
3. Enter your wallet address
4. Request testnet USDC

### Approve USDC

```bash
export USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
export BET_AMOUNT=100000000  # 100 USDC (6 decimals)

# Approve contract to spend USDC
cast send $USDC_ADDRESS \
  "approve(address,uint256)" \
  $CONTRACT_ADDRESS $BET_AMOUNT \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY
```

### Place a Bet

```bash
export MARKET_ID=1
export TRACK_TITLE="Test Song Title"

# Place bet
cast send $CONTRACT_ADDRESS \
  "placeBet(uint256,string,uint256)" \
  $MARKET_ID "$TRACK_TITLE" $BET_AMOUNT \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY
```

### Verify Bet Was Placed

```bash
# Check total pool increased
cast call $CONTRACT_ADDRESS "markets(uint256)" $MARKET_ID --rpc-url $RPC_URL

# Get all bets for this market
cast call $CONTRACT_ADDRESS "getMarketBets(uint256)" $MARKET_ID --rpc-url $RPC_URL
```

### Place Multiple Bets (Different Tracks)

Test with different track titles to simulate multiple predictions:

```bash
# Bet 2: Different track
cast send $USDC_ADDRESS \
  "approve(address,uint256)" \
  $CONTRACT_ADDRESS 50000000 \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY

cast send $CONTRACT_ADDRESS \
  "placeBet(uint256,string,uint256)" \
  $MARKET_ID "Another Track Name" 50000000 \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY
```

## Step 4: Test Chainlink Functions Integration

### Manual Functions Request (For Testing)

To test Functions without waiting for automation, you can manually trigger resolution:

**Note:** The contract's `_resolveMarket` function is internal and called by `performUpkeep`. For testing, you can:

1. **Wait for actual resolution time** (next Monday 5:00 AM UTC)
2. **Use Chainlink Automation** (recommended - see Step 5)
3. **Temporarily modify contract** for testing (not recommended for production)

### Verify Functions Request Will Work

Check that subscription has funds:

```bash
# Check subscription balance on Chainlink Functions dashboard
# Should have at least 1-2 LINK for testing
```

## Step 5: Test Chainlink Automation

### Register with Automation

1. Go to [Chainlink Automation](https://automation.chain.link/)
2. Switch to **Base Sepolia**
3. Click "Register New Upkeep"
4. Select **Custom Logic**
5. Enter contract address: `0xbB22f1b5BF17e2eAD9aA1a012b8dA9A980797855`
6. Configure:
   - **Name**: "Automated Prediction Market (Testnet)"
   - **Starting Balance**: 2-5 LINK
   - **Gas Limit**: 500,000
   - **Check Data**: (leave empty)
7. Confirm registration

### Verify Automation is Working

```bash
# Check if upkeep is needed (should return true after resolveTime)
cast call $CONTRACT_ADDRESS \
  "checkUpkeep(bytes)" \
  "" \
  --rpc-url $RPC_URL

# This will return:
# upkeepNeeded: true/false
# performData: encoded data for performUpkeep
```

### Monitor Automation

1. Check Automation dashboard for your upkeep
2. Verify it shows as "Active"
3. Monitor execution history
4. When `resolveTime` passes, Automation should automatically call `performUpkeep`

## Step 6: Test Market Resolution

### Option A: Wait for Actual Resolution

1. Create market (resolves next Monday 5:00 AM UTC)
2. Place bets
3. Wait until resolution time
4. Automation will trigger automatically
5. Check contract events for `MarketResolved`

### Option B: Test Resolution Manually (Advanced)

For faster testing, you can simulate time passage in a test environment, but on testnet you'll need to wait for actual time.

### Verify Resolution

```bash
# Check if market is resolved
cast call $CONTRACT_ADDRESS "markets(uint256)" $MARKET_ID --rpc-url $RPC_URL
# resolved field should be: true

# Check winning track
# (winningTrack is in the markets struct response)
```

### Check Events

View on [BaseScan](https://sepolia.basescan.org/address/0xbB22f1b5BF17e2eAD9aA1a012b8dA9A980797855#events):

- `MarketCreated` - When market is created
- `BetPlaced` - When bets are placed
- `MarketResolved` - When market resolves
- `WinningsClaimed` - When winners claim

## Step 7: Test Claiming Winnings

### Claim as Winner

```bash
# Claim winnings (only works if you bet on winning track)
cast send $CONTRACT_ADDRESS \
  "claimWinnings(uint256)" \
  $MARKET_ID \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY
```

### Verify Claim

- Check your USDC balance increased
- Verify `WinningsClaimed` event on BaseScan
- Check bet's `claimed` flag is true

## Step 8: Test Edge Cases

### Test 1: No Winners

Create a market where no one bets on the winning track:
- Place bets on "Track A" and "Track B"
- If winning track is "Track C", no one wins
- Fees should still be collected
- Pool should be distributed to protocol fees

### Test 2: Single Winner

- Only one bet on the winning track
- That bettor should get entire pool (minus fees)

### Test 3: All Bets on Same Track

- Everyone bets on same track
- If that track wins, everyone splits pool (minus fees) pro-rata

### Test 4: Betting After End Time

```bash
# Try to place bet after endTime (should fail)
# You'll need to wait or check endTime first
cast call $CONTRACT_ADDRESS "markets(uint256)" $MARKET_ID --rpc-url $RPC_URL
# Check endTime field
```

## Step 9: Monitor Everything

### Chainlink Functions

- Monitor subscription 508 balance
- Check request history
- Verify successful executions
- Look for any errors

### Chainlink Automation

- Monitor upkeep balance
- Check execution history
- Verify `checkUpkeep` and `performUpkeep` calls
- Ensure upkeep stays active

### Contract Events

Monitor on BaseScan:
- All events should fire correctly
- Check transaction hashes
- Verify gas costs

## Step 10: Frontend Integration Testing

If you have a frontend, test these flows:

### Create Market Flow

```typescript
const { createWeeklyMarket, isPending, isSuccess } = useCreateWeeklyMarket();
```

### Place Bet Flow

```typescript
const { placeBet, isBetPending, isBetSuccess } = usePlaceBetAutomated();

// Usage
await placeBet(
  BigInt(1), // marketId
  "My Track Prediction", // trackTitle
  BigInt(100000000) // amount (100 USDC)
);
```

### View Market Flow

```typescript
const { data: market } = useGetMarket(BigInt(1));
const { data: bets } = useGetMarketBets(BigInt(1));
const { data: marketCount } = useGetMarketCount();
```

### Claim Winnings Flow

```typescript
const { claimWinnings, isPending } = useClaimWinnings();

// Usage
claimWinnings(BigInt(1)); // marketId
```

## Troubleshooting

### Functions Request Fails

- **Check subscription balance** - Needs LINK
- **Verify consumer** - Contract must be added to subscription
- **Check gas limit** - Should be 300,000+ for Functions request
- **Review Functions logs** - Check dashboard for error details

### Automation Not Triggering

- **Check upkeep balance** - Needs LINK for gas
- **Verify gas limit** - Should be 500,000
- **Check resolveTime** - Must have passed
- **Manual check** - Call `checkUpkeep()` to verify it returns true
- **Review Automation logs** - Check dashboard for execution history

### Market Not Resolving

- **Check resolveTime** - Must be in the past
- **Verify no pending request** - `marketHasPendingRequest[marketId]` should be false
- **Check Functions request** - Should complete successfully
- **Review events** - Look for `MarketResolved` event

### Betting Fails

- **Check USDC approval** - Must approve contract first
- **Verify market exists** - Market ID must be valid
- **Check endTime** - Cannot bet after endTime
- **Verify USDC balance** - Must have sufficient balance

## Next Steps After Testing

1. ✅ Document any issues found
2. ✅ Fix bugs if any
3. ✅ Measure gas costs for all operations
4. ✅ Test with multiple users/addresses
5. ✅ Verify fee calculations
6. ✅ Test full weekly cycle
7. ✅ Prepare for mainnet deployment

## Quick Reference Commands

```bash
# Set variables
export CONTRACT_ADDRESS=0xbB22f1b5BF17e2eAD9aA1a012b8dA9A980797855
export RPC_URL=https://sepolia.base.org
export PRIVATE_KEY=<your_key>
export USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e

# Create market
cast send $CONTRACT_ADDRESS "createWeeklyMarket()" --rpc-url $RPC_URL --private-key $PRIVATE_KEY

# Approve USDC
cast send $USDC_ADDRESS "approve(address,uint256)" $CONTRACT_ADDRESS 100000000 --rpc-url $RPC_URL --private-key $PRIVATE_KEY

# Place bet
cast send $CONTRACT_ADDRESS "placeBet(uint256,string,uint256)" 1 "Track Title" 100000000 --rpc-url $RPC_URL --private-key $PRIVATE_KEY

# Check market
cast call $CONTRACT_ADDRESS "markets(uint256)" 1 --rpc-url $RPC_URL

# Check bets
cast call $CONTRACT_ADDRESS "getMarketBets(uint256)" 1 --rpc-url $RPC_URL

# Check upkeep
cast call $CONTRACT_ADDRESS "checkUpkeep(bytes)" "" --rpc-url $RPC_URL
```
