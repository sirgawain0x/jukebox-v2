#!/bin/bash

# Deploy Automated Prediction Market to Base Mainnet
# Usage: ./scripts/deploy-automated-market-mainnet.sh
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
echo "🚀 Deploying Automated Prediction Market to Base Mainnet..."
echo ""

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ Error: .env file not found"
    echo "Please create .env with the following variables:"
    echo "  BASE_MAINNET_RPC_URL=https://mainnet.base.org"
    echo "  USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    echo "  CHAINLINK_FUNCTIONS_SUBSCRIPTION_ID=<your_subscription_id>"
    echo "  CHAINLINK_FUNCTIONS_ROUTER=0xf9b8fc078197181c841c296c876945aaa425b278"
    echo "  CHAINLINK_FUNCTIONS_DON_ID=0x66756e2d626173652d6d61696e6e65742d310000000000000000000000000000"
    echo "  PRIVATE_KEY=<your_private_key> (optional, can use --interactive instead)"
    echo "  DEPLOYER_ACCOUNT=<foundry_account_name> (optional, alternative to PRIVATE_KEY)"
    exit 1
fi

# Base Mainnet addresses
MAINNET_USDC="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
MAINNET_ROUTER="0xf9b8fc078197181c841c296c876945aaa425b278"
MAINNET_DON_ID="0x66756e2d626173652d6d61696e6e65742d310000000000000000000000000000"

# Verify required variables
if [ -z "$BASE_MAINNET_RPC_URL" ]; then
    BASE_MAINNET_RPC_URL="https://mainnet.base.org"
    echo "⚠️  BASE_MAINNET_RPC_URL not set, using default: $BASE_MAINNET_RPC_URL"
fi

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

if [ -z "$CHAINLINK_FUNCTIONS_SUBSCRIPTION_ID" ]; then
    echo "❌ Error: CHAINLINK_FUNCTIONS_SUBSCRIPTION_ID not set"
    echo "   You need to create a Chainlink Functions subscription on Base Mainnet"
    echo "   Visit: https://functions.chain.link/"
    exit 1
fi

if [ -z "$CHAINLINK_FUNCTIONS_ROUTER" ]; then
    echo "⚠️  CHAINLINK_FUNCTIONS_ROUTER not set, using Base Mainnet router: $MAINNET_ROUTER"
    CHAINLINK_FUNCTIONS_ROUTER="$MAINNET_ROUTER"
elif [ "$CHAINLINK_FUNCTIONS_ROUTER" != "$MAINNET_ROUTER" ]; then
    echo "⚠️  Warning: CHAINLINK_FUNCTIONS_ROUTER doesn't match Base Mainnet router"
    echo "   Expected: $MAINNET_ROUTER"
    echo "   Got: $CHAINLINK_FUNCTIONS_ROUTER"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

if [ -z "$CHAINLINK_FUNCTIONS_DON_ID" ]; then
    echo "⚠️  CHAINLINK_FUNCTIONS_DON_ID not set, using Base Mainnet DON ID: $MAINNET_DON_ID"
    CHAINLINK_FUNCTIONS_DON_ID="$MAINNET_DON_ID"
elif [ "$CHAINLINK_FUNCTIONS_DON_ID" != "$MAINNET_DON_ID" ]; then
    echo "⚠️  Warning: CHAINLINK_FUNCTIONS_DON_ID doesn't match Base Mainnet DON ID"
    echo "   Expected: $MAINNET_DON_ID"
    echo "   Got: $CHAINLINK_FUNCTIONS_DON_ID"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "📋 Deployment Configuration:"
echo "  Network: Base Mainnet (Chain ID: 8453)"
echo "  USDC: $USDC_ADDRESS"
echo "  Subscription ID: $CHAINLINK_FUNCTIONS_SUBSCRIPTION_ID"
echo "  Router: $CHAINLINK_FUNCTIONS_ROUTER"
echo "  DON ID: $CHAINLINK_FUNCTIONS_DON_ID"
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
echo "📦 Deploying contract..."

# Check for private key or account
DEPLOY_ARGS="--rpc-url $BASE_MAINNET_RPC_URL --broadcast --chain-id 8453"

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
export CHAINLINK_FUNCTIONS_ROUTER
export CHAINLINK_FUNCTIONS_DON_ID

forge script script/DeployAutomatedPredictionMarket.s.sol:DeployAutomatedPredictionMarket $DEPLOY_ARGS

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Update lib/contracts/automated-prediction-market.ts with the deployed contract address"
echo "  2. Add contract as consumer to Chainlink Functions subscription $CHAINLINK_FUNCTIONS_SUBSCRIPTION_ID"
echo "  3. Register contract with Chainlink Automation on Base Mainnet"
echo "  4. Fund contract with LINK for Functions requests (or ensure subscription is funded)"
echo "  5. Verify the contract on BaseScan if not auto-verified"
echo "  6. Create first weekly market using createWeeklyMarket()"
echo ""
echo "⚠️  Remember: Monitor the contract closely and be ready to pause if issues arise"
