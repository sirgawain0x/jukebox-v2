#!/bin/bash

# Deployment script for Base Mainnet
# Usage: ./scripts/deploy-mainnet.sh
#
# ⚠️  WARNING: This contract has NOT been professionally audited
# ⚠️  Deploying to mainnet carries significant risks
# ⚠️  Use a hardware wallet and test thoroughly on testnet first

set -e

echo "⚠️  ⚠️  ⚠️  MAINNET DEPLOYMENT WARNING ⚠️  ⚠️  ⚠️"
echo ""
echo "This contract has NOT been professionally audited."
echo "Deploying to mainnet carries significant security and financial risks."
echo ""
read -p "Have you completed a security audit? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "❌ Deployment cancelled. Please get a security audit before deploying to mainnet."
    echo "   Recommended audit firms: OpenZeppelin, Trail of Bits, Consensys Diligence"
    exit 1
fi

echo ""
echo "🚀 Deploying Prediction Market to Base Mainnet..."
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "Please copy .env.example to .env and fill in your values"
    exit 1
fi

# Load environment variables
source .env

# Check required variables
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Error: PRIVATE_KEY not set in .env"
    echo "⚠️  Use a hardware wallet for mainnet deployment!"
    exit 1
fi

# Base Mainnet USDC address
MAINNET_USDC="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"

if [ -z "$USDC_ADDRESS" ]; then
    echo "⚠️  USDC_ADDRESS not set, using Base Mainnet USDC: $MAINNET_USDC"
    USDC_ADDRESS="$MAINNET_USDC"
elif [ "$USDC_ADDRESS" != "$MAINNET_USDC" ]; then
    echo "⚠️  Warning: USDC_ADDRESS doesn't match Base Mainnet USDC"
    echo "   Expected: $MAINNET_USDC"
    echo "   Got: $USDC_ADDRESS"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

if [ -z "$FEE_RECIPIENT" ]; then
    echo "❌ Error: FEE_RECIPIENT not set in .env"
    echo "⚠️  Consider using a multisig wallet for fee recipient"
    exit 1
fi

if [ -z "$PLATFORM_FEE_BPS" ]; then
    echo "⚠️  PLATFORM_FEE_BPS not set, using default: 100 (1%)"
    PLATFORM_FEE_BPS=100
fi

# Set RPC URL if not provided
if [ -z "$BASE_MAINNET_RPC_URL" ]; then
    BASE_MAINNET_RPC_URL="https://mainnet.base.org"
    echo "⚠️  BASE_MAINNET_RPC_URL not set, using default: $BASE_MAINNET_RPC_URL"
fi

echo "📋 Deployment Configuration:"
echo "  Network: Base Mainnet (Chain ID: 8453)"
echo "  USDC Address: $USDC_ADDRESS"
echo "  Fee Recipient: $FEE_RECIPIENT"
echo "  Platform Fee: $PLATFORM_FEE_BPS bps ($(echo "scale=2; $PLATFORM_FEE_BPS/100" | bc)%)"
echo "  RPC URL: $BASE_MAINNET_RPC_URL"
echo ""

# Final confirmation
echo "⚠️  FINAL CONFIRMATION REQUIRED ⚠️"
echo "You are about to deploy to Base MAINNET with real funds."
echo "This action cannot be undone."
echo ""
read -p "Type 'DEPLOY' to confirm: " -r
if [ "$REPLY" != "DEPLOY" ]; then
    echo "Deployment cancelled"
    exit 1
fi

echo ""
echo "📦 Deploying contract to Base Mainnet..."

# Export environment variables for the script
export USDC_ADDRESS
export FEE_RECIPIENT
export PLATFORM_FEE_BPS

# Deploy with verification if API key is provided
if [ -n "$BASESCAN_API_KEY" ]; then
    echo "Contract verification enabled"
    forge script script/DeployPredictionMarket.s.sol:DeployPredictionMarket \
        --rpc-url "$BASE_MAINNET_RPC_URL" \
        --private-key "$PRIVATE_KEY" \
        --broadcast \
        --verify \
        --etherscan-api-key "$BASESCAN_API_KEY" \
        --chain-id 8453 \
        -vvvv
else
    echo "BASESCAN_API_KEY not set, skipping verification"
    echo "You can verify manually later using BaseScan"
    forge script script/DeployPredictionMarket.s.sol:DeployPredictionMarket \
        --rpc-url "$BASE_MAINNET_RPC_URL" \
        --private-key "$PRIVATE_KEY" \
        --broadcast \
        --chain-id 8453 \
        -vvvv
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Update lib/contracts/prediction-market.ts with the deployed address"
echo "2. Verify the contract on BaseScan if not auto-verified"
echo "3. Test the contract on mainnet with small amounts first"
echo "4. Monitor the contract closely for the first few markets"
echo "5. View on BaseScan: https://basescan.org/address/<CONTRACT_ADDRESS>"
echo ""
echo "⚠️  Remember: Monitor the contract closely and be ready to pause if issues arise"

