import { Address } from "viem";

// SERVER-SAFE FILE - No React hooks or client-side code
// This file can be safely imported in API routes and server components
// Prediction Market Contract ABI
export const predictionMarketABI = [
  {
    inputs: [
      { internalType: "address", name: "_usdc", type: "address" },
      { internalType: "address", name: "_feeRecipient", type: "address" },
      { internalType: "uint256", name: "_platformFeeBps", type: "uint256" },
      { internalType: "uint256", name: "_timelockDelay", type: "uint256" },
      { internalType: "uint256", name: "_minMarketDuration", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "marketId", type: "uint256" },
      { indexed: false, internalType: "string", name: "songId", type: "string" },
      { indexed: false, internalType: "uint256", name: "endTime", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "maxBetAmount", type: "uint256" },
    ],
    name: "MarketCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "marketId", type: "uint256" },
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: false, internalType: "bool", name: "side", type: "bool" }, // true = YES, false = NO
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "BetPlaced",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "marketId", type: "uint256" },
      { indexed: false, internalType: "bool", name: "winner", type: "bool" }, // true = YES won, false = NO won
      { indexed: false, internalType: "uint256", name: "totalPayout", type: "uint256" },
    ],
    name: "MarketResolved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "marketId", type: "uint256" },
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "WinningsClaimed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "marketId", type: "uint256" },
      { indexed: false, internalType: "bool", name: "winner", type: "bool" },
      { indexed: false, internalType: "uint256", name: "executeTime", type: "uint256" },
    ],
    name: "ResolutionScheduled",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint256", name: "oldDelay", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "newDelay", type: "uint256" },
    ],
    name: "TimelockDelayUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "marketId", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "oldAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "newAmount", type: "uint256" },
    ],
    name: "MaxBetAmountUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint256", name: "oldDuration", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "newDuration", type: "uint256" },
    ],
    name: "MinMarketDurationUpdated",
    type: "event",
  },
  {
    inputs: [
      { internalType: "string", name: "songId", type: "string" },
      { internalType: "uint256", name: "endTime", type: "uint256" },
      { internalType: "uint256", name: "maxBetAmount", type: "uint256" },
    ],
    name: "createMarket",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "marketId", type: "uint256" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "bool", name: "side", type: "bool" }, // true = YES, false = NO
    ],
    name: "placeBet",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "marketId", type: "uint256" },
      { internalType: "bool", name: "winner", type: "bool" },
    ],
    name: "scheduleResolution",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "marketId", type: "uint256" }],
    name: "executeResolution",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "marketId", type: "uint256" }],
    name: "cancelScheduledResolution",
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
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "markets",
    outputs: [
      { internalType: "string", name: "songId", type: "string" },
      { internalType: "uint256", name: "endTime", type: "uint256" },
      { internalType: "bool", name: "resolved", type: "bool" },
      { internalType: "bool", name: "winner", type: "bool" }, // true = YES won, false = NO won
      { internalType: "uint256", name: "totalPoolYes", type: "uint256" },
      { internalType: "uint256", name: "totalPoolNo", type: "uint256" },
      { internalType: "uint256", name: "maxBetAmount", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "", type: "uint256" },
      { internalType: "address", name: "", type: "address" },
    ],
    name: "userBets",
    outputs: [
      { internalType: "uint256", name: "amountYes", type: "uint256" },
      { internalType: "uint256", name: "amountNo", type: "uint256" },
      { internalType: "bool", name: "claimed", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "scheduledResolutions",
    outputs: [
      { internalType: "bool", name: "exists", type: "bool" },
      { internalType: "bool", name: "winner", type: "bool" },
      { internalType: "uint256", name: "executeTime", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "marketCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "platformFeeBps",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "timelockDelay",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "minMarketDuration",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "marketCreationFee",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_marketCreationFee", type: "uint256" }],
    name: "setMarketCreationFee",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "pause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "unpause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_timelockDelay", type: "uint256" }],
    name: "setTimelockDelay",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_minMarketDuration", type: "uint256" }],
    name: "setMinMarketDuration",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "marketId", type: "uint256" },
      { internalType: "uint256", name: "_maxBetAmount", type: "uint256" },
    ],
    name: "setMaxBetAmount",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_feeRecipient", type: "address" }],
    name: "setFeeRecipient",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_platformFeeBps", type: "uint256" }],
    name: "setPlatformFeeBps",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// Contract addresses by chain (will need to be deployed)
const PREDICTION_MARKET_ADDRESSES = {
  // Base Sepolia (Testnet) - placeholder, needs deployment
  84532: "0xcD2907c2855E198250932A61828F88Ad603F4218" as const,
  // Base Mainnet (Production)
  8453: "0x36a289b1684C0E877890d975848086b7072b0d01" as const,
} as const;

/**
 * Check if prediction market contract is deployed on a chain
 */
export function isPredictionMarketDeployed(chainId: number): boolean {
  const address =
    PREDICTION_MARKET_ADDRESSES[chainId as keyof typeof PREDICTION_MARKET_ADDRESSES];
  return !!address;
}

/**
 * Get prediction market contract address for current chain (optional, returns null if not deployed)
 * This is a client-safe function that returns null instead of throwing
 */
export function tryGetPredictionMarketAddress(chainId: number): Address | null {
  const address =
    PREDICTION_MARKET_ADDRESSES[chainId as keyof typeof PREDICTION_MARKET_ADDRESSES];
  if (!address) {
    return null;
  }
  return address;
}

/**
 * Get prediction market contract address for current chain
 * This is a server-safe function that can be used in API routes
 * Throws an error if contract is not deployed
 */
export function getPredictionMarketAddress(chainId: number): Address {
  const address = tryGetPredictionMarketAddress(chainId);
  if (!address) {
    throw new Error(
      `Prediction market contract not deployed on chain ${chainId}. Please deploy the contract first.`
    );
  }
  return address;
}
