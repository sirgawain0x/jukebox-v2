# Base Mainnet Deployment Guide - Automated Prediction Market

This guide covers deploying the Automated Prediction Market contract to Base Mainnet.

## ⚠️ Important Warnings

- **This contract has NOT been professionally audited**
- **Deploying to mainnet carries significant security and financial risks**
- **Use a hardware wallet for deployment**
- **Test thoroughly on testnet first**

## Prerequisites

1. **Base Mainnet ETH** - For gas fees
2. **Chainlink Functions Subscription** - Create one at https://functions.chain.link/
3. **LINK tokens** - For funding Functions subscription and Automation upkeep
4. **Environment variables** - Set up your deployment configuration

## Step 1: Create Chainlink Functions Subscription

1. Visit https://functions.chain.link/
2. Switch to **Base Mainnet** network
3. Create a new subscription
4. Fund it with LINK (recommended: 10+ LINK for initial testing)
5. **Note your subscription ID** - you'll need it for deployment

## Step 2: Set Up Environment Variables

Add to your `.env` file:

```bash
# Base Mainnet Configuration
BASE_MAINNET_RPC_URL=https://mainnet.base.org

# Contract Addresses
USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
LINK_TOKEN_ADDRESS=0x88Fb150BDc53A65fe94Dea0c9BA0a6dAf8C6e196

# Chainlink Functions Configuration
CHAINLINK_FUNCTIONS_SUBSCRIPTION_ID=<your_subscription_id>
CHAINLINK_FUNCTIONS_ROUTER=0xf9b8fc078197181c841c296c876945aaa425b278
CHAINLINK_FUNCTIONS_DON_ID=0x66756e2d626173652d6d61696e6e65742d310000000000000000000000000000

# Deployment (choose one)
PRIVATE_KEY=<your_private_key>
# OR
DEPLOYER_ACCOUNT=deployer

# Optional: For contract verification
BASESCAN_API_KEY=<your_api_key>
```

## Step 3: Deploy Contract

Run the deployment script:

```bash
./scripts/deploy-automated-market-mainnet.sh
```

The script will:
- Verify you have the correct addresses
- Ask for confirmation (you must type "DEPLOY")
- Deploy the contract to Base Mainnet
- Optionally verify on BaseScan if API key is provided

## Step 4: Post-Deployment Setup

### 4.1 Add Contract as Functions Consumer

1. Go to https://functions.chain.link/
2. Switch to **Base Mainnet**
3. Open your subscription
4. Click "Add Consumer"
5. Enter the deployed contract address

### 4.2 Register with Chainlink Automation

1. Go to https://automation.chain.link/
2. Switch to **Base Mainnet**
3. Click "Register New Upkeep" → "Custom Logic"
4. Enter the deployed contract address
5. Set gas limit: **500,000**
6. Fund with **5-10 LINK** (recommended for initial testing)
7. Complete registration

### 4.3 Update Frontend Configuration

Update `lib/contracts/automated-prediction-market.ts`:

```typescript
const AUTOMATED_PREDICTION_MARKET_ADDRESSES = {
  84532: "0xbB22f1b5BF17e2eAD9aA1a012b8dA9A980797855" as Address, // Base Sepolia
  8453: "0x<YOUR_DEPLOYED_ADDRESS>" as Address, // Base Mainnet
} as const;
```

## Step 5: Create First Market

After deployment and setup, create your first weekly market:

```bash
cast send <CONTRACT_ADDRESS> \
  "createWeeklyMarket()" \
  --rpc-url $BASE_MAINNET_RPC_URL \
  --private-key $PRIVATE_KEY
```

Or use the frontend interface if available.

## Base Mainnet Addresses Reference

- **USDC**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **LINK Token**: `0x88Fb150BDc53A65fe94Dea0c9BA0a6dAf8C6e196`
- **Chainlink Functions Router**: `0xf9b8fc078197181c841c296c876945aaa425b278`
- **Chainlink Functions DON ID**: `fun-base-mainnet-1` (`0x66756e2d626173652d6d61696e6e65742d310000000000000000000000000000`)
- **Chain ID**: `8453`
- **RPC URL**: `https://mainnet.base.org`
- **Block Explorer**: https://basescan.org

## Monitoring

After deployment, monitor:
- Contract events on BaseScan
- Chainlink Automation upkeep status
- Functions subscription balance
- Market creation and resolution

## Troubleshooting

### Functions Request Fails
- Verify subscription has sufficient LINK balance
- Check that contract is added as consumer
- Verify JavaScript source code is correct
- Check gas limit is sufficient (300,000 is set in contract)

### Automation Not Triggering
- Verify upkeep is registered and funded
- Check that `checkUpkeep()` returns `true` for markets ready to resolve
- Ensure gas limit in upkeep registration is sufficient (500,000 recommended)
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
- [BaseScan Explorer](https://basescan.org)
