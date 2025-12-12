#!/bin/bash

# Test Helper Script for Automated Prediction Market
# Usage: ./scripts/test-automated-market.sh <contract_address>

set -e

CONTRACT_ADDRESS=$1

if [ -z "$CONTRACT_ADDRESS" ]; then
    echo "❌ Error: Contract address required"
    echo "Usage: ./scripts/test-automated-market.sh <contract_address>"
    exit 1
fi

# Load environment variables
if [ -f .env.testnet ]; then
    export $(cat .env.testnet | grep -v '^#' | xargs)
elif [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

RPC_URL=${BASE_SEPOLIA_RPC_URL:-https://sepolia.base.org}
USDC_ADDRESS=${USDC_ADDRESS:-0x036CbD53842c5426634e7929541eC2318f3dCF7e}

echo "🧪 Testing Automated Prediction Market"
echo "Contract: $CONTRACT_ADDRESS"
echo "Network: Base Sepolia"
echo ""

# Test 1: Check market count
echo "📊 Test 1: Check Market Count"
MARKET_COUNT=$(cast call $CONTRACT_ADDRESS "s_marketCount()" --rpc-url $RPC_URL 2>/dev/null || echo "0")
echo "  Market Count: $MARKET_COUNT"
echo ""

# Test 2: Check protocol fee
echo "💰 Test 2: Check Protocol Fee"
FEE_BPS=$(cast call $CONTRACT_ADDRESS "protocolFeeBasisPoints()" --rpc-url $RPC_URL 2>/dev/null || echo "0")
echo "  Protocol Fee: $FEE_BPS basis points (should be 1000 for 10%)"
echo ""

# Test 3: Check next Monday EST
echo "⏰ Test 3: Get Next Monday EST"
NEXT_MONDAY=$(cast call $CONTRACT_ADDRESS "getNextMondayEST()" --rpc-url $RPC_URL 2>/dev/null || echo "0")
if [ "$NEXT_MONDAY" != "0" ]; then
    NEXT_MONDAY_DATE=$(date -r $NEXT_MONDAY 2>/dev/null || echo "Unable to parse")
    echo "  Next Monday 5:00 AM UTC: $NEXT_MONDAY ($NEXT_MONDAY_DATE)"
else
    echo "  Unable to get next Monday EST"
fi
echo ""

# Test 4: Check upkeep status
echo "🤖 Test 4: Check Upkeep Status"
UPKEEP_RESULT=$(cast call $CONTRACT_ADDRESS "checkUpkeep(bytes)" "" --rpc-url $RPC_URL 2>/dev/null || echo "error")
if [ "$UPKEEP_RESULT" != "error" ]; then
    echo "  Upkeep Result: $UPKEEP_RESULT"
else
    echo "  Unable to check upkeep (may need market ready for resolution)"
fi
echo ""

# Test 5: Check USDC token address
echo "💵 Test 5: Check USDC Token Address"
USDC_TOKEN=$(cast call $CONTRACT_ADDRESS "usdcToken()" --rpc-url $RPC_URL 2>/dev/null || echo "error")
echo "  USDC Token: $USDC_TOKEN"
echo "  Expected: $USDC_ADDRESS"
if [ "$USDC_TOKEN" = "$USDC_ADDRESS" ]; then
    echo "  ✅ USDC address matches"
else
    echo "  ⚠️  USDC address mismatch"
fi
echo ""

# Test 6: Check accumulated fees
echo "💸 Test 6: Check Accumulated Fees"
FEES=$(cast call $CONTRACT_ADDRESS "accumulatedFees()" --rpc-url $RPC_URL 2>/dev/null || echo "0")
echo "  Accumulated Fees: $FEES"
echo ""

echo "✅ Testing complete!"
echo ""
echo "💡 Next steps:"
echo "  1. Create a market: cast send $CONTRACT_ADDRESS 'createWeeklyMarket()' --rpc-url $RPC_URL --private-key <key>"
echo "  2. Place bets: cast send $CONTRACT_ADDRESS 'placeBet(uint256,string,uint256)' <marketId> '<track>' <amount> --rpc-url $RPC_URL --private-key <key>"
echo "  3. Monitor for resolution via Chainlink Automation"
