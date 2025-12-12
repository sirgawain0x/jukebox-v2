#!/bin/bash

# Deploy Automated Prediction Market to Base Sepolia Testnet
# Usage: ./scripts/deploy-automated-market-sepolia.sh

set -e

echo "🚀 Deploying Automated Prediction Market to Base Sepolia..."

# Load environment variables
if [ -f .env.testnet ]; then
    export $(cat .env.testnet | grep -v '^#' | xargs)
elif [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ Error: .env.testnet or .env file not found"
    echo "Please create .env.testnet with the following variables:"
    echo "  BASE_SEPOLIA_RPC_URL=https://sepolia.base.org"
    echo "  USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e"
    echo "  CHAINLINK_FUNCTIONS_SUBSCRIPTION_ID=508"
    echo "  CHAINLINK_FUNCTIONS_ROUTER=0xf9B8fc078197181C841c296C876945aaa425B278"
    echo "  CHAINLINK_FUNCTIONS_DON_ID=0x66756e2d626173652d7365706f6c69612d310000000000000000000000000000"
    echo "  PRIVATE_KEY=<your_private_key> (optional, can use --interactive instead)"
    echo "  DEPLOYER_ACCOUNT=<foundry_account_name> (optional, alternative to PRIVATE_KEY)"
    exit 1
fi

# Verify required variables
if [ -z "$BASE_SEPOLIA_RPC_URL" ]; then
    echo "❌ Error: BASE_SEPOLIA_RPC_URL not set"
    exit 1
fi

if [ -z "$USDC_ADDRESS" ]; then
    echo "❌ Error: USDC_ADDRESS not set"
    exit 1
fi

if [ -z "$CHAINLINK_FUNCTIONS_SUBSCRIPTION_ID" ]; then
    echo "❌ Error: CHAINLINK_FUNCTIONS_SUBSCRIPTION_ID not set"
    exit 1
fi

if [ -z "$CHAINLINK_FUNCTIONS_ROUTER" ]; then
    echo "❌ Error: CHAINLINK_FUNCTIONS_ROUTER not set"
    exit 1
fi

if [ -z "$CHAINLINK_FUNCTIONS_DON_ID" ]; then
    echo "❌ Error: CHAINLINK_FUNCTIONS_DON_ID not set"
    exit 1
fi

echo "📋 Deployment Configuration:"
echo "  Network: Base Sepolia"
echo "  USDC: $USDC_ADDRESS"
echo "  Subscription ID: $CHAINLINK_FUNCTIONS_SUBSCRIPTION_ID"
echo "  Router: $CHAINLINK_FUNCTIONS_ROUTER"
echo "  DON ID: $CHAINLINK_FUNCTIONS_DON_ID"
echo ""

# Deploy contract
echo "📦 Deploying contract..."

# Check for private key or account
DEPLOY_ARGS="--rpc-url $BASE_SEPOLIA_RPC_URL --broadcast"

if [ -n "$PRIVATE_KEY" ]; then
    echo "  Using PRIVATE_KEY from environment"
    DEPLOY_ARGS="$DEPLOY_ARGS --private-key $PRIVATE_KEY"
elif [ -n "$DEPLOYER_ACCOUNT" ]; then
    echo "  Using Foundry account: $DEPLOYER_ACCOUNT"
    DEPLOY_ARGS="$DEPLOY_ARGS --account $DEPLOYER_ACCOUNT"
else
    echo "⚠️  Warning: No PRIVATE_KEY or DEPLOYER_ACCOUNT set"
    echo "  You can either:"
    echo "    1. Set PRIVATE_KEY in .env.testnet"
    echo "    2. Set DEPLOYER_ACCOUNT to use a Foundry account (e.g., 'deployer')"
    echo "    3. Use --interactive flag to enter private key"
    read -p "  Continue with --interactive? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled. Please set PRIVATE_KEY or DEPLOYER_ACCOUNT in .env.testnet"
        exit 1
    fi
    DEPLOY_ARGS="$DEPLOY_ARGS --interactive"
fi

if [ -n "$BASESCAN_API_KEY" ]; then
    DEPLOY_ARGS="$DEPLOY_ARGS --verify --etherscan-api-key $BASESCAN_API_KEY"
    echo "  Contract verification enabled"
else
    echo "  ⚠️  BASESCAN_API_KEY not set, skipping verification"
fi

DEPLOY_ARGS="$DEPLOY_ARGS -vvvv"

forge script script/DeployAutomatedPredictionMarket.s.sol:DeployAutomatedPredictionMarket $DEPLOY_ARGS

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Update lib/contracts/automated-prediction-market.ts with the deployed contract address"
echo "  2. Add contract as consumer to Chainlink Functions subscription 508"
echo "  3. Register contract with Chainlink Automation on Base Sepolia"
echo "  4. Create first test market using createWeeklyMarket()"
