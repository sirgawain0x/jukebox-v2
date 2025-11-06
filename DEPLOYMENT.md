# Deployment Guide - Prediction Market Contract

This guide explains how to deploy the Prediction Market contract to Base Sepolia testnet.

## Prerequisites

1. **Foundry installed** - Already set up from testing
2. **Base Sepolia ETH** - Get testnet ETH from [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)
3. **Environment variables** - Set up your deployment configuration

## Step 1: Get Base Sepolia ETH

1. Visit the [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)
2. Connect your wallet
3. Request testnet ETH (you'll need some for gas fees)

## Step 2: Set Up Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and fill in your values:
   ```bash
   # Your private key (DO NOT commit to git!)
   PRIVATE_KEY=your_private_key_here
   
   # Base Sepolia USDC address
   USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
   
   # Where fees go (your wallet address)
   FEE_RECIPIENT=0xYourWalletAddress
   
   # Platform fee (100 = 1%)
   PLATFORM_FEE_BPS=100
   ```

3. **Important**: Add `.env` to `.gitignore` (already done)

## Step 3: Configure Foundry for Base Sepolia

Add Base Sepolia to your `foundry.toml` (already configured if you have it):

```toml
[rpc_endpoints]
base_sepolia = "${BASE_SEPOLIA_RPC_URL}"
```

Or use the default: `https://sepolia.base.org`

## Step 4: Deploy the Contract

### Option A: Using Foundry Script (Recommended)

```bash
# Load environment variables and deploy
forge script script/DeployPredictionMarket.s.sol:DeployPredictionMarket \
  --rpc-url base-sepolia \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY \
  -vvvv
```

Or if you have a `.env` file:

```bash
source .env
forge script script/DeployPredictionMarket.s.sol:DeployPredictionMarket \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY \
  -vvvv
```

### Option B: Simulate Deployment First

Test the deployment without broadcasting:

```bash
forge script script/DeployPredictionMarket.s.sol:DeployPredictionMarket \
  --rpc-url base-sepolia \
  -vvvv
```

### Option C: Deploy with Custom Parameters

If you want to override environment variables:

```bash
USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e \
FEE_RECIPIENT=0xYourAddress \
PLATFORM_FEE_BPS=100 \
forge script script/DeployPredictionMarket.s.sol:DeployPredictionMarket \
  --rpc-url base-sepolia \
  --broadcast \
  -vvvv
```

## Step 5: Update Contract Address

After deployment, update the contract address in your code:

1. Open `lib/contracts/prediction-market.ts`
2. Update the Base Sepolia address:
   ```typescript
   const PREDICTION_MARKET_ADDRESSES = {
     84532: "0xYourDeployedContractAddress" as const, // Base Sepolia
     8453: "0x0000000000000000000000000000000000000000" as const,
   } as const;
   ```

## Step 6: Verify the Contract (if not done automatically)

If verification didn't happen automatically:

```bash
forge verify-contract \
  --chain-id 84532 \
  --num-of-optimizations 200 \
  --watch \
  --constructor-args $(cast abi-encode "constructor(address,address,uint256)" \
    0x036CbD53842c5426634e7929541eC2318f3dCF7e \
    0xYourFeeRecipient \
    100) \
  --etherscan-api-key $BASESCAN_API_KEY \
  YourDeployedContractAddress \
  PredictionMarket
```

Or use the simpler method:

```bash
forge verify-contract \
  YourDeployedContractAddress \
  PredictionMarket \
  --chain-id 84532 \
  --etherscan-api-key $BASESCAN_API_KEY
```

## Step 7: Test the Deployment

1. Check the contract on [BaseScan Sepolia](https://sepolia.basescan.org/)
2. Verify the contract address is correct
3. Test creating a market through your frontend
4. Test placing bets

## Troubleshooting

### "Insufficient funds" error
- Make sure you have Base Sepolia ETH in your wallet
- Get testnet ETH from the faucet

### "Invalid private key" error
- Check that your private key in `.env` is correct
- Make sure it starts with `0x`

### "Contract verification failed"
- Wait a few minutes after deployment
- Check that the constructor arguments match
- Try the manual verification method

### "RPC URL not found"
- Make sure `BASE_SEPOLIA_RPC_URL` is set in your `.env`
- Or use `--rpc-url https://sepolia.base.org` directly

## Deployment Checklist

- [ ] Got Base Sepolia ETH from faucet
- [ ] Created `.env` file with correct values
- [ ] Tested deployment simulation (dry run)
- [ ] Deployed contract to Base Sepolia
- [ ] Contract verified on BaseScan
- [ ] Updated contract address in `lib/contracts/prediction-market.ts`
- [ ] Tested contract functions through frontend
- [ ] Tested creating markets
- [ ] Tested placing bets

## Next Steps After Testnet Deployment

1. Test all functionality thoroughly on testnet
2. Get community feedback
3. Conduct security audit (recommended)
4. Deploy to Base mainnet (see mainnet deployment section)

## Base Mainnet Deployment

When ready for mainnet:

1. Update USDC address to mainnet: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
2. Use mainnet RPC URL: `https://mainnet.base.org`
3. Update chain ID in deployment script: `8453`
4. Deploy with mainnet private key (use hardware wallet!)
5. Update contract address in code

## Security Reminders

- ⚠️ **NEVER commit your private key to git**
- ⚠️ **Use a separate wallet for mainnet deployment**
- ⚠️ **Consider using a multisig for fee recipient**
- ⚠️ **Test thoroughly on testnet first**
- ⚠️ **Get a security audit before mainnet**

