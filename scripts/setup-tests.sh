#!/bin/bash

# Setup script for Foundry contract testing

echo "🔧 Setting up Foundry contract tests..."

# Check if Foundry is installed
if ! command -v forge &> /dev/null; then
    echo "❌ Foundry is not installed. Installing now..."
    curl -L https://foundry.paradigm.xyz | bash
    foundryup
else
    echo "✅ Foundry is already installed"
fi

# Install dependencies
echo "📦 Installing contract dependencies..."

# Install OpenZeppelin contracts
if [ ! -d "lib/openzeppelin-contracts" ]; then
    echo "Installing OpenZeppelin contracts..."
    forge install OpenZeppelin/openzeppelin-contracts
else
    echo "✅ OpenZeppelin contracts already installed"
fi

# Install forge-std
if [ ! -d "lib/forge-std" ]; then
    echo "Installing forge-std..."
    forge install foundry-rs/forge-std
else
    echo "✅ forge-std already installed"
fi

echo ""
echo "✅ Setup complete! Run 'npm run test' to run the tests."
echo ""
echo "Available commands:"
echo "  npm run test          - Run all tests"
echo "  npm run test:verbose  - Run tests with verbose output"
echo "  npm run test:gas      - Generate gas report"
echo "  npm run test:coverage - Generate coverage report"

