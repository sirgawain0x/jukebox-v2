"use client";
import { Card } from "../ui/Card";
import { Icon } from "../ui/Icon";
import { useAccount, useBalance } from "wagmi";
import { formatUnits } from "viem";
import Image from "next/image";

export function UserBalances() {
  const { address, isConnected } = useAccount();

  // ETH (native) balance on Base
  const {
    data: ethBalance,
    isLoading: ethLoading,
    error: ethError,
  } = useBalance({
    address,
    chainId: 8453, // Base mainnet
  });

  // USDC balance on Base
  const {
    data: usdcBalance,
    isLoading: usdcLoading,
    error: usdcError,
  } = useBalance({
    address,
    token: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Fixed: use correct mixed-case address
    chainId: 8453,
  });

  if (!isConnected) {
    return (
      <Card title="Your Balances">
        <div className="flex items-center gap-2 text-[var(--app-foreground-muted)]">
          <Icon name="check" />
          Connect your wallet to view balances.
        </div>
      </Card>
    );
  }

  if (ethLoading || usdcLoading) {
    return (
      <Card title="Your Balances">
        <div className="animate-pulse text-[var(--app-foreground-muted)]">
          Loading balances...
        </div>
      </Card>
    );
  }

  if (ethError || usdcError) {
    console.error("Balance loading errors:", { ethError, usdcError });
    return (
      <Card title="Your Balances">
        <div className="text-red-500">
          Error loading balances. 
          {ethError && <div>ETH: {ethError.message}</div>}
          {usdcError && <div>USDC: {usdcError.message}</div>}
        </div>
      </Card>
    );
  }

  const ethDisplay = ethBalance
    ? Number(formatUnits(ethBalance.value, ethBalance.decimals)).toFixed(4)
    : "0.0000";
  const usdcDisplay = usdcBalance
    ? Number(formatUnits(usdcBalance.value, usdcBalance.decimals)).toFixed(4)
    : "0.0000";

  // Add safety check for missing balance data
  if (!ethBalance && !usdcBalance && !ethLoading && !usdcLoading) {
    return (
      <Card title="Your Balances">
        <div className="text-yellow-600">
          Unable to load balance data. Please check your network connection.
        </div>
      </Card>
    );
  }

  return (
    <Card title="Your Balances">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
            <Image 
              src="/tokens/eth-logo.svg" 
              alt="ETH" 
              width={32} 
              height={32}
              className="w-full h-full object-contain"
            />
          </div>
          <span className="font-bold text-[var(--app-foreground)]">ETH:</span>
          <span className="text-xl font-medium text-[var(--app-foreground)]">{ethDisplay} ETH</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
            <Image 
              src="/tokens/usdc-logo.svg" 
              alt="USDC" 
              width={32} 
              height={32}
              className="w-full h-full object-contain"
            />
          </div>
          <span className="font-bold text-[var(--app-foreground)]">USDC:</span>
          <span className="text-xl font-medium text-[var(--app-foreground)]">{usdcDisplay} USDC</span>
        </div>
      </div>
    </Card>
  );
}
