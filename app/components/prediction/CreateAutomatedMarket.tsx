"use client";

import { useAccount, useChainId } from "wagmi";
import { Card } from "../ui/Card";
import { useToast } from "../ui/ToastProvider";
import { useComposeCast } from "@coinbase/onchainkit/minikit";
import { useFarcasterContext } from "@/app/utils/farcaster-context";
import { Icon } from "../ui/Icon";
import {
  useCreateWeeklyMarket,
  useGetNextMondayEST,
  useGetMarketCount,
  useGetContractOwner,
  useGetMarket,
  usePlaceBetAutomated,
  useIsPaused,
  useGetMaxBetAmount,
  usePauseContract,
} from "@/lib/contracts/automated-prediction-market-hooks";
import { isAutomatedPredictionMarketDeployed } from "@/lib/contracts/automated-prediction-market";
import { Button } from "../ui/Button";
import { useEffect, useState, useMemo } from "react";
import { formatUSDC, parseUSDC } from "@/lib/usdc-utils";
import { fetchTrendingSongs, type TrendingTrack } from "@/lib/trending-songs";
import { SongPicker } from "./SongPicker";
import { Label } from "@/components/ui/label";
import Image from "next/image";
// Removed: usePlaceBet from old contract - manual betting removed
// Removed: PredictionMarket and MarketSide types - no longer used after removing manual betting
// Removed: Transaction, TransactionButton - no longer used after removing manual betting
// Removed: getUSDCAddress, erc20ABI - no longer used after removing manual betting
// Removed: Contracts type - no longer used after removing manual betting

export function CreateAutomatedMarket() {
  const { isConnected, address: connectedAddress } = useAccount();
  const chainId = useChainId();
  const { showToast } = useToast();
  const { composeCast } = useComposeCast();
  const { isMiniapp } = useFarcasterContext();

  // Automated market betting state (manual betting removed - old contract deleted)
  const [betAmount, setBetAmount] = useState("");
  const [trackTitle, setTrackTitle] = useState("");
  const [selectedSong, setSelectedSong] = useState<TrendingTrack | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [songs, setSongs] = useState<TrendingTrack[]>([]);
  const [isLoadingSongs, setIsLoadingSongs] = useState(true);
  const [enableManualEntry, setEnableManualEntry] = useState(false);

  const isContractDeployed = isAutomatedPredictionMarketDeployed(chainId);
  const { createWeeklyMarket, isPending, isSuccess, isError, error, isSimulateError, simulateError, isSimulating } = useCreateWeeklyMarket();
  const { data: nextMondayEST } = useGetNextMondayEST();
  const { data: marketCount, isLoading: isLoadingMarketCount, isError: _isMarketCountError, error: _marketCountError } = useGetMarketCount();
  const { data: contractOwner, isLoading: _isLoadingOwner, isError: _isOwnerError, error: _ownerError } = useGetContractOwner();
  const { data: isPaused } = useIsPaused();
  const { data: maxBetAmount } = useGetMaxBetAmount();
  const { pause, unpause, isPending: isPausePending, isSuccess: isPauseSuccess } = usePauseContract();





  // Get the most recent market (highest market ID)
  const latestMarketId = useMemo(() => {

    if (!marketCount || marketCount === BigInt(0)) return null;
    return marketCount; // Latest market is the highest ID
  }, [marketCount]);

  const { data: marketData, isLoading: isLoadingMarket, isError: _isMarketError, error: _marketError } = useGetMarket(latestMarketId);


  const { placeBet, isApprovingPending, isBetPending, isWaitingForApprove } = usePlaceBetAutomated();

  // Manual market betting removed - old contract deleted

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
  // Store metadata with both song ID and title as keys for better matching
  const persistSongMetadata = async (song: TrendingTrack) => {
    try {
      // Store with song ID as key
      const responseById = await fetch("/api/prediction/song-metadata", {
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
      if (!responseById.ok) {
        console.warn("Failed to persist song metadata by ID", await responseById.text());
      }

      // Also store with title as key (for matching when contract stores title string)
      if (song.title) {
        const responseByTitle = await fetch("/api/prediction/song-metadata", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: song.title.toLowerCase().trim(), // Use normalized title as ID
            title: song.title,
            artist: song.artist,
            cover: song.cover,
          }),
        });
        if (!responseByTitle.ok) {
          console.warn("Failed to persist song metadata by title", await responseByTitle.text());
        }
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

  // Show success/error toasts and share new market
  useEffect(() => {
    if (isSuccess) {
      showToast("Weekly market created successfully! 🎉");

      // Auto-share new market creation if in miniapp
      if (isMiniapp && composeCast) {
        const shareText = `🎯 New prediction market just opened! Bet on which track will be #1 trending on Jukebox. Pool is growing - join the action on Jukebox! 🎵💰`;
        composeCast({
          text: shareText,
          embeds: [window.location.href]
        });
      }
    }
  }, [isSuccess, showToast, isMiniapp, composeCast]);

  useEffect(() => {
    if (isError && error) {
      showToast({ message: `Error: ${error.message}`, type: "error" });
    }
  }, [isError, error, showToast]);

  // Extract market data
  // Contract Market struct: id, endTime, resolveTime, resolved, winningTrack, creator, totalPool, totalPaidOut
  const isArray = Array.isArray(marketData);

  // Type-safe access for array format (8 elements)
  const marketArray = isArray ? (marketData as readonly unknown[]) : null;
  const marketObject = !isArray ? (marketData as { id?: bigint; endTime?: bigint; resolveTime?: bigint; resolved?: boolean; winningTrack?: string; totalPool?: bigint }) : null;

  const endTime: bigint | undefined = isArray && marketArray ? (marketArray[1] as bigint | undefined) : marketObject?.endTime;
  const resolveTime: bigint | undefined = isArray && marketArray ? (marketArray[2] as bigint | undefined) : marketObject?.resolveTime;
  const resolved: boolean = isArray && marketArray ? (marketArray[3] as boolean | undefined) ?? false : (marketObject?.resolved ?? false);
  // totalPool is at index 6 (after id=0, endTime=1, resolveTime=2, resolved=3, winningTrack=4, creator=5)
  const totalPool: bigint | undefined = isArray && marketArray ? (marketArray[6] as bigint | undefined) : marketObject?.totalPool;


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

    if (isPaused) {
      showToast({ message: "Contract is currently paused. Betting is temporarily disabled.", type: "error" });
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

      // Check max bet limit
      if (maxBetAmount && amount > maxBetAmount) {
        const maxBetFormatted = formatUSDC(maxBetAmount);
        showToast({
          message: `Bet amount exceeds maximum of ${maxBetFormatted} USDC`,
          type: "error"
        });
        return;
      }

      const normalizedTitle = trackTitle.trim();
      await placeBet(latestMarketId, normalizedTitle, amount);

      // Persist metadata for the selected song if available
      if (selectedSong) {
        await persistSongMetadata(selectedSong);
      } else if (normalizedTitle) {
        // If manually entered, try to find and persist metadata
        // This will be handled by the API when fetching bets
      }

      showToast({ message: `Bet placed: ${betAmount} USDC on "${normalizedTitle}"`, type: "success" });

      // Auto-share bet placement if in miniapp
      if (isMiniapp && composeCast) {
        const shareText = `🎯 Just placed a ${betAmount} USDC bet on "${normalizedTitle}" to be #1 trending! Join the prediction market on Jukebox 🎵💰`;
        composeCast({
          text: shareText,
          embeds: [window.location.href]
        });
      }

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

  const isPlacingBet = isApprovingPending || isBetPending || isWaitingForApprove;

  // Check if user is owner (allows checking even when wallet not connected)
  const _isOwner = contractOwner && connectedAddress && connectedAddress.toLowerCase() === (contractOwner as string).toLowerCase();
  const isOwnerAddress = contractOwner && connectedAddress && connectedAddress.toLowerCase() === (contractOwner as string).toLowerCase();
  // Also check if the owner address matches even without wallet connected (for UI display)
  const ownerAddress = contractOwner as string | undefined;



  // Determine which UI to show
  const showLoading = isLoadingMarketCount || (isLoadingMarket && latestMarketId !== null);
  const showNoMarkets = !isLoadingMarketCount && !isLoadingMarket && (!latestMarketId || (marketCount !== undefined && marketCount === BigInt(0)));



  return (
    <Card title="🎯 Place Your Bet">
      <div className="space-y-4">
        {!isContractDeployed ? (
          <div className="text-center py-4 text-(--app-foreground-muted)">
            <p>Automated prediction market contract not deployed on this network.</p>
            <p className="text-sm mt-2">Please switch to Base Mainnet.</p>
          </div>
        ) : showLoading ? (
          <div className="text-center py-4 text-(--app-foreground-muted)">
            <p>Loading market...</p>
          </div>
        ) : showNoMarkets ? (
          <div className="text-center py-4 text-(--app-foreground-muted)">
            <p className="mb-2">No markets created yet.</p>
            <p className="text-sm">Markets are created weekly by Creative Organization.</p>
          </div>
        ) : isPaused ? (
          <div className="text-center py-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm font-medium text-yellow-900 mb-2">
                ⚠️ Contract Temporarily Paused
              </p>
              <p className="text-xs text-yellow-800">
                Betting is temporarily disabled. Please check back later.
              </p>
            </div>
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
                <li>Bet on which track will be #1 trending on Jukebox by the resolution time</li>
                <li>Market resolves on {resolveTime ? formatDate(resolveTime) : "Monday 5:00 AM EST"}</li>
                <li>Winners split the pool (minus 10% protocol fee)</li>
                <li>Resolution happens automatically via Chainlink Functions</li>
              </ul>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-(--app-foreground-muted)">Current Pool:</span>
                <span className="font-medium">{formatUSDC(totalPool ?? BigInt(0), 6)} USDC</span>
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
                    max={maxBetAmount ? Number(maxBetAmount) / 1e6 : undefined}
                    className="w-full px-4 py-3 border border-[rgba(0,0,0,0.1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0052ff] text-sm"
                  />
                  {maxBetAmount && (
                    <p className="text-xs text-(--app-foreground-muted) mt-1">
                      Maximum bet: {formatUSDC(maxBetAmount)} USDC
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Button
                    variant="primary"
                    onClick={handlePlaceBet}
                    disabled={!betAmount || !trackTitle || !isConnected || isPlacingBet || isPaused}
                    className="w-full"
                  >
                    {isPaused ? "Contract Paused" : isPlacingBet ? "Placing Bet..." : "Place Bet"}
                  </Button>

                  {/* Share Bet Button - shown after bet is placed or as preview */}
                  {isMiniapp && betAmount && trackTitle && (
                    <button
                      onClick={() => {
                        const shareText = `🎯 Betting ${betAmount} USDC on "${trackTitle}" to be #1 trending! Join the prediction market on Jukebox 🎵💰`;
                        composeCast({
                          text: shareText,
                          embeds: [window.location.href]
                        });
                        showToast({ message: "Share your bet to Farcaster!", type: "info" });
                      }}
                      className="w-full mt-2 bg-white/20 hover:bg-white/30 text-white rounded-lg py-2 px-4 transition-all duration-200 flex items-center justify-center gap-2 text-sm font-medium cursor-pointer border border-white/30"
                    >
                      <Icon name="share" size="sm" />
                      Share My Bet
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Owner-only controls section */}
        {ownerAddress && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <details className="cursor-pointer" open={!isConnected}>
              <summary className="text-sm font-medium text-(--app-foreground-muted) mb-3">
                {isOwnerAddress ? "🔧 Owner Controls" : "Contract Owner Controls"}
              </summary>
              <div className="space-y-4 mt-3">
                {!isConnected ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-(--app-foreground-muted) mb-3">
                      Connect your wallet to access owner controls.
                    </p>
                  </div>
                ) : !isOwnerAddress ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-(--app-foreground-muted) mb-3">
                      Only the contract owner can access these controls.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Contract Status */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium mb-2">Contract Status</h4>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-(--app-foreground-muted)">
                          Status:
                        </span>
                        <span className={`text-sm font-medium ${isPaused ? "text-yellow-600" : "text-green-600"}`}>
                          {isPaused ? "⏸️ Paused" : "▶️ Active"}
                        </span>
                      </div>
                      {maxBetAmount && (
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm text-(--app-foreground-muted)">
                            Max Bet:
                          </span>
                          <span className="text-sm font-medium">
                            {formatUSDC(maxBetAmount)} USDC
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Emergency Controls */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Emergency Controls</h4>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            try {
                              if (isPaused) {
                                unpause();
                                showToast({ message: "Unpausing contract...", type: "info" });
                              } else {
                                pause();
                                showToast({ message: "Pausing contract...", type: "warning" });
                              }
                            } catch (err) {
                              showToast({
                                message: err instanceof Error ? err.message : "Failed to toggle pause",
                                type: "error"
                              });
                            }
                          }}
                          disabled={isPausePending}
                          variant={isPaused ? "primary" : "outline"}
                          className="flex-1"
                        >
                          {isPausePending ? "Processing..." : isPaused ? "Unpause Contract" : "Pause Contract"}
                        </Button>
                      </div>
                      <p className="text-xs text-(--app-foreground-muted)">
                        {isPaused
                          ? "Contract is paused. Betting and market creation are disabled."
                          : "Pause the contract in case of emergency. Users can still withdraw rewards and winnings."}
                      </p>
                    </div>

                    {/* Market Creation */}
                    <div className="space-y-2 pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-medium">Market Creation</h4>
                      {isPaused && (
                        <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-800">
                            ⚠️ Contract is paused. Unpause to create markets.
                          </p>
                        </div>
                      )}
                      <div className="space-y-2">
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
                          disabled={isPending || isSimulating || isSimulateError || isPaused}
                          variant="outline"
                          className="w-full"
                        >
                          {isPaused ? "Cannot Create (Paused)" : isPending ? "Creating Market..." : isSimulating ? "Validating..." : isSimulateError ? "Cannot Create Market" : "Create Weekly Market"}
                        </Button>

                        {/* Share New Market Button */}
                        {isMiniapp && latestMarketId && (
                          <button
                            onClick={() => {
                              const shareText = `🎯 New prediction market is live! Bet on which track will be #1 trending on Jukebox. Pool: ${formatUSDC(totalPool ?? BigInt(0), 6)} USDC - Join the action on Jukebox! 🎵💰`;
                              composeCast({
                                text: shareText,
                                embeds: [window.location.href]
                              });
                              showToast({ message: "Share the market to Farcaster!", type: "info" });
                            }}
                            className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg py-2 px-4 transition-all duration-200 flex items-center justify-center gap-2 text-sm font-medium cursor-pointer border border-blue-200"
                          >
                            <Icon name="share" size="sm" />
                            Share This Market
                          </button>
                        )}
                      </div>

                      <p className="text-xs text-center text-(--app-foreground-muted)">
                        Creates a new market resolving on {nextMondayEST ? formatDate(nextMondayEST) : "the next Monday"}
                        {isOwnerAddress && " (No fee for owner)"}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </details>

            {(isError || isSimulateError) && isOwnerAddress && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  {error?.message || simulateError?.message || "Failed to create market. Please try again."}
                </p>
              </div>
            )}

            {isPauseSuccess && isOwnerAddress && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  ✅ Contract status updated successfully
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
