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
// Removed: Icon - no longer used after removing manual betting
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
  const { data: marketCount, isLoading: isLoadingMarketCount, isError: isMarketCountError, error: marketCountError } = useGetMarketCount();
  const { data: contractOwner, isLoading: isLoadingOwner, isError: isOwnerError, error: ownerError } = useGetContractOwner();
  
  // #region agent log
  // Log contract deployment and market count state
  useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/7ffccca1-2c82-49dc-9cbc-405674609eea', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'CreateAutomatedMarket.tsx:useEffect-marketCount', message: 'Market count state', data: { isContractDeployed, chainId, marketCount: marketCount?.toString(), isLoadingMarketCount, isMarketCountError, marketCountError: marketCountError?.message }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'pre-fix', hypothesisId: 'A' }) }).catch(() => { });
  }, [isContractDeployed, chainId, marketCount, isLoadingMarketCount, isMarketCountError, marketCountError]);
  // #endregion
  
  // #region agent log
  // Log contract owner state
  useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/7ffccca1-2c82-49dc-9cbc-405674609eea', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'CreateAutomatedMarket.tsx:useEffect-owner', message: 'Contract owner state', data: { contractOwner, connectedAddress, isLoadingOwner, isOwnerError, ownerError: ownerError?.message }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'pre-fix', hypothesisId: 'C' }) }).catch(() => { });
  }, [contractOwner, connectedAddress, isLoadingOwner, isOwnerError, ownerError]);
  // #endregion
  
  // Get the most recent market (highest market ID)
  const latestMarketId = useMemo(() => {
    // #region agent log
    const result = (!marketCount || marketCount === BigInt(0)) ? null : marketCount;
    fetch('http://127.0.0.1:7242/ingest/7ffccca1-2c82-49dc-9cbc-405674609eea', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'CreateAutomatedMarket.tsx:latestMarketId', message: 'Latest market ID computed', data: { marketCount: marketCount?.toString(), latestMarketId: result?.toString() }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'pre-fix', hypothesisId: 'A' }) }).catch(() => { });
    // #endregion
    if (!marketCount || marketCount === BigInt(0)) return null;
    return marketCount; // Latest market is the highest ID
  }, [marketCount]);
  
  const { data: marketData, isLoading: isLoadingMarket, isError: isMarketError, error: marketError } = useGetMarket(latestMarketId);
  
  // #region agent log
  // Log market loading state
  useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/7ffccca1-2c82-49dc-9cbc-405674609eea', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'CreateAutomatedMarket.tsx:useEffect-marketData', message: 'Market data loading state', data: { latestMarketId: latestMarketId?.toString(), isLoadingMarket, isMarketError, marketError: marketError?.message, hasMarketData: !!marketData }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'pre-fix', hypothesisId: 'B' }) }).catch(() => { });
  }, [latestMarketId, isLoadingMarket, isMarketError, marketError, marketData]);
  // #endregion
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

  const isPlacingBet = isApprovingPending || isBetPending || isWaitingForApprove;

  // Check if user is owner (allows checking even when wallet not connected)
  const isOwner = contractOwner && connectedAddress && connectedAddress.toLowerCase() === (contractOwner as string).toLowerCase();
  const isOwnerAddress = contractOwner && connectedAddress && connectedAddress.toLowerCase() === (contractOwner as string).toLowerCase();
  // Also check if the owner address matches even without wallet connected (for UI display)
  const ownerAddress = contractOwner as string | undefined;
  
  // #region agent log
  // Log owner check and loading condition
  useEffect(() => {
    const showLoadingMarket = isLoadingMarketCount || isLoadingMarket;
    const hasNoMarkets = !isLoadingMarketCount && marketCount !== undefined && (marketCount === BigInt(0) || !latestMarketId);
    const logData = { isContractDeployed, isLoadingMarket, isLoadingMarketCount, latestMarketId: latestMarketId?.toString(), marketCount: marketCount?.toString(), showLoadingMarket, hasNoMarkets, isOwner, isOwnerAddress, contractOwner, connectedAddress };
    console.log('[DEBUG] Render condition check:', logData);
    fetch('http://127.0.0.1:7242/ingest/7ffccca1-2c82-49dc-9cbc-405674609eea', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'CreateAutomatedMarket.tsx:useEffect-render', message: 'Render condition check', data: logData, timestamp: Date.now(), sessionId: 'debug-session', runId: 'post-fix', hypothesisId: 'A,B,C' }) }).catch(() => { });
  }, [isContractDeployed, isLoadingMarket, isLoadingMarketCount, latestMarketId, marketCount, isOwner, isOwnerAddress, contractOwner, connectedAddress]);
  // #endregion

  // Determine which UI to show
  const showLoading = isLoadingMarketCount || (isLoadingMarket && latestMarketId !== null);
  const showNoMarkets = !isLoadingMarketCount && !isLoadingMarket && (!latestMarketId || (marketCount !== undefined && marketCount === BigInt(0)));
  
  // #region agent log
  console.log('[DEBUG] Render decision:', { showLoading, showNoMarkets, isLoadingMarketCount, isLoadingMarket, latestMarketId: latestMarketId?.toString(), marketCount: marketCount?.toString() });
  // #endregion

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

        {/* Owner-only market creation section - show if owner address matches (even if wallet not connected) */}
        {ownerAddress && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <details className="cursor-pointer" open={!isConnected}>
              <summary className="text-sm font-medium text-(--app-foreground-muted) mb-3">
                {isOwnerAddress ? "Owner: Create New Market" : "Contract Owner: Create New Market"}
              </summary>
              <div className="space-y-3 mt-3">
                {!isConnected ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-(--app-foreground-muted) mb-3">
                      Connect your wallet to create a new market. Only the Creative Organization can create markets.
                    </p>
                  </div>
                ) : !isOwnerAddress ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-(--app-foreground-muted) mb-3">
                      Only the Creative Organization can create markets.
                    </p>
                  </div>
                ) : (
                  <>
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
          </div>
        )}
      </div>
    </Card>
  );
}
