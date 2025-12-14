#!/bin/bash

# Deploy SpinampUSDC to Base Sepolia (Testnet)
# Usage: ./scripts/deploy-spinamp-usdc-sepolia.sh

set -e

echo "🚀 Deploying SpinampUSDC to Base Sepolia (Testnet)..."
echo ""

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ Error: .env file not found"
    echo "Please create .env with the following variables:"
    echo "  BASE_SEPOLIA_RPC_URL=https://sepolia.base.org"
    echo "  TESTNET_USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e"
    echo "  TESTNET_CHAINLINK_FUNCTIONS_SUBSCRIPTION_ID=<your_subscription_id>"
    echo "  TESTNET_CHAINLINK_FUNCTIONS_ROUTER=0xf9B8fc078197181C841c296C876945aaa425B278"
    echo "  TESTNET_CHAINLINK_FUNCTIONS_DON_ID=0x66756e2d626173652d7365706f6c69612d310000000000000000000000000000"
    echo "  PRIVATE_KEY=<your_private_key> (optional, can use --interactive instead)"
    echo "  DEPLOYER_ACCOUNT=<foundry_account_name> (optional, alternative to PRIVATE_KEY)"
    exit 1
fi

# Base Sepolia addresses
SEPOLIA_USDC="0x036CbD53842c5426634e7929541eC2318f3dCF7e"

# Verify required variables
if [ -z "$BASE_SEPOLIA_RPC_URL" ]; then
    BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
    echo "⚠️  BASE_SEPOLIA_RPC_URL not set, using default: $BASE_SEPOLIA_RPC_URL"
fi

# Use TESTNET_USDC_ADDRESS, fallback to USDC_ADDRESS for backwards compatibility
if [ -n "$TESTNET_USDC_ADDRESS" ]; then
    USDC_ADDRESS="$TESTNET_USDC_ADDRESS"
elif [ -n "$USDC_ADDRESS" ]; then
    echo "⚠️  Warning: USDC_ADDRESS is deprecated, please use TESTNET_USDC_ADDRESS"
    USDC_ADDRESS="$USDC_ADDRESS"
else
    echo "⚠️  TESTNET_USDC_ADDRESS not set, using Base Sepolia USDC: $SEPOLIA_USDC"
    USDC_ADDRESS="$SEPOLIA_USDC"
fi

# Validate USDC address
if [ "$USDC_ADDRESS" != "$SEPOLIA_USDC" ]; then
    echo "⚠️  Warning: TESTNET_USDC_ADDRESS doesn't match Base Sepolia USDC"
    echo "   Expected: $SEPOLIA_USDC"
    echo "   Got: $USDC_ADDRESS"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Use TESTNET_CHAINLINK_FUNCTIONS_SUBSCRIPTION_ID, fallback for backwards compatibility
if [ -n "$TESTNET_CHAINLINK_FUNCTIONS_SUBSCRIPTION_ID" ]; then
    CHAINLINK_FUNCTIONS_SUBSCRIPTION_ID="$TESTNET_CHAINLINK_FUNCTIONS_SUBSCRIPTION_ID"
elif [ -z "$CHAINLINK_FUNCTIONS_SUBSCRIPTION_ID" ]; then
    echo "❌ Error: TESTNET_CHAINLINK_FUNCTIONS_SUBSCRIPTION_ID not set"
    echo "   You need to create a Chainlink Functions subscription on Base Sepolia"
    echo "   Visit: https://functions.chain.link/"
    exit 1
fi

echo "📋 Deployment Configuration:"
echo "  Network: Base Sepolia (Chain ID: 84532)"
echo "  USDC: $USDC_ADDRESS"
echo "  Subscription ID: $CHAINLINK_FUNCTIONS_SUBSCRIPTION_ID"
echo "  Router: 0xf9B8fc078197181C841c296C876945aaa425B278 (Base Sepolia)"
echo "  DON ID: 0x66756e2d626173652d7365706f6c69612d310000000000000000000000000000"
echo "  Creation Fee: $5 USDC"
echo ""

echo ""
echo "📦 Deploying contract..."

# Check for private key or account
DEPLOY_ARGS="--rpc-url $BASE_SEPOLIA_RPC_URL --broadcast --chain-id 84532"

if [ -n "$PRIVATE_KEY" ]; then
    echo "  Using PRIVATE_KEY from environment"
    DEPLOY_ARGS="$DEPLOY_ARGS --private-key $PRIVATE_KEY"
elif [ -n "$DEPLOYER_ACCOUNT" ]; then
    echo "  Using Foundry account: $DEPLOYER_ACCOUNT"
    DEPLOY_ARGS="$DEPLOY_ARGS --account $DEPLOYER_ACCOUNT"
else
    echo "⚠️  Warning: No PRIVATE_KEY or DEPLOYER_ACCOUNT set"
    echo "  You can either:"
    echo "    1. Set PRIVATE_KEY in .env"
    echo "    2. Set DEPLOYER_ACCOUNT to use a Foundry account (e.g., 'deployer')"
    echo "    3. Use --interactive flag to enter private key"
    read -p "  Continue with --interactive? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled. Please set PRIVATE_KEY or DEPLOYER_ACCOUNT in .env"
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

# Export environment variables for the script
export USDC_ADDRESS
export CHAINLINK_FUNCTIONS_SUBSCRIPTION_ID

forge script script/DeploySpinampUSDC.s.sol:DeploySpinampUSDC $DEPLOY_ARGS

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Update your frontend/backend with the deployed contract address"
echo "  2. Add contract as consumer to Chainlink Functions subscription $CHAINLINK_FUNCTIONS_SUBSCRIPTION_ID"
echo "  3. Register contract with Chainlink Automation on Base Sepolia (automation.chain.link)"
echo "  4. Fund subscription with test LINK/USDC for Functions requests"
echo "  5. Verify the contract on BaseScan if not auto-verified"
echo "  6. Test creating a weekly market using createWeeklyMarket()"

