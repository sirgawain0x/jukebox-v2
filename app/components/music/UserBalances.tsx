"use client";
import { Card } from "../ui/Card";
import { Icon } from "../ui/Icon";
import { useAccount, useBalance } from "wagmi";
import { formatUnits } from "viem";
import { CircleDollarSign } from "lucide-react";

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
    token: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
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
    return (
      <Card title="Your Balances">
        <div className="text-red-500">Error loading balances.</div>
      </Card>
    );
  }

  const ethDisplay = ethBalance
    ? Number(formatUnits(ethBalance.value, ethBalance.decimals)).toFixed(4)
    : "0.0000";
  const usdcDisplay = usdcBalance
    ? Number(formatUnits(usdcBalance.value, usdcBalance.decimals)).toFixed(4)
    : "0.0000";

  return (
    <Card title="Your Balances">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">Ξ</span>
          </div>
          <span className="font-bold">ETH:</span>
          <span className="text-xl">{ethDisplay} ETH</span>
        </div>
        <div className="flex items-center gap-2">
          <CircleDollarSign className="w-6 h-6 text-blue-500" />
          <span className="font-bold">USDC:</span>
          <span className="text-xl">{usdcDisplay} USDC</span>
        </div>
      </div>
    </Card>
  );
}
