# Testnet Setup for AI Image Generation

## Why Testnet?

Your CDP credentials are valid for the Coinbase Developer Platform but don't have the necessary permissions for the x402 payment API. The testnet facilitator works without special credentials and is perfect for development and testing.

## Network Configuration

**Changed From:**
- Network: Base Mainnet (Chain ID: 8453)
- USDC: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
- Facilitator: CDP (requires special x402 API permissions)

**Changed To:**
- Network: Base Sepolia Testnet (Chain ID: 84532)
- USDC: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
- Facilitator: x402.org testnet (no special permissions needed)

## Setup Steps

### 1. Add Base Sepolia to Your Wallet

**Network Details:**
- **Network Name**: Base Sepolia
- **RPC URL**: https://sepolia.base.org
- **Chain ID**: 84532
- **Currency Symbol**: ETH
- **Block Explorer**: https://sepolia.basescan.org

**In MetaMask:**
1. Click network dropdown at top
2. Click "Add Network"
3. Enter the details above
4. Click "Save"

### 2. Get Testnet ETH (for gas)

Visit: https://www.alchemy.com/faucets/base-sepolia

1. Connect your wallet
2. Request ETH
3. Wait for confirmation

### 3. Get Testnet USDC

Visit: https://faucet.circle.com/

1. Select "USDC" token
2. Select "Base Sepolia" network
3. Enter your wallet address
4. Click "Get Test Tokens"
5. You'll receive testnet USDC

### 4. Switch to Base Sepolia

In your wallet:
1. Click network dropdown
2. Select "Base Sepolia"
3. Verify you see your testnet ETH and USDC

## Testing the Image Generation

Once you have testnet tokens:

1. **Refresh the app** (the network change requires a page refresh)
2. Click "Unlock AI Generation"
3. Enter a prompt
4. Click "Generate with Gemini AI"
5. Approve the $0.05 USDC payment (testnet USDC)
6. Watch the real AI image generate! 🎨

## Expected Logs

When working correctly, terminal should show:
```
[Payment Handler] Processing request for: /api/gemini/text-to-image
[Payment Handler] ✓ Using testnet facilitator (x402.org)
[Payment Handler] Note: Using Base Sepolia testnet for development
[Payment Handler] Creating payment middleware with facilitator: https://x402.org/facilitator
[Payment Handler] Executing payment middleware
[Payment Handler] Payment required - returning 402 response
```

Then after you approve payment:
```
[Gemini API] Handler called - payment verification passed
```

## Switching Back to Mainnet Later

When you want to use real USDC on Base mainnet:

1. **Get Valid x402 CDP Credentials**: Contact Coinbase to enable x402 API access for your CDP account
2. **Update Configuration**:
   ```typescript
   // In lib/payment-handler.ts
   network: "base", // Change from "base-sepolia"
   ```
3. **Uncomment CDP Facilitator Code**: Follow the comments in payment-handler.ts
4. **Update Component**: Change chain IDs and USDC address back to mainnet values

## Troubleshooting

### "Please switch to Base Sepolia testnet"
- Your wallet is still on mainnet or another network
- Switch to Base Sepolia in your wallet

### "Insufficient USDC balance"
- You need testnet USDC from the faucet
- Make sure you're on Base Sepolia network when requesting

### Still getting 500 error
- Check terminal logs for the exact error
- Make sure you've restarted the dev server after the changes

### Payment prompt doesn't appear
- Refresh the page after switching networks
- Check browser console for errors
- Verify wallet is connected

## Benefits of Testnet Development

✅ **No Real Money**: Test with free testnet tokens
✅ **No Special Permissions**: Works immediately
✅ **Fast Iteration**: Test the full payment flow
✅ **Safe Testing**: Can't lose real funds

Once everything works on testnet, upgrading to mainnet is just a configuration change!

