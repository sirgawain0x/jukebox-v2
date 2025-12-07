# Base Pay UserOperation Failure - Fix Guide

## Problem

UserOperations are failing when using Base Pay (`@base-org/account`). Base Pay uses Account Abstraction (ERC-4337) which requires UserOperations to execute payments.

## Root Causes

UserOperation failures typically occur due to:

1. **Missing Account Provider Setup** - Base Pay needs access to an account provider that supports Account Abstraction
2. **Wallet Compatibility** - The connected wallet must support Account Abstraction (smart wallets like Coinbase Smart Wallet)
3. **Network Configuration** - Incorrect testnet/mainnet configuration
4. **Gas Estimation Issues** - UserOperations require proper gas estimation
5. **Missing Error Handling** - UserOperation-specific errors aren't being caught properly

## Solution

### 1. Ensure Wallet Supports Account Abstraction

Base Pay works best with:
- ✅ **Coinbase Smart Wallet** (recommended) - Full account abstraction support
- ✅ **OnchainKit embedded wallets** - Automatic account abstraction
- ❌ **MetaMask** - Requires additional setup for account abstraction

### 2. Update Base Pay Implementation

The current implementation needs better error handling and wallet compatibility checks:

```typescript
// Enhanced error handling for UserOperation failures
const handleGenerateImage = useCallback(async () => {
  if (!imagePrompt.trim()) return;

  if (!isConnected || !address) {
    setImageGenerationError("Please connect your wallet first");
    return;
  }

  // Validate network before proceeding
  if (!chainId) {
    setImageGenerationError("Please connect to a supported network");
    return;
  }

  try {
    getContractAddresses(chainId);
  } catch {
    setImageGenerationError("Unsupported network. Please switch to Base mainnet or Base Sepolia.");
    return;
  }

  setLoadingImage(true);
  setImageGenerationError(null);
  setPaymentStatus("Initiating payment...");

  // Determine if we're on testnet based on chainId
  const isTestnet = chainId === 84532; // Base Sepolia

  try {
    // Use Base Pay to handle the payment
    // Base Pay automatically detects connected wallet and uses account abstraction
    const payment = await pay({
      amount: '0.25', // $0.25 USDC
      to: PAYMENT_RECIPIENT,
      testnet: isTestnet,
    });

    console.log("Payment initiated:", payment.id);
    setPaymentStatus("Payment processing...");

    // Poll for payment status with better error handling
    let paymentComplete = false;
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max

    while (!paymentComplete && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      
      const status = await getPaymentStatus({
        id: payment.id,
        testnet: isTestnet
      });
      console.log("Payment status:", status);

      if (status.status === 'completed') {
        paymentComplete = true;
        setPaymentStatus("Payment successful! Generating image...");

        // Call the API to generate the image
        const response = await fetch("/api/gemini/text-to-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            prompt: imagePrompt,
            paymentId: payment.id
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.imageUrl) {
            setCoverImage(data.imageUrl);
            setImageLoadError(false);
            setImageLoading(true);
            setPaymentStatus("Image generated successfully!");
            showToast("Image generated successfully with Gemini AI!");
            setTimeout(() => setPaymentStatus(""), 3000);
            setImageGenerationCount(prev => prev + 1);
            setAiAccessUnlocked(false);
          } else {
            throw new Error(data.error || "Failed to generate image");
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to generate image");
        }
      } else if (status.status === 'failed') {
        // Enhanced error handling for UserOperation failures
        const errorReason = status.reason || "Payment failed";
        console.error("Payment failed:", {
          paymentId: payment.id,
          reason: errorReason,
          status: status,
        });
        throw new Error(`Payment failed: ${errorReason}. Please try again with a wallet that supports account abstraction.`);
      }

      attempts++;
    }

    if (!paymentComplete) {
      throw new Error("Payment timeout - please try again");
    }

  } catch (error) {
    console.error("Payment or image generation error:", error);
    
    // Enhanced error handling for UserOperation-specific errors
    let errorMessage = "Failed to process payment or generate image";
    
    if (error instanceof Error) {
      const errorMsg = error.message.toLowerCase();
      
      // UserOperation-specific error patterns
      if (errorMsg.includes('useroperation') || errorMsg.includes('user operation')) {
        errorMessage = "Account abstraction error. Please ensure you're using a smart wallet (like Coinbase Smart Wallet) that supports account abstraction.";
      } else if (errorMsg.includes('gas') || errorMsg.includes('insufficient')) {
        errorMessage = "Insufficient funds or gas error. Please ensure you have enough balance.";
      } else if (errorMsg.includes('signature') || errorMsg.includes('sign')) {
        errorMessage = "Signature error. Please try connecting your wallet again.";
      } else if (errorMsg.includes('network') || errorMsg.includes('chain')) {
        errorMessage = "Network error. Please check your network connection and try again.";
      } else if (errorMsg.includes('timeout')) {
        errorMessage = "Payment timeout. The transaction is taking longer than expected. Please check your wallet and try again.";
      } else {
        errorMessage = error.message;
      }
    }
    
    setImageGenerationError(errorMessage);
  } finally {
    setLoadingImage(false);
    setPaymentStatus("");
  }
}, [imagePrompt, isConnected, address, chainId, showToast]);
```

### 3. Check Wallet Compatibility

Add a helper to check if the wallet supports account abstraction:

```typescript
// Helper to check if wallet supports account abstraction
const checkWalletCompatibility = useCallback(() => {
  // Coinbase Smart Wallet and OnchainKit wallets support account abstraction
  // Check if we're using a compatible wallet
  const connectorName = connector?.name?.toLowerCase() || '';
  
  const compatibleWallets = [
    'coinbase wallet',
    'coinbase smart wallet',
    'coinbase',
    'onchainkit',
  ];
  
  return compatibleWallets.some(name => connectorName.includes(name));
}, [connector]);
```

### 4. Common UserOperation Error Codes

Base Pay UserOperations can fail with these specific errors:

| Error | Cause | Solution |
|-------|-------|----------|
| `AA21` | Didn't pay prefund | Ensure wallet has sufficient balance |
| `AA22` | Not enough stake | Wallet needs to stake ETH for account abstraction |
| `AA23` | Unstake delay not passed | Wait for unstake delay to pass |
| `AA24` | Signature validation failed | Reconnect wallet or check signature |
| `AA25` | Invalid signature format | Ensure wallet is compatible |
| `AA31` | Paymaster deposit too low | Paymaster issue (Base Pay handles this) |
| `AA32` | Unsupported paymaster mode | Paymaster configuration issue |
| `AA33` | Rejected by paymaster | Paymaster rejected the operation |

### 5. Testing Checklist

Before testing Base Pay:

- [ ] Wallet is connected (Coinbase Smart Wallet recommended)
- [ ] Connected to Base Mainnet (8453) or Base Sepolia (84532)
- [ ] Wallet has sufficient balance for payment + gas
- [ ] Network connection is stable
- [ ] Browser console shows no errors before payment

### 6. Debugging UserOperation Failures

Add detailed logging:

```typescript
try {
  const payment = await pay({
    amount: '0.25',
    to: PAYMENT_RECIPIENT,
    testnet: isTestnet,
  });
  
  console.log("Payment UserOperation details:", {
    paymentId: payment.id,
    walletAddress: address,
    chainId: chainId,
    isTestnet: isTestnet,
    recipient: PAYMENT_RECIPIENT,
  });
} catch (error) {
  console.error("UserOperation creation failed:", {
    error: error,
    errorMessage: error instanceof Error ? error.message : String(error),
    errorStack: error instanceof Error ? error.stack : undefined,
    walletAddress: address,
    chainId: chainId,
    connector: connector?.name,
  });
  throw error;
}
```

## Recommended Wallet Setup

For best results with Base Pay:

1. **Use Coinbase Smart Wallet** - Best compatibility with Base Pay
2. **Or use OnchainKit embedded wallets** - Automatic account abstraction
3. **Ensure wallet is connected before calling pay()**

## Environment Variables

Ensure these are set:

```env
NEXT_PUBLIC_WALLET_ADDRESS=0x1Fde40a4046Eda0cA0539Dd6c77ABF8933B94260
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_onchainkit_api_key
NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME=Jukebox
```

## Summary

The main fixes needed:

1. ✅ **Better error handling** - Catch UserOperation-specific errors
2. ✅ **Wallet compatibility checks** - Ensure wallet supports account abstraction
3. ✅ **Clear error messages** - Help users understand what went wrong
4. ✅ **Detailed logging** - Debug UserOperation creation and execution
5. ✅ **Network validation** - Ensure correct network is selected

## Next Steps

1. Update error handling in `handleGenerateImage` function
2. Add wallet compatibility check
3. Test with Coinbase Smart Wallet
4. Monitor console for UserOperation errors
5. Add retry logic for transient failures

## References

- [Base Pay Documentation](https://docs.base.org/base-account)
- [Account Abstraction on Base](https://docs.base.org/learn/onchain-app-development/account-abstraction)
- [UserOperation Troubleshooting](https://docs.base.org/onchainkit/paymaster/troubleshooting)

