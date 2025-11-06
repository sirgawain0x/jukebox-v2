"use client";

import { Address } from "viem";
import { useReadContract, useWriteContract, useChainId, usePublicClient, useWaitForTransactionReceipt } from "wagmi";
import { useRef, useEffect } from "react";
import { predictionMarketABI, tryGetPredictionMarketAddress, isPredictionMarketDeployed } from "./prediction-market";

/**
 * Hook to create a new prediction market
 */
export function useCreateMarket() {
  const { writeContract, ...rest } = useWriteContract();
  const chainId = useChainId();

  const createMarket = (songId: string, endTime: bigint, maxBetAmount: bigint = 0n) => {
    const contractAddress = tryGetPredictionMarketAddress(chainId);
    if (!contractAddress) {
      throw new Error(`Prediction market contract not deployed on chain ${chainId}`);
    }
    writeContract({
      abi: predictionMarketABI,
      address: contractAddress,
      functionName: "createMarket",
      args: [songId, endTime, maxBetAmount],
    });
  };

  return { createMarket, ...rest };
}

/**
 * Hook to place a bet on a market
 * This hook handles the two-step process: approve USDC, then place bet
 */
export function usePlaceBet() {
  const chainId = useChainId();
  const publicClient = usePublicClient();
  
  // Separate hooks for approve and placeBet transactions
  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: isApprovingPending,
    isError: isApproveError,
    error: approveError,
  } = useWriteContract();

  const {
    writeContract: writePlaceBet,
    data: betHash,
    isPending: isBetPending,
    isError: isBetError,
    error: betError,
    isSuccess: isBetSuccess,
  } = useWriteContract();

  // Wait for approve transaction to be confirmed on-chain
  const {
    isLoading: isWaitingForApprove,
    isSuccess: isApproveConfirmed,
    isError: isApproveFailed,
  } = useWaitForTransactionReceipt({
    hash: approveHash,
    query: {
      enabled: !!approveHash,
    },
  });

  // Use refs to track latest values for use in async promises
  const approveHashRef = useRef(approveHash);
  const isApproveErrorRef = useRef(isApproveError);
  const approveErrorRef = useRef(approveError);
  const isApproveConfirmedRef = useRef(isApproveConfirmed);
  const isApproveFailedRef = useRef(isApproveFailed);
  const betHashRef = useRef(betHash);
  const isBetErrorRef = useRef(isBetError);
  const betErrorRef = useRef(betError);

  // Update refs when values change
  useEffect(() => {
    approveHashRef.current = approveHash;
  }, [approveHash]);
  useEffect(() => {
    isApproveErrorRef.current = isApproveError;
  }, [isApproveError]);
  useEffect(() => {
    approveErrorRef.current = approveError;
  }, [approveError]);
  useEffect(() => {
    isApproveConfirmedRef.current = isApproveConfirmed;
  }, [isApproveConfirmed]);
  useEffect(() => {
    isApproveFailedRef.current = isApproveFailed;
  }, [isApproveFailed]);
  useEffect(() => {
    betHashRef.current = betHash;
  }, [betHash]);
  useEffect(() => {
    isBetErrorRef.current = isBetError;
  }, [isBetError]);
  useEffect(() => {
    betErrorRef.current = betError;
  }, [betError]);

  const placeBet = async (
    marketId: bigint,
    amount: bigint,
    side: boolean,
    _userAddress: Address
  ) => {
    const contractAddress = tryGetPredictionMarketAddress(chainId);
    if (!contractAddress) {
      throw new Error(`Prediction market contract not deployed on chain ${chainId}`);
    }
    const { getUSDCAddress, erc20ABI } = await import("../usdc-utils");
    const usdcAddress = getUSDCAddress(chainId);

    // Step 1: Initiate approve transaction
    writeApprove({
      abi: erc20ABI,
      address: usdcAddress,
      functionName: "approve",
      args: [contractAddress, amount],
    });

    // Step 2: Wait for approve transaction hash to be available
    // Create a promise that resolves when the hash is available or rejects on error
    // Use refs to access latest values inside the closure
    const approveHashPromise = new Promise<`0x${string}`>((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds max to get hash
      
      const checkInterval = setInterval(() => {
        attempts++;
        
        // Check for error first (using ref to get latest value)
        if (isApproveErrorRef.current) {
          clearInterval(checkInterval);
          reject(new Error(
            `Approve transaction failed: ${approveErrorRef.current?.message || "Unknown error"}`
          ));
          return;
        }
        
        // Check if hash is available (using ref to get latest value)
        const currentHash = approveHashRef.current;
        if (currentHash) {
          clearInterval(checkInterval);
          resolve(currentHash);
          return;
        }
        
        // Timeout after max attempts
        if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          reject(new Error("Approve transaction timeout - hash not received"));
        }
      }, 1000);
    });

    const currentApproveHash = await approveHashPromise;

    // Step 3: Wait for approve transaction to be confirmed on-chain
    if (publicClient) {
      try {
        await publicClient.waitForTransactionReceipt({
          hash: currentApproveHash,
          timeout: 60000, // 60 second timeout
        });
      } catch (error) {
        throw new Error(
          `Approve transaction confirmation failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    } else {
      // Fallback: wait for confirmation using hook state (via refs)
      await new Promise<void>((resolve, reject) => {
        let confirmAttempts = 0;
        const maxConfirmAttempts = 60; // 60 seconds max wait
        
        const confirmInterval = setInterval(() => {
          confirmAttempts++;
          
          // Use refs to get latest values
          if (isApproveConfirmedRef.current) {
            clearInterval(confirmInterval);
            resolve();
            return;
          }
          
          const failed = isApproveFailedRef.current;
          if (failed || confirmAttempts >= maxConfirmAttempts) {
            clearInterval(confirmInterval);
            reject(new Error(
              `Approve transaction ${failed ? "failed" : "timed out"}`
            ));
          }
        }, 1000);
      });
    }

    // Step 4: Now that approve is confirmed, place the bet
    writePlaceBet({
      abi: predictionMarketABI,
      address: contractAddress,
      functionName: "placeBet",
      args: [marketId, amount, side],
    });

    // Step 5: Wait for bet transaction hash to be available
    const betHashPromise = new Promise<`0x${string}`>((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds max to get hash
      
      const checkInterval = setInterval(() => {
        attempts++;
        
        // Check for error first (using ref to get latest value)
        if (isBetErrorRef.current) {
          clearInterval(checkInterval);
          reject(new Error(
            `Place bet transaction failed: ${betErrorRef.current?.message || "Unknown error"}`
          ));
          return;
        }
        
        // Check if hash is available (using ref to get latest value)
        const currentHash = betHashRef.current;
        if (currentHash) {
          clearInterval(checkInterval);
          resolve(currentHash);
          return;
        }
        
        // Timeout after max attempts
        if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          reject(new Error("Place bet transaction timeout - hash not received"));
        }
      }, 1000);
    });

    const currentBetHash = await betHashPromise;
    return currentBetHash;
  };

  return {
    placeBet,
    approveHash,
    betHash,
    isApproving: isApprovingPending || isWaitingForApprove,
    isApproveConfirmed,
    isApproveError,
    approveError,
    isBetPending,
    isBetError,
    betError,
    isBetSuccess,
  };
}

/**
 * Hook to resolve a market
 */
export function useResolveMarket() {
  const { writeContract, ...rest } = useWriteContract();
  const chainId = useChainId();

  const resolveMarket = (marketId: bigint, winner: boolean) => {
    const contractAddress = tryGetPredictionMarketAddress(chainId);
    if (!contractAddress) {
      throw new Error(`Prediction market contract not deployed on chain ${chainId}`);
    }
    writeContract({
      abi: predictionMarketABI,
      address: contractAddress,
      functionName: "resolveMarket",
      args: [marketId, winner],
    });
  };

  return { resolveMarket, ...rest };
}

/**
 * Hook to claim winnings
 */
export function useClaimWinnings() {
  const { writeContract, ...rest } = useWriteContract();
  const chainId = useChainId();

  const claimWinnings = (marketId: bigint) => {
    const contractAddress = tryGetPredictionMarketAddress(chainId);
    if (!contractAddress) {
      throw new Error(`Prediction market contract not deployed on chain ${chainId}`);
    }
    writeContract({
      abi: predictionMarketABI,
      address: contractAddress,
      functionName: "claimWinnings",
      args: [marketId],
    });
  };

  return { claimWinnings, ...rest };
}

/**
 * Hook to get market data
 */
export function useGetMarket(marketId?: bigint) {
  const chainId = useChainId();

  return useReadContract({
    address: marketId ? tryGetPredictionMarketAddress(chainId) || undefined : undefined,
    abi: predictionMarketABI,
    functionName: "markets",
    args: marketId ? [marketId] : undefined,
    query: {
      enabled: typeof marketId !== "undefined" && isPredictionMarketDeployed(chainId),
    },
  });
}

/**
 * Hook to get user's bets for a market
 */
export function useGetUserBets(marketId?: bigint, userAddress?: Address) {
  const chainId = useChainId();

  return useReadContract({
    address:
      marketId && userAddress ? tryGetPredictionMarketAddress(chainId) || undefined : undefined,
    abi: predictionMarketABI,
    functionName: "userBets",
    args: marketId && userAddress ? [marketId, userAddress] : undefined,
    query: {
      enabled: typeof marketId !== "undefined" && typeof userAddress !== "undefined" && isPredictionMarketDeployed(chainId),
    },
  });
}

/**
 * Hook to get total market count
 */
export function useGetMarketCount() {
  const chainId = useChainId();
  const contractAddress = tryGetPredictionMarketAddress(chainId);

  return useReadContract({
    address: contractAddress || undefined,
    abi: predictionMarketABI,
    functionName: "marketCount",
    query: {
      enabled: isPredictionMarketDeployed(chainId),
    },
  });
}

