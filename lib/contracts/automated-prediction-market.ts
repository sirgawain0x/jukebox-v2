import { Address } from "viem";

// SERVER-SAFE FILE - No React hooks or client-side code
// Automated Prediction Market Contract ABI
export const automatedPredictionMarketABI = [
  {
    inputs: [
      { internalType: "uint64", name: "subscriptionId", type: "uint64" },
      { internalType: "address", name: "_usdcAddress", type: "address" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "marketId", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "resolveTime", type: "uint256" },
    ],
    name: "MarketCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "marketId", type: "uint256" },
      { indexed: false, internalType: "address", name: "user", type: "address" },
      { indexed: false, internalType: "string", name: "prediction", type: "string" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "BetPlaced",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "marketId", type: "uint256" },
      { indexed: false, internalType: "string", name: "winningTrack", type: "string" },
      { indexed: false, internalType: "uint256", name: "netPool", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "feesCollected", type: "uint256" },
    ],
    name: "MarketResolved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "marketId", type: "uint256" },
      { indexed: false, internalType: "address", name: "user", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "WinningsClaimed",
    type: "event",
  },
  {
    inputs: [],
    name: "createWeeklyMarket",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getNextMondayEST",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "marketId", type: "uint256" },
      { internalType: "string", name: "predictedTrack", type: "string" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "placeBet",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes", name: "", type: "bytes" }],
    name: "checkUpkeep",
    outputs: [
      { internalType: "bool", name: "upkeepNeeded", type: "bool" },
      { internalType: "bytes", name: "performData", type: "bytes" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes", name: "performData", type: "bytes" }],
    name: "performUpkeep",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "marketId", type: "uint256" }],
    name: "claimWinnings",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "withdrawFees",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "markets",
    outputs: [
      { internalType: "uint256", name: "id", type: "uint256" },
      { internalType: "uint256", name: "endTime", type: "uint256" },
      { internalType: "uint256", name: "resolveTime", type: "uint256" },
      { internalType: "bool", name: "resolved", type: "bool" },
      { internalType: "string", name: "winningTrack", type: "string" },
      { internalType: "uint256", name: "totalPool", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "marketId", type: "uint256" }],
    name: "getMarketBets",
    outputs: [
      {
        components: [
          { internalType: "address", name: "user", type: "address" },
          { internalType: "string", name: "predictedTrack", type: "string" },
          { internalType: "uint256", name: "amount", type: "uint256" },
          { internalType: "bool", name: "claimed", type: "bool" },
        ],
        internalType: "struct AutomatedPredictionMarket.Bet[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "s_marketCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "protocolFeeBasisPoints",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "accumulatedFees",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "usdcToken",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Contract addresses by chain
const AUTOMATED_PREDICTION_MARKET_ADDRESSES = {
  // Base Sepolia (Testnet) - Deployed: 0xbB22f1b5BF17e2eAD9aA1a012b8dA9A980797855
  84532: "0xbB22f1b5BF17e2eAD9aA1a012b8dA9A980797855" as Address,
  // Base Mainnet (Production) - Update after deployment: forge script script/DeployAutomatedPredictionMarket.s.sol --rpc-url $BASE_MAINNET_RPC_URL --broadcast
  8453: "0x18DCbC44e1C4bFaBEa0B62A5C9449ad59798a049" as Address,
} as const;

/**
 * Check if automated prediction market contract is deployed on a chain
 */
export function isAutomatedPredictionMarketDeployed(chainId: number): boolean {
  const address =
    AUTOMATED_PREDICTION_MARKET_ADDRESSES[chainId as keyof typeof AUTOMATED_PREDICTION_MARKET_ADDRESSES];
  return !!address;
}

/**
 * Get automated prediction market contract address for current chain (optional, returns null if not deployed)
 * This is a client-safe function that returns null instead of throwing
 */
export function tryGetAutomatedPredictionMarketAddress(chainId: number): Address | null {
  const address =
    AUTOMATED_PREDICTION_MARKET_ADDRESSES[chainId as keyof typeof AUTOMATED_PREDICTION_MARKET_ADDRESSES];
  if (!address) {
    return null;
  }
  return address;
}

/**
 * Get automated prediction market contract address for current chain
 * This is a server-safe function that can be used in API routes
 * Throws an error if contract is not deployed
 */
export function getAutomatedPredictionMarketAddress(chainId: number): Address {
  const address = tryGetAutomatedPredictionMarketAddress(chainId);
  if (!address) {
    throw new Error(
      `Automated prediction market contract not deployed on chain ${chainId}. Please deploy the contract first.`
    );
  }
  return address;
}
