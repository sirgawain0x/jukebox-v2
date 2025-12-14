#!/bin/bash

# Deploy SpinampUSDC to Base Mainnet
# Usage: ./scripts/deploy-spinamp-usdc-mainnet.sh
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
echo "🚀 Deploying SpinampUSDC to Base Mainnet..."
echo ""

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ Error: .env file not found"
    echo "Please create .env with the following variables:"
    echo "  BASE_MAINNET_RPC_URL=https://mainnet.base.org"
    echo "  BASE_MAINNET_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    echo "  BASE_MAINNET_CHAINLINK_FUNCTIONS_SUBSCRIPTION_ID=<your_subscription_id>"
    echo "  BASE_MAINNET_CHAINLINK_FUNCTIONS_ROUTER=0xf9b8fc078197181c841c296c876945aaa425b278"
    echo "  BASE_MAINNET_CHAINLINK_FUNCTIONS_DON_ID=0x66756e2d626173652d6d61696e6e65742d310000000000000000000000000000"
    echo "  PRIVATE_KEY=<your_private_key> (optional, can use --interactive instead)"
    echo "  DEPLOYER_ACCOUNT=<foundry_account_name> (optional, alternative to PRIVATE_KEY)"
    exit 1
fi

# Base Mainnet addresses
MAINNET_USDC="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"

# Verify required variables
if [ -z "$BASE_MAINNET_RPC_URL" ]; then
    BASE_MAINNET_RPC_URL="https://mainnet.base.org"
    echo "⚠️  BASE_MAINNET_RPC_URL not set, using default: $BASE_MAINNET_RPC_URL"
fi

# Use BASE_MAINNET_USDC_ADDRESS, fallback for backwards compatibility
if [ -n "$BASE_MAINNET_USDC_ADDRESS" ]; then
    USDC_ADDRESS="$BASE_MAINNET_USDC_ADDRESS"
elif [ -n "$MAINNET_USDC_ADDRESS" ]; then
    echo "⚠️  Warning: MAINNET_USDC_ADDRESS is deprecated, please use BASE_MAINNET_USDC_ADDRESS"
    USDC_ADDRESS="$MAINNET_USDC_ADDRESS"
elif [ -n "$USDC_ADDRESS" ]; then
    echo "⚠️  Warning: USDC_ADDRESS is deprecated, please use BASE_MAINNET_USDC_ADDRESS"
    USDC_ADDRESS="$USDC_ADDRESS"
else
    echo "⚠️  BASE_MAINNET_USDC_ADDRESS not set, using Base Mainnet USDC: $MAINNET_USDC"
    USDC_ADDRESS="$MAINNET_USDC"
fi

# Validate USDC address
if [ "$USDC_ADDRESS" != "$MAINNET_USDC" ]; then
    echo "⚠️  Warning: BASE_MAINNET_USDC_ADDRESS doesn't match Base Mainnet USDC"
    echo "   Expected: $MAINNET_USDC"
    echo "   Got: $USDC_ADDRESS"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Use BASE_MAINNET_CHAINLINK_FUNCTIONS_SUBSCRIPTION_ID, fallback for backwards compatibility
if [ -n "$BASE_MAINNET_CHAINLINK_FUNCTIONS_SUBSCRIPTION_ID" ]; then
    CHAINLINK_FUNCTIONS_SUBSCRIPTION_ID="$BASE_MAINNET_CHAINLINK_FUNCTIONS_SUBSCRIPTION_ID"
elif [ -z "$CHAINLINK_FUNCTIONS_SUBSCRIPTION_ID" ]; then
    echo "❌ Error: BASE_MAINNET_CHAINLINK_FUNCTIONS_SUBSCRIPTION_ID not set"
    echo "   You need to create a Chainlink Functions subscription on Base Mainnet"
    echo "   Visit: https://functions.chain.link/"
    exit 1
fi

# Support both BASE_MAINNET_ prefixed and non-prefixed variable names for Router
if [ -n "$BASE_MAINNET_CHAINLINK_FUNCTIONS_ROUTER" ]; then
    CHAINLINK_FUNCTIONS_ROUTER="$BASE_MAINNET_CHAINLINK_FUNCTIONS_ROUTER"
elif [ -z "$CHAINLINK_FUNCTIONS_ROUTER" ]; then
    echo "❌ Error: BASE_MAINNET_CHAINLINK_FUNCTIONS_ROUTER not set"
    echo "   Base Mainnet Router: 0xf9b8fc078197181c841c296c876945aaa425b278"
    exit 1
fi

# Support both BASE_MAINNET_ prefixed and non-prefixed variable names for DON_ID
if [ -n "$BASE_MAINNET_CHAINLINK_FUNCTIONS_DON_ID" ]; then
    CHAINLINK_FUNCTIONS_DON_ID="$BASE_MAINNET_CHAINLINK_FUNCTIONS_DON_ID"
elif [ -z "$CHAINLINK_FUNCTIONS_DON_ID" ]; then
    echo "❌ Error: BASE_MAINNET_CHAINLINK_FUNCTIONS_DON_ID not set"
    echo "   Base Mainnet DON ID: 0x66756e2d626173652d6d61696e6e65742d310000000000000000000000000000"
    exit 1
fi

# Verify FEE_RECIPIENT is set
if [ -z "$FEE_RECIPIENT" ]; then
    echo "❌ Error: FEE_RECIPIENT not set"
    echo "   Please set FEE_RECIPIENT in your .env file"
    echo "   Example: FEE_RECIPIENT=0x14cda4b78d9e7ca923b8f535c73ea69a6c6708d8"
    exit 1
fi

echo "📋 Deployment Configuration:"
echo "  Network: Base Mainnet (Chain ID: 8453)"
echo "  USDC: $USDC_ADDRESS"
echo "  Subscription ID: $CHAINLINK_FUNCTIONS_SUBSCRIPTION_ID"
echo "  Router: $CHAINLINK_FUNCTIONS_ROUTER"
echo "  DON ID: $CHAINLINK_FUNCTIONS_DON_ID"
echo "  Creation Fee: $5 USDC (Owner exempt)"
echo "  Fee Recipient: $FEE_RECIPIENT"
echo "  Automation Registry: 0xf4bAb6A129164aBa9B113cB96BA4266dF49f8743"
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
export FEE_RECIPIENT

forge script script/DeploySpinampUSDC.s.sol:DeploySpinampUSDC $DEPLOY_ARGS

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Update your frontend/backend with the deployed contract address"
echo "  2. Add contract as consumer to Chainlink Functions subscription $CHAINLINK_FUNCTIONS_SUBSCRIPTION_ID"
echo "  3. Register contract with Chainlink Automation on Base Mainnet"
echo "     Registry: 0xf4bAb6A129164aBa9B113cB96BA4266dF49f8743"
echo "     Visit: https://automation.chain.link/"
echo "  4. Fund subscription with LINK for Functions requests"
echo "  5. Verify the contract on BaseScan if not auto-verified"
echo "  6. Create first weekly market using createWeeklyMarket()"
echo ""
echo "⚠️  Remember: Monitor the contract closely and be ready to pause if issues arise"

