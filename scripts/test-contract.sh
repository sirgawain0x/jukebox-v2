#!/bin/bash

# Quick testing script for Automated Prediction Market
# Usage: ./scripts/test-contract.sh

set -e

CONTRACT_ADDRESS="0xbB22f1b5BF17e2eAD9aA1a012b8dA9A980797855"
RPC_URL="${BASE_SEPOLIA_RPC_URL:-https://sepolia.base.org}"
USDC_ADDRESS="0x036CbD53842c5426634e7929541eC2318f3dCF7e"

echo "🧪 Testing Automated Prediction Market Contract"
echo "Contract: $CONTRACT_ADDRESS"
echo "Network: Base Sepolia"
echo ""

# Check if PRIVATE_KEY is set
if [ -z "$PRIVATE_KEY" ]; then
    echo "⚠️  PRIVATE_KEY not set. Some tests will be read-only."
    echo "   Set PRIVATE_KEY to test write operations."
    READ_ONLY=true
else
    READ_ONLY=false
fi

echo "📋 Step 1: Verify Contract Configuration"
echo "----------------------------------------"

echo "USDC Token Address:"
cast call $CONTRACT_ADDRESS "usdcToken()" --rpc-url $RPC_URL

echo ""
echo "Chainlink Functions Subscription ID:"
cast call $CONTRACT_ADDRESS "s_subscriptionId()" --rpc-url $RPC_URL

echo ""
echo "Protocol Fee (basis points):"
cast call $CONTRACT_ADDRESS "protocolFeeBasisPoints()" --rpc-url $RPC_URL

echo ""
echo "Contract Owner:"
cast call $CONTRACT_ADDRESS "owner()" --rpc-url $RPC_URL

echo ""
echo "📊 Step 2: Check Market Status"
echo "----------------------------------------"

MARKET_COUNT=$(cast call $CONTRACT_ADDRESS "s_marketCount()" --rpc-url $RPC_URL | cast --to-dec)
echo "Total Markets: $MARKET_COUNT"

if [ "$MARKET_COUNT" != "0" ]; then
    echo ""
    echo "Latest Market (ID: $MARKET_COUNT) Details:"
    cast call $CONTRACT_ADDRESS "markets(uint256)" $MARKET_COUNT --rpc-url $RPC_URL
    
    echo ""
    echo "Market Bets:"
    cast call $CONTRACT_ADDRESS "getMarketBets(uint256)" $MARKET_COUNT --rpc-url $RPC_URL
fi

echo ""
echo "Next Monday EST (timestamp):"
NEXT_MONDAY=$(cast call $CONTRACT_ADDRESS "getNextMondayEST()" --rpc-url $RPC_URL | cast --to-dec)
echo "$NEXT_MONDAY"
if command -v date &> /dev/null; then
    echo "Next Monday EST (readable):"
    date -r $NEXT_MONDAY 2>/dev/null || date -d "@$NEXT_MONDAY" 2>/dev/null || echo "Unable to convert timestamp"
fi

echo ""
echo "🔍 Step 3: Check Chainlink Automation Status"
echo "----------------------------------------"

echo "Checking upkeep status:"
cast call $CONTRACT_ADDRESS "checkUpkeep(bytes)" "0x" --rpc-url $RPC_URL || echo "Note: checkUpkeep may return false if no markets are ready for resolution"

echo ""
echo "💰 Step 4: Check Fees"
echo "----------------------------------------"

ACCUMULATED_FEES=$(cast call $CONTRACT_ADDRESS "accumulatedFees()" --rpc-url $RPC_URL | cast --to-dec)
echo "Accumulated Fees: $ACCUMULATED_FEES (raw units)"
# USDC has 6 decimals, so divide by 1e6
if command -v bc &> /dev/null; then
    FEES_USDC=$(echo "scale=2; $ACCUMULATED_FEES / 1000000" | bc)
    echo "Accumulated Fees: $FEES_USDC USDC"
fi

if [ "$READ_ONLY" = false ]; then
    echo ""
    echo "✍️  Step 5: Write Operations (PRIVATE_KEY required)"
    echo "----------------------------------------"
    echo ""
    echo "To test write operations, run these commands manually:"
    echo ""
    echo "# Create a market:"
    echo "cast send $CONTRACT_ADDRESS \\"
    echo "  \"createWeeklyMarket()\" \\"
    echo "  --rpc-url $RPC_URL \\"
    echo "  --private-key \$PRIVATE_KEY"
    echo ""
    echo "# Approve USDC:"
    echo "cast send $USDC_ADDRESS \\"
    echo "  \"approve(address,uint256)\" \\"
    echo "  $CONTRACT_ADDRESS 100000000 \\"
    echo "  --rpc-url $RPC_URL \\"
    echo "  --private-key \$PRIVATE_KEY"
    echo ""
    echo "# Place a bet:"
    echo "cast send $CONTRACT_ADDRESS \\"
    echo "  \"placeBet(uint256,string,uint256)\" \\"
    echo "  1 \"Test Track\" 100000000 \\"
    echo "  --rpc-url $RPC_URL \\"
    echo "  --private-key \$PRIVATE_KEY"
else
    echo ""
    echo "✅ Read-only tests complete!"
    echo ""
    echo "To test write operations, set PRIVATE_KEY and run again."
fi

echo ""
echo "📝 Next Steps:"
echo "1. View contract on BaseScan: https://sepolia.basescan.org/address/$CONTRACT_ADDRESS"
echo "2. Check Chainlink Functions subscription 508 balance"
echo "3. Verify Chainlink Automation upkeep is registered"
echo "4. Create a test market and place bets"
echo "5. Monitor for market resolution"
