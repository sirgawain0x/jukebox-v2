"use client";

import { Address, encodeFunctionData } from "viem";
import {
  useReadContract,
  useWriteContract,
  useSimulateContract,
  useChainId,
  usePublicClient,
  useSendCalls,
} from "wagmi";
import { Attribution } from "ox/erc8021";

import { useAccount } from "wagmi";
import {
  automatedPredictionMarketABI,
  tryGetAutomatedPredictionMarketAddress,
} from "./automated-prediction-market";

/**
 * Hook to get contract owner
 */
export function useGetContractOwner() {
  const chainId = useChainId();
  const contractAddress = tryGetAutomatedPredictionMarketAddress(chainId);

  const result = useReadContract({
    abi: automatedPredictionMarketABI,
    address: contractAddress || undefined,
    functionName: "owner",
    args: [],
    query: {
      enabled: !!contractAddress,
    },
  });



  return result;
}

/**
 * Hook to create a new weekly market (owner only)
 */
export function useCreateWeeklyMarket() {
  const chainId = useChainId();
  const { address: connectedAddress } = useAccount();
  const contractAddress = tryGetAutomatedPredictionMarketAddress(chainId);



  // Use simulateContract to catch errors early
  const {
    data: simulateData,
    isError: isSimulateError,
    error: simulateError,
    isFetching: isSimulating,
  } = useSimulateContract({
    abi: automatedPredictionMarketABI,
    address: contractAddress || undefined,
    functionName: "createWeeklyMarket",
    args: [],
    query: {
      enabled: !!contractAddress && !!connectedAddress,
    },
  });



  const { writeContract, ...rest } = useWriteContract();


  const createWeeklyMarket = () => {
    if (!contractAddress) {

      throw new Error(`Automated prediction market contract not deployed on chain ${chainId}`);
    }
    if (isSimulateError) {

      throw new Error(simulateError?.message || "Cannot create market. You may not be the contract owner.");
    }
    if (!simulateData?.request) {

      throw new Error("Transaction simulation not ready. Please wait and try again.");
    }

    writeContract(simulateData.request);

  };


  return {
    createWeeklyMarket,
    isSimulateError,
    simulateError,
    isSimulating,
    ...rest
  };
}

/**
 * Hook to place a bet on a market with a track title
 * This hook handles the two-step process: approve USDC, then place bet
 */
/**
 * Hook to place a bet on a market with a track title
 * This hook handles the two-step process: approve USDC, then place bet
 * Updated to use wallet_sendCalls for batching and builder code attribution
 */
export function usePlaceBetAutomated() {
  const chainId = useChainId();
  const publicClient = usePublicClient();

  const {
    sendCallsAsync, // Use Async version
    data: callId,
    isPending,
    isError,
    error,
    isSuccess
  } = useSendCalls();

  const placeBet = async (marketId: bigint, trackTitle: string, amount: bigint) => {
    const contractAddress = tryGetAutomatedPredictionMarketAddress(chainId);
    if (!contractAddress) {
      throw new Error(`Automated prediction market contract not deployed on chain ${chainId}`);
    }

    if (!publicClient) {
      throw new Error("Public client not available");
    }

    // Get USDC address from contract
    const usdcAddress = (await publicClient.readContract({
      abi: automatedPredictionMarketABI,
      address: contractAddress,
      functionName: "usdcToken",
      args: [],
    })) as Address;

    // Encode Approve Data
    const approveData = encodeFunctionData({
      abi: [
        {
          inputs: [
            { internalType: "address", name: "spender", type: "address" },
            { internalType: "uint256", name: "amount", type: "uint256" },
          ],
          name: "approve",
          outputs: [{ internalType: "bool", name: "", type: "bool" }],
          stateMutability: "nonpayable",
          type: "function",
        },
      ],
      functionName: "approve",
      args: [contractAddress, amount],
    });

    // Encode PlaceBet Data
    const placeBetData = encodeFunctionData({
      abi: automatedPredictionMarketABI,
      functionName: "placeBet",
      args: [marketId, trackTitle, amount],
    });

    const builderCode = process.env.NEXT_PUBLIC_BASE_BUILDER_CODE as string;

    // Send batched calls
    await sendCallsAsync({
      calls: [
        {
          to: usdcAddress,
          data: approveData,
          value: BigInt(0),
        },
        {
          to: contractAddress,
          data: placeBetData,
          value: BigInt(0),
        },
      ],
      capabilities: {
        dataSuffix: Attribution.toDataSuffix({
          codes: [builderCode],
        }),
      },
    });
  };

  return {
    placeBet,
    approveHash: callId, // Using callId as hash proxy
    betHash: callId,
    isApprovingPending: isPending,
    isBetPending: isPending,
    isWaitingForApprove: false, // Batched, no waiting state needed
    isApproveError: isError,
    isBetError: isError,
    approveError: error,
    betError: error,
    isBetSuccess: isSuccess,
  };
}

/**
 * Hook to get market data
 */
export function useGetMarket(marketId: bigint | null) {
  const chainId = useChainId();
  const contractAddress = tryGetAutomatedPredictionMarketAddress(chainId);

  const result = useReadContract({
    abi: automatedPredictionMarketABI,
    address: contractAddress || undefined,
    functionName: "markets",
    args: marketId !== null ? [marketId] : undefined,
    query: {
      enabled: !!contractAddress && marketId !== null,
    },
  });



  return result;
}

/**
 * Hook to get market count
 */
export function useGetMarketCount() {
  const chainId = useChainId();
  const contractAddress = tryGetAutomatedPredictionMarketAddress(chainId);

  const result = useReadContract({
    abi: automatedPredictionMarketABI,
    address: contractAddress || undefined,
    functionName: "s_marketCount",
    args: [],
    query: {
      enabled: !!contractAddress,
    },
  });



  return result;
}



/**
 * Hook to claim winnings
 */
export function useClaimWinnings() {
  const { writeContract, ...rest } = useWriteContract();
  const chainId = useChainId();

  const claimWinnings = (marketId: bigint) => {
    const contractAddress = tryGetAutomatedPredictionMarketAddress(chainId);
    if (!contractAddress) {
      throw new Error(`Automated prediction market contract not deployed on chain ${chainId}`);
    }
    writeContract({
      abi: automatedPredictionMarketABI,
      address: contractAddress,
      functionName: "claimWinnings",
      args: [marketId],
    });
  };

  return { claimWinnings, ...rest };
}

/**
 * Hook to get next Monday EST time
 */
export function useGetNextMondayEST() {
  const chainId = useChainId();
  const contractAddress = tryGetAutomatedPredictionMarketAddress(chainId);

  return useReadContract({
    abi: automatedPredictionMarketABI,
    address: contractAddress || undefined,
    functionName: "getNextMondayEST",
    args: [],
    query: {
      enabled: !!contractAddress,
    },
  });
}

/**
 * Hook to check if contract is paused
 */
export function useIsPaused() {
  const chainId = useChainId();
  const contractAddress = tryGetAutomatedPredictionMarketAddress(chainId);

  return useReadContract({
    abi: automatedPredictionMarketABI,
    address: contractAddress || undefined,
    functionName: "paused",
    args: [],
    query: {
      enabled: !!contractAddress,
    },
  });
}

/**
 * Hook to get maximum bet amount
 */
export function useGetMaxBetAmount() {
  const chainId = useChainId();
  const contractAddress = tryGetAutomatedPredictionMarketAddress(chainId);

  return useReadContract({
    abi: automatedPredictionMarketABI,
    address: contractAddress || undefined,
    functionName: "maxBetAmount",
    args: [],
    query: {
      enabled: !!contractAddress,
    },
  });
}

/**
 * Hook to get minimum market duration
 */
export function useGetMinMarketDuration() {
  const chainId = useChainId();
  const contractAddress = tryGetAutomatedPredictionMarketAddress(chainId);

  return useReadContract({
    abi: automatedPredictionMarketABI,
    address: contractAddress || undefined,
    functionName: "minMarketDuration",
    args: [],
    query: {
      enabled: !!contractAddress,
    },
  });
}

/**
 * Hook to pause/unpause contract (owner only)
 */
export function usePauseContract() {
  const { writeContract, ...rest } = useWriteContract();
  const chainId = useChainId();

  const pause = () => {
    const contractAddress = tryGetAutomatedPredictionMarketAddress(chainId);
    if (!contractAddress) {
      throw new Error(`Contract not deployed on chain ${chainId}`);
    }
    writeContract({
      abi: automatedPredictionMarketABI,
      address: contractAddress,
      functionName: "pause",
      args: [],
    });
  };

  const unpause = () => {
    const contractAddress = tryGetAutomatedPredictionMarketAddress(chainId);
    if (!contractAddress) {
      throw new Error(`Contract not deployed on chain ${chainId}`);
    }
    writeContract({
      abi: automatedPredictionMarketABI,
      address: contractAddress,
      functionName: "unpause",
      args: [],
    });
  };

  return { pause, unpause, ...rest };
}

/**
 * Hook to set max bet amount (owner only)
 */
export function useSetMaxBetAmount() {
  const { writeContract, ...rest } = useWriteContract();
  const chainId = useChainId();

  const setMaxBetAmount = (maxBetAmount: bigint) => {
    const contractAddress = tryGetAutomatedPredictionMarketAddress(chainId);
    if (!contractAddress) {
      throw new Error(`Contract not deployed on chain ${chainId}`);
    }
    writeContract({
      abi: automatedPredictionMarketABI,
      address: contractAddress,
      functionName: "setMaxBetAmount",
      args: [maxBetAmount],
    });
  };

  return { setMaxBetAmount, ...rest };
}

/**
 * Hook to set min market duration (owner only)
 */
export function useSetMinMarketDuration() {
  const { writeContract, ...rest } = useWriteContract();
  const chainId = useChainId();

  const setMinMarketDuration = (minDuration: bigint) => {
    const contractAddress = tryGetAutomatedPredictionMarketAddress(chainId);
    if (!contractAddress) {
      throw new Error(`Contract not deployed on chain ${chainId}`);
    }
    writeContract({
      abi: automatedPredictionMarketABI,
      address: contractAddress,
      functionName: "setMinMarketDuration",
      args: [minDuration],
    });
  };

  return { setMinMarketDuration, ...rest };
}
