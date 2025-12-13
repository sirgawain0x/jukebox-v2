"use client";

import { useAccount, useChainId } from "wagmi";
import { Card } from "../ui/Card";
import { useToast } from "../ui/ToastProvider";
import { 
  useCreateWeeklyMarket, 
  useGetNextMondayEST, 
  useGetMarketCount, 
  useGetContractOwner,
  useGetMarket,
  usePlaceBetAutomated,
} from "@/lib/contracts/automated-prediction-market-hooks";
import { isAutomatedPredictionMarketDeployed } from "@/lib/contracts/automated-prediction-market";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { useEffect, useState, useMemo } from "react";
import { formatUSDC, parseUSDC } from "@/lib/usdc-utils";
import { fetchTrendingSongs, type TrendingTrack } from "@/lib/trending-songs";
import { SongPicker } from "./SongPicker";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { useActiveMarkets, usePlaceBet } from "@/app/hooks/usePredictionMarket";
import type { PredictionMarket, MarketSide } from "@/types/prediction-market";
import { Transaction, TransactionButton } from "@coinbase/onchainkit/transaction";
import { getUSDCAddress, erc20ABI } from "@/lib/usdc-utils";
import { tryGetPredictionMarketAddress, isPredictionMarketDeployed, predictionMarketABI } from "@/lib/contracts/prediction-market";
import type { Contracts } from "@/types/transactions";

export function CreateAutomatedMarket() {
  const { isConnected, address: connectedAddress } = useAccount();
  const chainId = useChainId();
  const { showToast } = useToast();
  
  // Betting type selection
  const [bettingType, setBettingType] = useState<"automated" | "manual">("automated");
  
  // Automated market betting state
  const [betAmount, setBetAmount] = useState("");
  const [trackTitle, setTrackTitle] = useState("");
  const [selectedSong, setSelectedSong] = useState<TrendingTrack | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [songs, setSongs] = useState<TrendingTrack[]>([]);
  const [isLoadingSongs, setIsLoadingSongs] = useState(true);
  const [enableManualEntry, setEnableManualEntry] = useState(false);
  
  // Manual market betting state
  const [selectedMarket, setSelectedMarket] = useState<PredictionMarket | null>(null);
  const [selectedSide, setSelectedSide] = useState<MarketSide | null>(null);
  const [manualBetAmount, setManualBetAmount] = useState("");
  
  const isContractDeployed = isAutomatedPredictionMarketDeployed(chainId);
  const { createWeeklyMarket, isPending, isSuccess, isError, error, isSimulateError, simulateError, isSimulating } = useCreateWeeklyMarket();
  const { data: nextMondayEST } = useGetNextMondayEST();
  const { data: marketCount } = useGetMarketCount();
  const { data: contractOwner } = useGetContractOwner();
  
  // Get the most recent market (highest market ID)
  const latestMarketId = useMemo(() => {
    if (!marketCount || marketCount === BigInt(0)) return null;
    return marketCount; // Latest market is the highest ID
  }, [marketCount]);
  
  const { data: marketData, isLoading: isLoadingMarket } = useGetMarket(latestMarketId);
  const { placeBet, isApprovingPending, isBetPending, isWaitingForApprove } = usePlaceBetAutomated();
  
  // Manual market hooks
  const { data: manualMarkets } = useActiveMarkets();
  const { placeBetAsync: placeManualBet, isPending: isPlacingManualBet } = usePlaceBet();
  const isManualContractDeployed = isPredictionMarketDeployed(chainId);
  const manualContractAddress = tryGetPredictionMarketAddress(chainId);

  // Fetch trending songs on mount
  useEffect(() => {
    const loadSongs = async () => {
      setIsLoadingSongs(true);
      try {
        const trendingSongs = await fetchTrendingSongs(50);
        setSongs(trendingSongs);
      } catch (error) {
        console.error("Failed to fetch songs:", error);
        showToast({ message: "Failed to load songs. You can still enter a track title manually.", type: "warning" });
      } finally {
        setIsLoadingSongs(false);
      }
    };
    loadSongs();
  }, [showToast]);

  // Persist song metadata helper
  const persistSongMetadata = async (song: TrendingTrack) => {
    try {
      const response = await fetch("/api/prediction/song-metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: song.id,
          title: song.title,
          artist: song.artist,
          cover: song.cover,
        }),
      });
      if (!response.ok) {
        console.warn("Failed to persist song metadata", await response.text());
      }
    } catch (persistError) {
      console.error("Error persisting song metadata", persistError);
    }
  };

  // Update trackTitle when a song is selected
  useEffect(() => {
    if (selectedSong) {
      setTrackTitle(selectedSong.title);
    }
  }, [selectedSong]);

  // Group songs by artist
  const artistsMap = songs.reduce((acc, song) => {
    const artistKey = song.artistId || song.artist;
    if (!acc[artistKey]) {
      acc[artistKey] = {
        artistId: artistKey,
        artistName: song.artist,
        songs: [],
      };
    }
    acc[artistKey].songs.push(song);
    return acc;
  }, {} as Record<string, { artistId: string; artistName: string; songs: TrendingTrack[] }>);
  
  const artists = Object.values(artistsMap);
  const filteredSongs = selectedArtist 
    ? artistsMap[selectedArtist]?.songs || []
    : songs;

  const handleSelectSong = (song: TrendingTrack) => {
    setSelectedSong(song);
    setTrackTitle(song.title);
    setEnableManualEntry(false);
    void persistSongMetadata(song);
  };

  const handleEnableManualEntry = () => {
    setEnableManualEntry(true);
    setSelectedSong(null);
    setSelectedArtist(null);
  };

  const handleReturnToPicker = () => {
    setEnableManualEntry(false);
    setSelectedArtist(null);
    setTrackTitle("");
    setSelectedSong(null);
  };

  // Show success/error toasts
  useEffect(() => {
    if (isSuccess) {
      showToast("Weekly market created successfully! 🎉");
    }
  }, [isSuccess, showToast]);

  useEffect(() => {
    if (isError && error) {
      showToast({ message: `Error: ${error.message}`, type: "error" });
    }
  }, [isError, error, showToast]);

  // Extract market data
  const market = marketData as 
    | { id?: bigint; endTime?: bigint; resolveTime?: bigint; resolved?: boolean; winningTrack?: string; totalPool?: bigint }
    | [bigint?, bigint?, bigint?, boolean?, string?, bigint?];
  
  const isArray = Array.isArray(market);
  const endTime: bigint | undefined = isArray ? market[1] : market?.endTime;
  const resolveTime: bigint | undefined = isArray ? market[2] : market?.resolveTime;
  const resolved: boolean = isArray ? (market[3] ?? false) : (market?.resolved ?? false);
  const totalPool: bigint | undefined = isArray ? market[5] : market?.totalPool;
  const now = BigInt(Math.floor(Date.now() / 1000));
  const isBettingOpen = !resolved && endTime ? endTime > now : false;

  // Format timestamp to readable date
  const formatDate = (timestamp: bigint | undefined) => {
    if (!timestamp) return "Loading...";
    const timestampNumber = Number(timestamp);
    const date = new Date(timestampNumber * 1000);
    return date.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/New_York",
      timeZoneName: "short",
    });
  };

  const handlePlaceBet = async () => {
    if (!isConnected || !connectedAddress) {
      showToast({ message: "Please connect your wallet", type: "error" });
      return;
    }

    if (!betAmount || parseFloat(betAmount) <= 0) {
      showToast({ message: "Please enter a valid bet amount", type: "error" });
      return;
    }

    if (!trackTitle || trackTitle.trim().length === 0) {
      showToast({ message: "Please enter a track title", type: "error" });
      return;
    }

    if (!latestMarketId) {
      showToast({ message: "No active market available", type: "error" });
      return;
    }

    try {
      const amount = parseUSDC(betAmount);
      await placeBet(latestMarketId, trackTitle.trim(), amount);
      showToast({ message: `Bet placed: ${betAmount} USDC on "${trackTitle}"`, type: "success" });
      setBetAmount("");
      // Don't clear trackTitle - keep selection for easy re-betting
      // setTrackTitle("");
    } catch (error) {
      console.error("Failed to place bet:", error);
      showToast({
        message: error instanceof Error ? error.message : "Failed to place bet. Please try again.",
        type: "error"
      });
    }
  };

  // Note: handlePlaceManualBet is not used because we use TransactionButton with calls directly
  // This function is kept for potential future use or debugging
  const _handlePlaceManualBet = async () => {
    if (!selectedMarket || !selectedSide || !manualBetAmount) {
      showToast({ message: "Please select a market, side, and bet amount", type: "error" });
      return;
    }

    try {
      await placeManualBet({
        marketId: BigInt(selectedMarket.marketIndex || 0),
        amount: manualBetAmount,
        side: selectedSide,
      });
      showToast({ message: `Bet placed: ${selectedSide} ${manualBetAmount} USDC`, type: "success" });
      setManualBetAmount("");
      // Keep market and side selected for easy re-betting
    } catch (error) {
      console.error("Failed to place bet:", error);
      showToast({
        message: error instanceof Error ? error.message : "Failed to place bet. Please try again.",
        type: "error"
      });
    }
  };

  const isPlacingBet = isApprovingPending || isBetPending || isWaitingForApprove;

  // Don't early return - allow manual market betting even if automated contract isn't deployed

  const isOwner = contractOwner && connectedAddress && connectedAddress.toLowerCase() === (contractOwner as string).toLowerCase();

  // Manual market transaction calls
  const manualBetCalls = selectedMarket && selectedSide && manualBetAmount && parseFloat(manualBetAmount) > 0 && isConnected && manualContractAddress && selectedMarket.marketIndex !== undefined
    ? [
        {
          abi: erc20ABI,
          address: getUSDCAddress(chainId),
          functionName: "approve" as const,
          args: [
            manualContractAddress,
            parseUSDC(manualBetAmount),
          ],
        },
        {
          abi: predictionMarketABI,
          address: manualContractAddress,
          functionName: "placeBet" as const,
          args: [
            BigInt(selectedMarket.marketIndex),
            parseUSDC(manualBetAmount),
            selectedSide === "YES",
          ],
        },
      ] as Contracts
    : [];

  // Filter active manual markets
  const activeManualMarkets = (manualMarkets || []).filter(
    (m) => m.status === "ACTIVE" && m.endTime > Math.floor(Date.now() / 1000)
  );

  return (
    <Card title="🎯 Place Your Bet">
      {/* Betting Type Selection */}
      <div className="mb-4">
        <div className="flex gap-2">
          <Button
            variant={bettingType === "automated" ? "primary" : "outline"}
            onClick={() => setBettingType("automated")}
            className="flex-1"
            disabled={isPlacingBet || isPlacingManualBet}
          >
            Automated Market
          </Button>
          <Button
            variant={bettingType === "manual" ? "primary" : "outline"}
            onClick={() => setBettingType("manual")}
            className="flex-1"
            disabled={isPlacingBet || isPlacingManualBet}
          >
            YES/NO Market
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {bettingType === "automated" ? (
          <>
            {!isContractDeployed ? (
              <div className="text-center py-4 text-(--app-foreground-muted)">
                <p>Automated prediction market contract not deployed on this network.</p>
                <p className="text-sm mt-2">Please switch to Base Sepolia or Base Mainnet.</p>
              </div>
            ) : isLoadingMarket || !latestMarketId ? (
              <div className="text-center py-4 text-(--app-foreground-muted)">
                <p>Loading market...</p>
              </div>
            ) : !isBettingOpen ? (
              <div className="text-center py-4">
                <p className="text-sm text-(--app-foreground-muted) mb-2">
                  {resolved ? "This market has been resolved." : "Betting is currently closed for this market."}
                </p>
                {resolveTime && (
                  <p className="text-xs text-(--app-foreground-muted)">
                    Next market resolves on {formatDate(resolveTime)}
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-900 mb-2">How it works:</p>
                  <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                    <li>Bet on which track will be #1 trending on Spinamp by the resolution time</li>
                    <li>Market resolves on {resolveTime ? formatDate(resolveTime) : "Monday 5:00 AM EST"}</li>
                    <li>Winners split the pool (minus 10% protocol fee)</li>
                    <li>Resolution happens automatically via Chainlink Functions</li>
                  </ul>
                </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-(--app-foreground-muted)">Current Pool:</span>
                <span className="font-medium">{formatUSDC(totalPool ?? BigInt(0))} USDC</span>
              </div>
              {endTime && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-(--app-foreground-muted)">Betting Closes:</span>
                  <span className="font-medium">{formatDate(endTime)}</span>
                </div>
              )}
              {resolveTime && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-(--app-foreground-muted)">Resolution:</span>
                  <span className="font-medium">{formatDate(resolveTime)}</span>
                </div>
              )}
            </div>

            {!isConnected ? (
              <div className="text-center py-4">
                <p className="text-sm text-(--app-foreground-muted)">
                  Connect your wallet to place a bet
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="artistSelect">Select Trending Artist *</Label>
                  {!enableManualEntry ? (
                    <div className="mt-1 space-y-2">
                      {!selectedArtist ? (
                        <>
                          <select
                            id="artistSelect"
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                setSelectedArtist(e.target.value);
                                setSelectedSong(null);
                                setTrackTitle("");
                              }
                            }}
                            disabled={isPlacingBet || isLoadingSongs}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0052ff] text-sm"
                          >
                            <option value="">-- Select a trending artist --</option>
                            {artists.map((artist) => (
                              <option key={artist.artistId} value={artist.artistId}>
                                {artist.artistName} ({artist.songs.length} {artist.songs.length === 1 ? 'song' : 'songs'})
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={handleEnableManualEntry}
                            className={`text-xs text-[#0052ff] hover:underline ${isPlacingBet ? "cursor-not-allowed opacity-60" : ""}`}
                            disabled={isPlacingBet}
                            aria-disabled={isPlacingBet}
                          >
                            Or enter track title manually
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 mb-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedArtist(null);
                                setSelectedSong(null);
                                setTrackTitle("");
                              }}
                              className="text-xs text-[#0052ff] hover:underline"
                              disabled={isPlacingBet}
                            >
                              ← Back to artists
                            </button>
                          </div>
                          <SongPicker
                            songs={filteredSongs}
                            selectedSongId={selectedSong?.id}
                            onSelect={handleSelectSong}
                            disabled={isPlacingBet}
                            isLoading={isLoadingSongs}
                            placeholder="-- Select a song --"
                          />
                          {selectedSong && (
                            <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                              {selectedSong.cover && (
                                <Image
                                  src={selectedSong.cover}
                                  alt={selectedSong.title}
                                  width={48}
                                  height={48}
                                  className="h-12 w-12 rounded object-cover"
                                  unoptimized
                                />
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{selectedSong.title}</p>
                                <p className="truncate text-xs text-(--app-foreground-muted)">{selectedSong.artist}</p>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="mt-1 space-y-2">
                      <input
                        type="text"
                        placeholder="Enter the track title you think will be #1"
                        value={trackTitle}
                        onChange={(e) => setTrackTitle(e.target.value)}
                        disabled={isPlacingBet}
                        className="w-full px-4 py-3 border border-[rgba(0,0,0,0.1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0052ff] text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleReturnToPicker}
                        className={`text-xs text-[#0052ff] hover:underline ${isPlacingBet ? "cursor-not-allowed opacity-60" : ""}`}
                        disabled={isPlacingBet}
                        aria-disabled={isPlacingBet}
                      >
                        Or select from list
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-(--app-foreground-muted) mt-1">
                    {enableManualEntry 
                      ? "The track title you predict will be #1"
                      : selectedArtist
                      ? "Choose a song from this artist"
                      : "Choose a trending artist, then select a song"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-(--app-foreground-muted) mb-2">
                    Bet Amount (USDC) *
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 border border-[rgba(0,0,0,0.1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0052ff] text-sm"
                  />
                </div>
                <Button
                  variant="primary"
                  onClick={handlePlaceBet}
                  disabled={!betAmount || !trackTitle || !isConnected || isPlacingBet}
                  className="w-full"
                >
                  {isPlacingBet ? "Placing Bet..." : "Place Bet"}
                </Button>
              </div>
            )}
              </>
            )}
          </>
        ) : (
          <>
            {/* Manual Market Betting */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900 mb-2">How it works:</p>
              <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                <li>Select a market from the list below</li>
                <li>Bet YES if you think the song will reach #1, or NO if you think it won&apos;t</li>
                <li>Winners split the pool (minus platform fee)</li>
                <li>You can bet multiple times on either side</li>
              </ul>
            </div>

            {!isConnected ? (
              <div className="text-center py-4">
                <p className="text-sm text-(--app-foreground-muted)">
                  Connect your wallet to place a bet
                </p>
              </div>
            ) : !isManualContractDeployed ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                <p className="text-sm font-medium text-yellow-800">
                  Manual prediction market contract not deployed
                </p>
              </div>
            ) : activeManualMarkets.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-(--app-foreground-muted)">
                  No active YES/NO markets available
                </p>
                <p className="text-xs text-(--app-foreground-muted) mt-2">
                  Check the &quot;Trending Prediction Markets&quot; section below to see available markets
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="marketSelect">Select Market *</Label>
                  <select
                    id="marketSelect"
                    value={selectedMarket?.id || ""}
                    onChange={(e) => {
                      const market = activeManualMarkets.find((m) => m.id === e.target.value);
                      setSelectedMarket(market || null);
                      setSelectedSide(null);
                      setManualBetAmount("");
                    }}
                    disabled={isPlacingManualBet}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0052ff] text-sm mt-1"
                  >
                    <option value="">-- Select a market --</option>
                    {activeManualMarkets.map((market) => {
                      const totalPool = market.totalPoolYes + market.totalPoolNo;
                      return (
                        <option key={market.id} value={market.id}>
                          {market.songTitle} by {market.songArtist} ({formatUSDC(totalPool)} USDC pool)
                        </option>
                      );
                    })}
                  </select>
                </div>

                {selectedMarket && (
                  <>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        {selectedMarket.songCover && (
                          <Image
                            src={selectedMarket.songCover}
                            alt={selectedMarket.songTitle}
                            width={48}
                            height={48}
                            className="h-12 w-12 rounded object-cover"
                            unoptimized
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{selectedMarket.songTitle}</p>
                          <p className="text-xs text-(--app-foreground-muted) truncate">{selectedMarket.songArtist}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="text-(--app-foreground-muted)">Total Pool:</span>
                        <span className="font-medium">
                          {formatUSDC(selectedMarket.totalPoolYes + selectedMarket.totalPoolNo)} USDC
                        </span>
                      </div>
                    </div>

                    <div>
                      <Label>Select Your Prediction *</Label>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <Button
                          variant={selectedSide === "YES" ? "primary" : "outline"}
                          onClick={() => setSelectedSide("YES")}
                          className="w-full"
                          disabled={isPlacingManualBet}
                        >
                          <Icon name="check" size="sm" className="mr-1" />
                          YES
                        </Button>
                        <Button
                          variant={selectedSide === "NO" ? "primary" : "outline"}
                          onClick={() => setSelectedSide("NO")}
                          className="w-full"
                          disabled={isPlacingManualBet}
                        >
                          <Icon name="x" size="sm" className="mr-1" />
                          NO
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="manualBetAmount">Bet Amount (USDC) *</Label>
                      <input
                        id="manualBetAmount"
                        type="number"
                        placeholder="0.00"
                        value={manualBetAmount}
                        onChange={(e) => setManualBetAmount(e.target.value)}
                        min="0"
                        step="0.01"
                        disabled={isPlacingManualBet}
                        className="w-full px-4 py-3 border border-[rgba(0,0,0,0.1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0052ff] text-sm mt-1"
                      />
                    </div>

                    {selectedSide && manualBetAmount && parseFloat(manualBetAmount) > 0 && Array.isArray(manualBetCalls) && manualBetCalls.length > 0 && (
                      <Transaction calls={manualBetCalls}>
                        <TransactionButton
                          text={`Place ${selectedSide} Bet: ${manualBetAmount} USDC`}
                          className="w-full bg-[#0052ff] hover:bg-[#0040cc] text-white"
                        />
                      </Transaction>
                    )}

                    {(!selectedSide || !manualBetAmount || parseFloat(manualBetAmount) <= 0) && (
                      <p className="text-xs text-center text-(--app-foreground-muted)">
                        Select YES or NO and enter bet amount to place bet
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* Owner-only market creation section (only show for automated markets) */}
        {bettingType === "automated" && isOwner && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <details className="cursor-pointer">
              <summary className="text-sm font-medium text-(--app-foreground-muted) mb-3">
                Owner: Create New Market
              </summary>
              <div className="space-y-3 mt-3">
                <Button
                  onClick={() => {
                    try {
                      createWeeklyMarket();
                    } catch (err) {
                      showToast({
                        message: err instanceof Error ? err.message : "Failed to create market",
                        type: "error"
                      });
                    }
                  }}
                  disabled={isPending || isSimulating || isSimulateError}
                  variant="outline"
                  className="w-full"
                >
                  {isPending ? "Creating Market..." : isSimulating ? "Validating..." : isSimulateError ? "Cannot Create Market" : "Create Weekly Market"}
                </Button>
                
                <p className="text-xs text-center text-(--app-foreground-muted)">
                  This will create a new market that resolves on {nextMondayEST ? formatDate(nextMondayEST) : "the next Monday"}
                </p>
              </div>
            </details>

            {(isError || isSimulateError) && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  {error?.message || simulateError?.message || "Failed to create market. Please try again."}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
