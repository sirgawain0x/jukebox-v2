#!/bin/bash

# Deployment script for Base Sepolia
# Usage: ./scripts/deploy-sepolia.sh

set -e

echo "🚀 Deploying Prediction Market to Base Sepolia..."
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
    exit 1
fi

if [ -z "$USDC_ADDRESS" ]; then
    echo "❌ Error: USDC_ADDRESS not set in .env"
    echo "Base Sepolia USDC: 0x036CbD53842c5426634e7929541eC2318f3dCF7e"
    exit 1
fi

if [ -z "$FEE_RECIPIENT" ]; then
    echo "❌ Error: FEE_RECIPIENT not set in .env"
    exit 1
fi

if [ -z "$PLATFORM_FEE_BPS" ]; then
    echo "⚠️  PLATFORM_FEE_BPS not set, using default: 100 (1%)"
    PLATFORM_FEE_BPS=100
fi

# Set RPC URL if not provided
if [ -z "$BASE_SEPOLIA_RPC_URL" ]; then
    BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
    echo "⚠️  BASE_SEPOLIA_RPC_URL not set, using default: $BASE_SEPOLIA_RPC_URL"
fi

echo "📋 Deployment Configuration:"
echo "  USDC Address: $USDC_ADDRESS"
echo "  Fee Recipient: $FEE_RECIPIENT"
echo "  Platform Fee: $PLATFORM_FEE_BPS bps ($(echo "scale=2; $PLATFORM_FEE_BPS/100" | bc)%)"
echo "  RPC URL: $BASE_SEPOLIA_RPC_URL"
echo ""

# Ask for confirmation
read -p "Continue with deployment? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 1
fi

echo ""
echo "📦 Deploying contract..."

# Export environment variables for the script
export USDC_ADDRESS
export FEE_RECIPIENT
export PLATFORM_FEE_BPS

# Deploy with verification if API key is provided
if [ -n "$BASESCAN_API_KEY" ]; then
    echo "Contract verification enabled"
    forge script script/DeployPredictionMarket.s.sol:DeployPredictionMarket \
        --rpc-url "$BASE_SEPOLIA_RPC_URL" \
        --private-key "$PRIVATE_KEY" \
        --broadcast \
        --verify \
        --etherscan-api-key "$BASESCAN_API_KEY" \
        -vvvv
else
    echo "BASESCAN_API_KEY not set, skipping verification"
    echo "You can verify manually later using BaseScan"
    forge script script/DeployPredictionMarket.s.sol:DeployPredictionMarket \
        --rpc-url "$BASE_SEPOLIA_RPC_URL" \
        --private-key "$PRIVATE_KEY" \
        --broadcast \
        -vvvv
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Update lib/contracts/prediction-market.ts with the deployed address"
echo "2. Test the contract on Base Sepolia"
echo "3. View on BaseScan: https://sepolia.basescan.org/address/<CONTRACT_ADDRESS>"

