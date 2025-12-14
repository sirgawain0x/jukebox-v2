import { sdk } from "@farcaster/miniapp-sdk";
import { shouldUseFarcasterTransactions, getFarcasterWalletAddress } from "./farcaster-context";

export interface FarcasterTransactionOptions {
  to: string;
  value: string; // in wei
  data?: string;
  gasLimit?: string;
}

export interface FarcasterTransactionResult {
  hash: string;
  success: boolean;
  error?: string;
}

/**
 * Handles transactions in Farcaster miniapp environment
 * Uses the Farcaster SDK for transaction signing and submission
 */
export async function sendFarcasterTransaction(
  options: FarcasterTransactionOptions
): Promise<FarcasterTransactionResult> {
  try {
    // Check if we should use Farcaster transactions
    if (!shouldUseFarcasterTransactions()) {
      throw new Error("Not in Farcaster miniapp environment");
    }

    // Get the user's address from Farcaster context
    const userAddress = getFarcasterWalletAddress();
    if (!userAddress) {
      throw new Error("No Farcaster wallet address available");
    }

    console.log("Sending Farcaster transaction:", options);

    // CHECK FOR CONTRACT INTERACTION (has data)
    // If data is present and not just "0x", this is likely a smart contract call
    const isContractInteraction = options.data && options.data !== "0x";

    // Define minimal Ethereum provider interface to avoid using 'any'
    interface WindowWithEthereum extends Window {
      ethereum?: {
        request: (args: { method: string; params?: Array<unknown> }) => Promise<string>;
      };
    }

    if (isContractInteraction) {
      console.log("Detected contract interaction, attempting to use injected provider...");

      // Try to use the injected Ethereum provider (standard in Farcaster Frames/MiniApps)
      // This is required because sdk.actions.sendToken often ignores 'data' field
      if (typeof window !== 'undefined' && (window as unknown as WindowWithEthereum).ethereum) {
        try {
          const provider = (window as unknown as WindowWithEthereum).ethereum;

          if (!provider) {
            throw new Error("Ethereum provider not found");
          }

          // Request account access if needed (though usually already connected in miniapp)
          // await provider.request({ method: 'eth_requestAccounts' });

          const txHash = await provider.request({
            method: 'eth_sendTransaction',
            params: [{
              from: userAddress,
              to: options.to,
              value: options.value, // Hex string expected by some providers, but generally handles string numbers
              data: options.data,
              gas: options.gasLimit, // 'gas' vs 'gasLimit' depends on provider, best to use 'gas' for EIP-1193
            }],
          });

          console.log("Contract interaction successful, hash:", txHash);
          return {
            hash: txHash,
            success: true,
          };
        } catch (providerError) {
          console.error("Provider transaction failed:", providerError);
          // If provider fails, we might fall through or just throw
          throw new Error(`Provider transaction failed: ${providerError instanceof Error ? providerError.message : String(providerError)}`);
        }
      } else {
        console.warn("No injected provider found for contract interaction. Trying SDK fallback (may fail for contracts)...");
      }
    }

    // FALLBACK / SIMPLE TRANSFER LOGIC using Farcaster SDK
    // This works well for simple ETH transfers (tipping)

    // Verify SDK has transaction capabilities
    if (!sdk || !sdk.actions) {
      throw new Error("Farcaster SDK not properly initialized");
    }

    // Check what methods are available on the SDK
    const availableMethods = Object.keys(sdk.actions || {});
    console.log("Available SDK methods:", availableMethods);

    // Check if any transaction-related methods exist
    const hasTransactionMethod = availableMethods.some(method =>
      method.toLowerCase().includes('transaction') ||
      method.toLowerCase().includes('send') ||
      method.toLowerCase().includes('transfer') ||
      method.toLowerCase().includes('token')
    );

    if (!hasTransactionMethod) {
      throw new Error(`No transaction methods found in Farcaster SDK. Available methods: ${availableMethods.join(', ')}`);
    }

    // Use the correct Farcaster SDK method for sending tokens
    let result;
    try {
      if (typeof sdk.actions.sendToken === 'function') {
        // sendToken is the correct method for sending ETH/tokens in Farcaster
        console.log("Calling sdk.actions.sendToken with:", {
          to: options.to,
          amount: options.value,
          token: 'ETH'
        });

        // Use correct SendTokenOptions format
        result = await sdk.actions.sendToken({
          recipientAddress: options.to,
          amount: options.value, // Amount in wei
          token: 'eip155:1/native', // Native ETH token CAIP-19 format
        });
      } else {
        throw new Error(`No transaction method available in Farcaster SDK. Available methods: ${availableMethods.join(', ')}`);
      }
    } catch (sdkError) {
      console.error("SDK method call failed:", sdkError);
      throw new Error(`Farcaster SDK method failed: ${sdkError instanceof Error ? sdkError.message : 'Unknown error'}`);
    }

    console.log("Transaction result:", result);

    // Handle different response formats from Farcaster SDK
    if (result && typeof result === 'object') {
      // Check for success property
      if ('success' in result) {
        if (result.success) {
          return {
            hash: result.send.transaction,
            success: true,
          };
        } else {
          return {
            hash: "",
            success: false,
            error: result.error?.message || result.reason || "Transaction failed",
          };
        }
      }

      // If we have a result but no clear success indicator, assume success
      return {
        hash: "unknown",
        success: true,
      };
    }

    // If result is undefined or null, the transaction might have failed silently
    return {
      hash: "",
      success: false,
      error: "No response from Farcaster SDK",
    };
  } catch (error) {
    console.error("Farcaster transaction error:", error);
    return {
      hash: "",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Handles multiple transactions in Farcaster miniapp environment
 * Useful for batch operations like tipping + adding to playlist
 */
export async function sendFarcasterBatchTransactions(
  transactions: FarcasterTransactionOptions[]
): Promise<FarcasterTransactionResult[]> {
  try {
    if (!shouldUseFarcasterTransactions()) {
      throw new Error("Not in Farcaster miniapp environment");
    }

    const userAddress = getFarcasterWalletAddress();
    if (!userAddress) {
      throw new Error("No Farcaster wallet address available");
    }

    console.log(`Sending ${transactions.length} Farcaster transactions`);

    // For Farcaster, we might need to handle batch transactions differently
    // Since sendToken might not support batching, we'll send them sequentially
    const results: FarcasterTransactionResult[] = [];

    for (const transaction of transactions) {
      try {
        const result = await sendFarcasterTransaction(transaction);
        results.push(result);

        // If any transaction fails, log it but continue
        if (!result.success) {
          console.warn("Transaction failed:", result.error);
        }

        // Add a small delay between transactions to avoid rate limiting
        if (transactions.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error("Individual transaction error:", error);
        results.push({
          hash: "",
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return results;
  } catch (error) {
    console.error("Farcaster batch transaction error:", error);
    return transactions.map(() => ({
      hash: "",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }));
  }
}

/**
 * Creates a tip transaction for Farcaster environment
 */
export function createFarcasterTipTransaction(
  recipientAddress: string,
  tipAmountWei: string
): FarcasterTransactionOptions {
  return {
    to: recipientAddress,
    value: tipAmountWei,
    data: "0x", // Simple ETH transfer
  };
}

/**
 * Creates a contract interaction transaction for Farcaster environment
 */
export function createFarcasterContractTransaction(
  contractAddress: string,
  functionData: string,
  value: string = "0"
): FarcasterTransactionOptions {
  return {
    to: contractAddress,
    value,
    data: functionData,
    gasLimit: "100000", // Higher gas limit for contract interactions
  };
}

/**
 * Hook to get Farcaster transaction capabilities
 */
export function useFarcasterTransactions() {
  const canUseFarcaster = shouldUseFarcasterTransactions();
  const userAddress = getFarcasterWalletAddress();

  // Additional check for SDK availability
  const sdkAvailable = typeof sdk !== 'undefined' && !!sdk.actions;
  const finalCanUseFarcaster = canUseFarcaster && sdkAvailable;

  return {
    canUseFarcaster: finalCanUseFarcaster,
    userAddress,
    sendTransaction: sendFarcasterTransaction,
    sendBatchTransactions: sendFarcasterBatchTransactions,
    createTipTransaction: createFarcasterTipTransaction,
    createContractTransaction: createFarcasterContractTransaction,
  };
}
