"use client";

import { Address } from "viem";
import {
  useReadContract,
  useWriteContract,
  useSimulateContract,
  useChainId,
  usePublicClient,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useRef, useEffect } from "react";
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
  
  // #region agent log
  // Log contract owner hook state
  useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/7ffccca1-2c82-49dc-9cbc-405674609eea', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'automated-prediction-market-hooks.ts:useGetContractOwner', message: 'Contract owner hook state', data: { chainId, contractAddress, enabled: !!contractAddress, owner: result.data, isLoading: result.isLoading, isError: result.isError, error: result.error?.message }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'pre-fix', hypothesisId: 'C' }) }).catch(() => { });
  }, [chainId, contractAddress, result.data, result.isLoading, result.isError, result.error]);
  // #endregion
  
  return result;
}

/**
 * Hook to create a new weekly market (owner only)
 */
export function useCreateWeeklyMarket() {
  const chainId = useChainId();
  const { address: connectedAddress } = useAccount();
  const contractAddress = tryGetAutomatedPredictionMarketAddress(chainId);

  // #region agent log
  // Log connected address and contract address
  useEffect(() => {
    if (connectedAddress && contractAddress) {
      fetch('http://127.0.0.1:7242/ingest/7ffccca1-2c82-49dc-9cbc-405674609eea', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'automated-prediction-market-hooks.ts:useCreateWeeklyMarket', message: 'Hook initialized', data: { connectedAddress, contractAddress, chainId }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'pre-fix', hypothesisId: 'A' }) }).catch(() => { });
    }
  }, [connectedAddress, contractAddress, chainId]);
  // #endregion

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

  // #region agent log
  // Log simulation results
  useEffect(() => {
    if (isSimulateError && simulateError) {
      fetch('http://127.0.0.1:7242/ingest/7ffccca1-2c82-49dc-9cbc-405674609eea', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'automated-prediction-market-hooks.ts:useCreateWeeklyMarket', message: 'Simulation error', data: { error: simulateError.message, connectedAddress, contractAddress }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'pre-fix', hypothesisId: 'B' }) }).catch(() => { });
    }
    if (simulateData) {
      fetch('http://127.0.0.1:7242/ingest/7ffccca1-2c82-49dc-9cbc-405674609eea', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'automated-prediction-market-hooks.ts:useCreateWeeklyMarket', message: 'Simulation success', data: { connectedAddress, contractAddress }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'pre-fix', hypothesisId: 'B' }) }).catch(() => { });
    }
  }, [isSimulateError, simulateError, simulateData, connectedAddress, contractAddress]);
  // #endregion

  const { writeContract, ...rest } = useWriteContract();

  // #region agent log
  const createWeeklyMarket = () => {
    if (!contractAddress) {
      fetch('http://127.0.0.1:7242/ingest/7ffccca1-2c82-49dc-9cbc-405674609eea', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'automated-prediction-market-hooks.ts:createWeeklyMarket', message: 'Contract not deployed', data: { chainId }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'pre-fix', hypothesisId: 'A' }) }).catch(() => { });
      throw new Error(`Automated prediction market contract not deployed on chain ${chainId}`);
    }
    if (isSimulateError) {
      fetch('http://127.0.0.1:7242/ingest/7ffccca1-2c82-49dc-9cbc-405674609eea', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'automated-prediction-market-hooks.ts:createWeeklyMarket', message: 'Cannot create market - simulation failed', data: { error: simulateError?.message, connectedAddress, contractAddress }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'pre-fix', hypothesisId: 'B' }) }).catch(() => { });
      throw new Error(simulateError?.message || "Cannot create market. You may not be the contract owner.");
    }
    if (!simulateData?.request) {
      fetch('http://127.0.0.1:7242/ingest/7ffccca1-2c82-49dc-9cbc-405674609eea', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'automated-prediction-market-hooks.ts:createWeeklyMarket', message: 'Simulation data not ready', data: { connectedAddress, contractAddress, isSimulating }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'pre-fix', hypothesisId: 'B' }) }).catch(() => { });
      throw new Error("Transaction simulation not ready. Please wait and try again.");
    }
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/7ffccca1-2c82-49dc-9cbc-405674609eea', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'automated-prediction-market-hooks.ts:createWeeklyMarket', message: 'About to call writeContract with simulated request', data: { contractAddress, connectedAddress }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'pre-fix', hypothesisId: 'B' }) }).catch(() => { });
    // #endregion
    writeContract(simulateData.request);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/7ffccca1-2c82-49dc-9cbc-405674609eea', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'automated-prediction-market-hooks.ts:createWeeklyMarket', message: 'writeContract called', data: { contractAddress, connectedAddress }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'pre-fix', hypothesisId: 'B' }) }).catch(() => { });
    // #endregion
  };
  // #endregion

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
export function usePlaceBetAutomated() {
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

    // Step 1: Approve USDC
    writeApprove({
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
      address: usdcAddress,
      functionName: "approve",
      args: [contractAddress, amount],
    });

    // Wait for approve to be confirmed
    return new Promise<void>((resolve, reject) => {
      const checkApprove = () => {
        if (isApproveErrorRef.current) {
          reject(approveErrorRef.current || new Error("Approve failed"));
          return;
        }
        if (isApproveFailedRef.current) {
          reject(new Error("Approve transaction failed"));
          return;
        }
        if (isApproveConfirmedRef.current) {
          // Step 2: Place bet
          writePlaceBet({
            abi: automatedPredictionMarketABI,
            address: contractAddress,
            functionName: "placeBet",
            args: [marketId, trackTitle, amount],
          });
          resolve();
          return;
        }
        // Check again in 100ms
        setTimeout(checkApprove, 100);
      };
      checkApprove();
    });
  };

  return {
    placeBet,
    approveHash,
    betHash,
    isApprovingPending,
    isBetPending,
    isWaitingForApprove,
    isApproveError,
    isBetError,
    approveError,
    betError,
    isBetSuccess,
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
  
  // #region agent log
  // Log market data hook state
  useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/7ffccca1-2c82-49dc-9cbc-405674609eea', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'automated-prediction-market-hooks.ts:useGetMarket', message: 'Market data hook state', data: { chainId, contractAddress, marketId: marketId?.toString(), enabled: !!contractAddress && marketId !== null, isLoading: result.isLoading, isError: result.isError, error: result.error?.message, hasData: !!result.data }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'pre-fix', hypothesisId: 'B' }) }).catch(() => { });
  }, [chainId, contractAddress, marketId, result.isLoading, result.isError, result.error, result.data]);
  // #endregion
  
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
  
  // #region agent log
  // Log market count hook state
  useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/7ffccca1-2c82-49dc-9cbc-405674609eea', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'automated-prediction-market-hooks.ts:useGetMarketCount', message: 'Market count hook state', data: { chainId, contractAddress, enabled: !!contractAddress, data: result.data?.toString(), isLoading: result.isLoading, isError: result.isError, error: result.error?.message }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'pre-fix', hypothesisId: 'A,D' }) }).catch(() => { });
  }, [chainId, contractAddress, result.data, result.isLoading, result.isError, result.error]);
  // #endregion
  
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
