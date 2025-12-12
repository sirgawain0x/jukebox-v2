# Chainlink Setup Guide for Automated Prediction Market

This guide walks through setting up Chainlink Functions and Chainlink Automation for the Automated Prediction Market contract.

## Prerequisites

- Deployed `AutomatedPredictionMarket` contract on Base Mainnet
- LINK tokens for funding Functions subscription and Automation upkeep
- Access to Chainlink Functions and Automation interfaces

## Step 1: Chainlink Functions Setup

### 1.1 Create a Functions Subscription

1. Go to [Chainlink Functions](https://functions.chain.link/)
2. Connect your wallet
3. Create a new subscription
4. Fund the subscription with LINK tokens (recommended: at least 5 LINK for testing)
5. Note your **Subscription ID** (you'll need this for deployment)

### 1.2 Add Contract as Consumer

1. In your Functions subscription dashboard, click "Add Consumer"
2. Enter your deployed `AutomatedPredictionMarket` contract address
3. Confirm the transaction

### 1.3 Verify JavaScript Source Code

The contract uses inline JavaScript source code that:
- Queries Spinamp GraphQL API: `https://api.spinamp.xyz/v3/graphql`
- Fetches the #1 trending track
- Returns the track title as an encoded string

The source code is stored in the contract's `SOURCE` constant and is automatically used when making Functions requests.

## Step 2: Chainlink Automation Setup

### 2.1 Register Contract with Automation Registry

1. Go to [Chainlink Automation](https://automation.chain.link/)
2. Connect your wallet
3. Click "Register New Upkeep"
4. Select "Custom Logic"
5. Enter your `AutomatedPredictionMarket` contract address
6. Set the following parameters:
   - **Upkeep Name**: "Automated Prediction Market Resolution"
   - **Starting Balance**: At least 2 LINK (for gas costs)
   - **Gas Limit**: 500,000 (to cover Functions request)
   - **Check Data**: Leave empty (contract uses `checkUpkeep(bytes calldata)`)
7. Confirm registration

### 2.2 Verify Upkeep Registration

After registration, Chainlink Automation will:
- Call `checkUpkeep()` every block
- When `block.timestamp >= market.resolveTime`, it will call `performUpkeep()`
- This triggers the Chainlink Functions request to resolve the market

## Step 3: Post-Deployment Configuration

### 3.1 Fund Contract with LINK (Optional)

If you want the contract to pay for Functions requests directly (instead of using subscription):
1. Transfer LINK tokens to the contract address
2. The contract will use these for Functions requests

**Note**: Using a subscription is recommended as it's more gas-efficient.

### 3.2 Create First Weekly Market

1. Call `createWeeklyMarket()` as the contract owner
2. This creates a market that resolves on the next Monday 5:00 AM UTC
3. Users can start placing bets immediately

### 3.3 Monitor Market Resolution

- Chainlink Automation will automatically check for markets ready to resolve
- When resolution time is reached, it triggers the Functions request
- The Functions DON executes the JavaScript code and returns the winning track
- The contract resolves the market and calculates payouts

## Step 4: Testing on Base Sepolia

For testing, use Base Sepolia testnet:

1. Get testnet LINK from [Chainlink Faucet](https://faucets.chain.link/base-sepolia)
2. Deploy contract to Base Sepolia using the deployment script:
   ```bash
   ./scripts/deploy-automated-market-sepolia.sh
   ```
   Or manually:
   ```bash
   forge script script/DeployAutomatedPredictionMarket.s.sol:DeployAutomatedPredictionMarket \
     --rpc-url $BASE_SEPOLIA_RPC_URL \
     --broadcast \
     --verify
   ```
3. Use existing Functions subscription 508 on Base Sepolia (or create new one)
4. Add contract as consumer to subscription 508
5. Register with Automation on Base Sepolia
6. Test the full flow before mainnet deployment

**Environment Variables for Testnet:**
```
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
CHAINLINK_FUNCTIONS_SUBSCRIPTION_ID=508
CHAINLINK_FUNCTIONS_ROUTER=0xf9B8fc078197181C841c296C876945aaa425B278
CHAINLINK_FUNCTIONS_DON_ID=0x66756e2d626173652d7365706f6c69612d310000000000000000000000000000
```

## Important Addresses

### Base Mainnet

- **Chainlink Functions Router**: `0xf9b8fc078197181c841c296c876945aaa425b278`
- **Chainlink Functions DON ID**: `fun-base-mainnet-1` (`0x66756e2d626173652d6d61696e6e65742d310000000000000000000000000000`)
- **LINK Token**: `0x88Fb150BDc53A65fe94Dea0c9BA0a6dAf8C6e196`
- **USDC**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

### Base Sepolia (Testnet)

- **Chainlink Functions Router**: `0xf9B8fc078197181C841c296C876945aaa425B278`
- **Chainlink Functions DON ID**: `0x66756e2d626173652d7365706f6c69612d310000000000000000000000000000` (string: `fun-base-sepolia-1`)
- **Chainlink Functions Subscription ID**: `508` (existing subscription)
- **USDC**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **LINK Token**: `0xe4ab69c077896252fafbd49efd26b5d171a32410`

## Troubleshooting

### Functions Request Fails

- Verify subscription has sufficient LINK balance
- Check that contract is added as consumer
- Verify JavaScript source code is correct
- Check gas limit is sufficient (300,000 is set in contract)

### Automation Not Triggering

- Verify upkeep is registered and funded
- Check that `checkUpkeep()` returns `true` for markets ready to resolve
- Ensure gas limit in upkeep registration is sufficient
- Verify contract address is correct in upkeep registration

### Market Not Resolving

- Check that `resolveTime` has passed
- Verify no pending request exists for the market
- Check that Functions request was successful
- Review contract events for errors

## Security Considerations

- Only the contract owner can create markets
- Only Chainlink Automation can call `performUpkeep()`
- Only Chainlink Functions DON can call `fulfillRequest()`
- Fees are accumulated and can only be withdrawn by owner
- Users must approve USDC before placing bets

## Additional Resources

- [Chainlink Functions Documentation](https://docs.chain.link/chainlink-functions)
- [Chainlink Automation Documentation](https://docs.chain.link/chainlink-automation)
- [Base Network Documentation](https://docs.base.org)
