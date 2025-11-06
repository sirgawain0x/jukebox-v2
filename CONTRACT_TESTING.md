# Prediction Market Contract Testing

This document describes how to test the Prediction Market contract before deployment.

## Setup

### Install Foundry

If you don't have Foundry installed, run:

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Install Dependencies

```bash
# Install OpenZeppelin contracts
forge install OpenZeppelin/openzeppelin-contracts

# Install forge-std (if not already included)
forge install foundry-rs/forge-std
```

**Note:** If you want to install without committing to git, you can use `--no-git` flag, but the default behavior will add them as git submodules.

## Running Tests

### Run All Tests

```bash
npm run test
# or
forge test
```

### Run Tests with Verbose Output

```bash
npm run test:verbose
# or
forge test -vvv
```

### Generate Gas Report

```bash
npm run test:gas
# or
forge test --gas-report
```

### Generate Coverage Report

```bash
npm run test:coverage
# or
forge coverage
```

### Run Specific Test

```bash
forge test --match-test test_PlaceBet_YES
```

### Run Tests Matching Pattern

```bash
forge test --match-path "*PredictionMarket*"
```

## Test Coverage

The test suite covers:

### Market Creation
- ✅ Creating markets with valid parameters
- ✅ Rejecting invalid end times (past timestamps)
- ✅ Rejecting empty song IDs
- ✅ Creating multiple markets

### Betting
- ✅ Placing YES bets
- ✅ Placing NO bets
- ✅ Multiple users betting on same market
- ✅ Rejecting bets on resolved markets
- ✅ Rejecting bets after market ends
- ✅ Rejecting zero-amount bets
- ✅ Rejecting bets on non-existent markets

### Market Resolution
- ✅ Resolving markets as YES winner
- ✅ Resolving markets as NO winner
- ✅ Rejecting resolution before market ends
- ✅ Rejecting double resolution
- ✅ Only owner can resolve markets

### Claiming Winnings
- ✅ Claiming winnings for YES winners
- ✅ Claiming winnings for NO winners
- ✅ Rejecting claims for non-winners
- ✅ Rejecting claims before market resolution
- ✅ Rejecting double claims
- ✅ Proportional payout calculations
- ✅ Platform fee deductions

### Fee Management
- ✅ Platform fee calculation (1% default)
- ✅ Fee recipient updates
- ✅ Fee percentage updates (max 10%)

### Edge Cases
- ✅ Fuzz testing for bet amounts
- ✅ Resolving markets with no bets
- ✅ Proportional payouts with multiple winners

## Contract Structure

```
contracts/
├── PredictionMarket.sol      # Main contract
└── test/
    └── MockERC20.sol          # Mock USDC for testing

test/
└── PredictionMarket.t.sol    # Comprehensive test suite
```

## Test Scenarios

### Scenario 1: Simple YES/NO Market

1. Create market
2. User1 bets 100 USDC on YES
3. User2 bets 100 USDC on NO
4. Resolve as YES
5. User1 claims ~198 USDC (200 - 2 fee)
6. User2 cannot claim (lost)

### Scenario 2: Proportional Payouts

1. Create market
2. User1 bets 100 USDC on YES
3. User2 bets 200 USDC on YES
4. User3 bets 300 USDC on NO
5. Resolve as YES
6. User1 gets (100/300) * 600 = 200 USDC - fee
7. User2 gets (200/300) * 600 = 400 USDC - fee

### Scenario 3: No Bets

1. Create market
2. Resolve immediately (no bets placed)
3. Market should resolve successfully

## Gas Optimization

The contract is optimized for:
- Minimal storage operations
- Efficient payout calculations
- Single fee transfer per claim

## Security Considerations

✅ Tests verify:
- Access control (only owner can resolve)
- Reentrancy protection (via SafeERC20)
- Input validation
- Overflow protection (Solidity 0.8+)
- Fee limits (max 10%)

## Deployment Checklist

Before deploying to mainnet:

- [ ] All tests pass
- [ ] Gas report reviewed
- [ ] Coverage report shows >90% coverage
- [ ] Security audit completed
- [ ] Contract addresses updated in `lib/contracts/prediction-market.ts`
- [ ] USDC address verified for target chain
- [ ] Fee recipient address set
- [ ] Platform fee percentage confirmed

## Next Steps

1. Review test results
2. Run gas optimization if needed
3. Deploy to testnet (Base Sepolia)
4. Run integration tests on testnet
5. Update contract address in code
6. Deploy to mainnet

