# Frontend Testing Guide for Automated Prediction Market

## Quick Start

The frontend is now ready to test market creation on Base Sepolia! Here's how to set it up:

### 1. Enable Testnet Mode

Add this to your `.env.local` file (or create it if it doesn't exist):

```bash
NEXT_PUBLIC_USE_TESTNET=true
```

This will switch the app to use Base Sepolia instead of Base Mainnet.

### 2. Switch Your Wallet to Base Sepolia

1. Open your wallet (MetaMask, Coinbase Wallet, etc.)
2. Click the network dropdown
3. If Base Sepolia isn't listed, add it:
   - **Network Name**: Base Sepolia
   - **RPC URL**: https://sepolia.base.org
   - **Chain ID**: 84532
   - **Currency Symbol**: ETH
   - **Block Explorer**: https://sepolia.basescan.org
4. Switch to Base Sepolia network

### 3. Get Testnet Tokens

You'll need:
- **Base Sepolia ETH** (for gas): https://www.alchemy.com/faucets/base-sepolia
- **Testnet USDC** (for betting): https://faucet.circle.com/ (select Base Sepolia)

### 4. Start the App

```bash
npm run dev
```

Then open http://localhost:3000 in your browser.

### 5. Test Market Creation

1. **Connect your wallet** (make sure you're on Base Sepolia)
2. Navigate to the **Predictions** section
3. You'll see a new **"Create Weekly Market"** card at the top
4. Click **"Create Weekly Market"** button
5. Approve the transaction in your wallet
6. Wait for confirmation!

### What You'll See

The **CreateAutomatedMarket** component shows:
- ✅ Current number of markets
- ✅ Next resolution time (next Monday 5:00 AM UTC)
- ✅ Simple "Create Weekly Market" button
- ✅ Success/error messages

### Important Notes

- **Only the contract owner can create markets** - Make sure you're using the wallet that deployed the contract (`0x1fde40a4046eda0ca0539dd6c77abf8933b94260`)
- If you get an error, it might be because:
  - You're not the contract owner
  - You're on the wrong network
  - The contract isn't deployed on that network

### Troubleshooting

**"Contract not deployed on this network"**
- Make sure `NEXT_PUBLIC_USE_TESTNET=true` is set
- Make sure your wallet is on Base Sepolia
- Restart the dev server after changing env variables

**"Failed to create market"**
- Check that you're using the owner wallet
- Verify you have ETH for gas
- Check the browser console for detailed error messages

**Transaction fails**
- Make sure you have Base Sepolia ETH for gas
- Check that the contract address is correct in `lib/contracts/automated-prediction-market.ts`

### Next Steps After Creating a Market

1. **Place bets** - Users can bet on which track will be #1
2. **Monitor resolution** - Market resolves automatically on Monday 5:00 AM UTC
3. **Claim winnings** - Winners can claim their share after resolution

### Switch Back to Mainnet

When ready for production:
1. Remove or set `NEXT_PUBLIC_USE_TESTNET=false` in `.env.local`
2. Deploy contract to Base Mainnet
3. Update contract address in `lib/contracts/automated-prediction-market.ts`
4. Restart the dev server
