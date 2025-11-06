import { Address } from "viem";

// USDC contract addresses by chain
export const USDC_ADDRESSES = {
  // Base Mainnet
  8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const,
  // Base Sepolia Testnet
  84532: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const,
} as const;

// Standard ERC20 ABI for USDC
export const erc20ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [
      { name: "_owner", type: "address" },
      { name: "_spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "_from", type: "address" },
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "transferFrom",
    outputs: [{ name: "", type: "bool" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    type: "function",
  },
] as const;

/**
 * Get USDC contract address for a given chain ID
 */
export function getUSDCAddress(chainId: number): Address {
  const address = USDC_ADDRESSES[chainId as keyof typeof USDC_ADDRESSES];
  if (!address) {
    throw new Error(
      `USDC not available on chain ${chainId}. Supported chains: Base Mainnet (8453), Base Sepolia (84532)`
    );
  }
  return address;
}

/**
 * Format USDC amount from wei (6 decimals) to human-readable string
 */
export function formatUSDC(amount: bigint, decimals: number = 6): string {
  const divisor = BigInt(10 ** decimals);
  const whole = amount / divisor;
  const remainder = amount % divisor;
  
  if (remainder === BigInt(0)) {
    return whole.toString();
  }
  
  const remainderStr = remainder.toString().padStart(decimals, "0");
  const trimmed = remainderStr.replace(/0+$/, "");
  return `${whole}.${trimmed}`;
}

/**
 * Parse USDC amount from string to wei (6 decimals)
 */
export function parseUSDC(amount: string, decimals: number = 6): bigint {
  const parts = amount.split(".");
  const whole = parts[0] || "0";
  const fractional = parts[1]?.padEnd(decimals, "0").slice(0, decimals) || "0".repeat(decimals);
  
  const wholeBig = BigInt(whole) * BigInt(10 ** decimals);
  const fractionalBig = BigInt(fractional);
  
  return wholeBig + fractionalBig;
}

