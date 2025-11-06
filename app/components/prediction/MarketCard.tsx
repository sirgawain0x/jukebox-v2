"use client";

import { useState } from "react";
import Image from "next/image";
import { useAccount } from "wagmi";
import { Transaction, TransactionButton } from "@coinbase/onchainkit/transaction";
import { formatUSDC, parseUSDC, getUSDCAddress, erc20ABI } from "@/lib/usdc-utils";
import { useChainId } from "wagmi";
import { usePlaceBet, useMarketOdds } from "@/app/hooks/usePredictionMarket";
import type { PredictionMarket, MarketSide } from "@/types/prediction-market";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { useToast } from "../ui/ToastProvider";
import { tryGetPredictionMarketAddress, isPredictionMarketDeployed, predictionMarketABI } from "@/lib/contracts/prediction-market";
import type { Contracts } from "@/types/transactions";

type MarketCardProps = {
  market: PredictionMarket;
  rank: number;
};

export function MarketCard({ market, rank }: MarketCardProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { showToast } = useToast();
  const [betAmount, setBetAmount] = useState("");
  const [selectedSide, setSelectedSide] = useState<MarketSide | null>(null);
  const [isPlacingBet, setIsPlacingBet] = useState(false);

  const { data: odds } = useMarketOdds(market);
  const { placeBetAsync } = usePlaceBet();
  const isContractDeployed = isPredictionMarketDeployed(chainId);
  const contractAddress = tryGetPredictionMarketAddress(chainId);
  
  // If market has marketIndex and contractAddress, it exists on the contract
  // (markets from API are already validated as existing and active)
  const marketExistsOnContract = !!(
    market.marketIndex !== undefined &&
    market.contractAddress &&
    contractAddress &&
    market.contractAddress === contractAddress && // Add this line to verify addresses match
    market.status === "ACTIVE" &&
    market.endTime > Math.floor(Date.now() / 1000)
  );

  const _handlePlaceBet = async (side: MarketSide) => {
    if (!isConnected || !address) {
      showToast("Please connect your wallet");
      return;
    }

    if (!betAmount || parseFloat(betAmount) <= 0) {
      showToast("Please enter a valid bet amount");
      return;
    }

    setIsPlacingBet(true);
    try {
      await placeBetAsync({
        marketId: BigInt(market.marketIndex || 0),
        amount: betAmount,
        side,
      });
      showToast(`Bet placed: ${side} ${betAmount} USDC`);
      setBetAmount("");
      setSelectedSide(null);
    } catch (error) {
      console.error("Failed to place bet:", error);
      showToast("Failed to place bet. Please try again.");
    } finally {
      setIsPlacingBet(false);
    }
  };

  const totalPool = market.totalPoolYes + market.totalPoolNo;
  const totalPoolDisplay = formatUSDC(totalPool);
  const timeRemaining = Math.max(0, market.endTime - Math.floor(Date.now() / 1000));
  const daysRemaining = Math.floor(timeRemaining / 86400);
  const hoursRemaining = Math.floor((timeRemaining % 86400) / 3600);

  const calls = selectedSide && betAmount && parseFloat(betAmount) > 0 && isConnected && contractAddress && marketExistsOnContract
    ? [
        // Approve USDC
        {
          abi: erc20ABI,
          address: getUSDCAddress(chainId),
          functionName: "approve" as const,
          args: [
            contractAddress,
            parseUSDC(betAmount),
          ],
        },
        // Place bet
        {
          abi: predictionMarketABI,
          address: contractAddress,
          functionName: "placeBet" as const,
          args: [
            BigInt(market.marketIndex || 0),
            parseUSDC(betAmount),
            selectedSide === "YES",
          ],
        },
      ] as Contracts
    : [];

  // Get rank badge color based on position
  const getRankBadgeColor = () => {
    if (rank === 1) return "bg-gradient-to-br from-yellow-400 to-yellow-600";
    if (rank === 2) return "bg-gradient-to-br from-gray-300 to-gray-500";
    if (rank === 3) return "bg-gradient-to-br from-orange-400 to-orange-600";
    return "bg-gradient-to-br from-[#0052ff] to-[#7c3aed]";
  };

  const getRankIcon = () => {
    if (rank === 1) return "🏆";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return null;
  };

  return (
    <Card className="hover:shadow-xl transition-all border-l-4 border-l-[#0052ff]">
      <div className="space-y-4">
        {/* Rank and Song Info */}
        <div className="flex items-start gap-4">
          <div className={`shrink-0 w-14 h-14 rounded-lg ${getRankBadgeColor()} flex items-center justify-center text-white font-bold text-xl shadow-lg relative`}>
            {getRankIcon() ? (
              <span className="text-2xl">{getRankIcon()}</span>
            ) : (
              <span>{rank}</span>
            )}
            {rank <= 3 && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-[#0052ff] rounded-full"></div>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3">
              {market.songCover && (
                <Image
                  src={market.songCover}
                  alt={market.songTitle}
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-lg object-cover shrink-0"
                  unoptimized
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg text-[#111111] truncate">
                  {market.songTitle}
                </h3>
                <p className="text-sm text-(--app-foreground-muted) truncate">
                  {market.songArtist}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pool Info - Compact */}
        <div className="flex items-center justify-between py-2 px-3 bg-[#f0f4ff] rounded-lg">
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-[#0052ff]">
              {totalPoolDisplay} USDC
            </span>
            {odds && (
              <>
                <span className="text-xs font-medium text-green-600">
                  YES {odds.yesOdds.toFixed(1)}%
                </span>
                <span className="text-xs font-medium text-red-600">
                  NO {odds.noOdds.toFixed(1)}%
                </span>
              </>
            )}
          </div>
          <span className="text-xs text-(--app-foreground-muted)">
            {daysRemaining}d {hoursRemaining}h left
          </span>
        </div>

        {/* Betting Interface */}
        {market.status === "ACTIVE" && (
          <div className="space-y-3">
            {!isContractDeployed ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                <p className="text-sm font-medium text-yellow-800 mb-1">
                  Contract Not Deployed
                </p>
                <p className="text-xs text-yellow-700">
                  The prediction market contract is not yet deployed on this chain. Please deploy the contract first.
                </p>
              </div>
            ) : !marketExistsOnContract ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                <p className="text-sm font-medium text-yellow-800 mb-1">
                  Market Not Available
                </p>
                <p className="text-xs text-yellow-700">
                  This market is not available for betting. It may be expired or resolved.
                </p>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Amount (USDC)"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    min="0"
                    step="0.01"
                    className="flex-1 px-3 py-2 border border-[rgba(0,0,0,0.1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0052ff]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={selectedSide === "YES" ? "primary" : "outline"}
                    onClick={() => setSelectedSide("YES")}
                    className="w-full"
                    disabled={isPlacingBet}
                  >
                    <Icon name="check" size="sm" className="mr-1" />
                    YES
                  </Button>
                  <Button
                    variant={selectedSide === "NO" ? "primary" : "outline"}
                    onClick={() => setSelectedSide("NO")}
                    className="w-full"
                    disabled={isPlacingBet}
                  >
                    <Icon name="x" size="sm" className="mr-1" />
                    NO
                  </Button>
                </div>

                {selectedSide && betAmount && parseFloat(betAmount) > 0 && isConnected && contractAddress && marketExistsOnContract && (
                  <Transaction calls={calls as Contracts}>
                    <TransactionButton 
                      text={`Place ${selectedSide} Bet: ${betAmount} USDC`}
                      className="w-full bg-[#0052ff] hover:bg-[#0040cc] text-white"
                    />
                  </Transaction>
                )}

                {!isConnected && (
                  <p className="text-xs text-center text-(--app-foreground-muted)">
                    Connect wallet to place bets
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {market.status === "RESOLVED" && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
            <p className="text-sm font-medium text-green-800">
              Market Resolved: {market.totalPoolYes > market.totalPoolNo ? "YES" : "NO"} Won
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

