"use client";

import { useState, useEffect } from "react";
import { useAccount, useChainId } from "wagmi";
import { Transaction, TransactionButton } from "@coinbase/onchainkit/transaction";
import { useCreateMarket } from "@/lib/contracts/prediction-market-hooks";
import { tryGetPredictionMarketAddress, isPredictionMarketDeployed, predictionMarketABI } from "@/lib/contracts/prediction-market";
import { getWeeklyEndTime, fetchTrendingSongs, type TrendingTrack } from "@/lib/trending-songs";
import { Card } from "../ui/Card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "../ui/ToastProvider";
import { useQueryClient } from "@tanstack/react-query";
import { useReadContract } from "wagmi";
import Image from "next/image";
import { SongPicker } from "./SongPicker";
import { getUSDCAddress, erc20ABI, formatUSDC } from "@/lib/usdc-utils";

export function CreateMarket() {
  const { isConnected, address: connectedAddress } = useAccount();
  const chainId = useChainId();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  
  const [songId, setSongId] = useState("");
  const [selectedSong, setSelectedSong] = useState<TrendingTrack | null>(null);
  const [songs, setSongs] = useState<TrendingTrack[]>([]);
  const [isLoadingSongs, setIsLoadingSongs] = useState(true);
  const [endTime, setEndTime] = useState("");
  const [maxBetAmount, setMaxBetAmount] = useState("0");
  const [useWeeklyEndTime, setUseWeeklyEndTime] = useState(true);
  const [enableManualEntry, setEnableManualEntry] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  
  const isContractDeployed = isPredictionMarketDeployed(chainId);
  const contractAddress = tryGetPredictionMarketAddress(chainId);
  const isFormDisabled = !isConnected;
  
  // Check if user is contract owner
  const { data: contractOwner } = useReadContract({
    address: contractAddress || undefined,
    abi: predictionMarketABI,
    functionName: "owner",
    query: {
      enabled: !!contractAddress && isContractDeployed,
    },
  });
  
  // Get market creation fee
  const { data: marketCreationFee } = useReadContract({
    address: contractAddress || undefined,
    abi: predictionMarketABI,
    functionName: "marketCreationFee",
    query: {
      enabled: !!contractAddress && isContractDeployed,
    },
  });
  
  const isOwner = contractOwner && connectedAddress && 
    contractOwner.toLowerCase() === connectedAddress.toLowerCase();
  
  // Fetch trending songs on mount
  useEffect(() => {
    const loadSongs = async () => {
      setIsLoadingSongs(true);
      try {
        // Fetch more songs for a better selection (e.g., top 50)
        const trendingSongs = await fetchTrendingSongs(50);
        setSongs(trendingSongs);
      } catch (error) {
        console.error("Failed to fetch songs:", error);
        showToast("Failed to load songs. You can still enter a song ID manually.");
      } finally {
        setIsLoadingSongs(false);
      }
    };
    loadSongs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount
  
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

  // Update songId when a song is selected
  useEffect(() => {
    if (selectedSong) {
      setSongId(selectedSong.id);
    }
  }, [selectedSong]);
  
  // Read minMarketDuration from contract
  const { data: minMarketDuration } = useReadContract({
    address: contractAddress || undefined,
    abi: predictionMarketABI,
    functionName: "minMarketDuration",
    query: {
      enabled: !!contractAddress && isContractDeployed,
    },
  });

  const { isSuccess, error } = useCreateMarket();

  // Calculate end time
  const getEndTime = (): bigint => {
    if (useWeeklyEndTime) {
      return BigInt(getWeeklyEndTime());
    }
    if (endTime) {
      const timestamp = Math.floor(new Date(endTime).getTime() / 1000);
      return BigInt(timestamp);
    }
    return BigInt(getWeeklyEndTime());
  };

  // Get max bet amount as bigint (0 = no limit)
  const getMaxBetAmount = (): bigint => {
    if (!maxBetAmount || maxBetAmount === "0") {
      return BigInt(0);
    }
    // Convert USDC amount to wei (6 decimals)
    const amount = parseFloat(maxBetAmount);
    return BigInt(Math.floor(amount * 1_000_000));
  };

  const calls = isConnected && contractAddress && songId && getEndTime() > BigInt(Math.floor(Date.now() / 1000))
    ? (() => {
        const createMarketCall = {
          abi: predictionMarketABI,
          address: contractAddress,
          functionName: "createMarket" as const,
          args: [songId, getEndTime(), getMaxBetAmount()],
        };

        // If not owner and fee > 0, add approval call first
        if (!isOwner && marketCreationFee && marketCreationFee > BigInt(0)) {
          try {
            const usdcAddress = getUSDCAddress(chainId);
            return [
              {
                abi: erc20ABI,
                address: usdcAddress,
                functionName: "approve" as const,
                args: [contractAddress, marketCreationFee],
              },
              createMarketCall,
            ];
          } catch (error) {
            console.error("Failed to get USDC address:", error);
            return [createMarketCall];
          }
        }
        
        // Owner creates for free, no approval needed
        return [createMarketCall];
      })()
    : [];

  const handleSuccess = async () => {
    showToast("Market created successfully! Refreshing markets...");
    setSongId("");
    setSelectedSong(null);
    setEndTime("");
    setMaxBetAmount("0");
    setEnableManualEntry(false);
    setSelectedArtist(null);
    
    // Invalidate React Query cache
    queryClient.invalidateQueries({ queryKey: ["prediction-markets"] });
    
    // Force API cache invalidation and immediate refetch
    // Wait a moment for transaction to be confirmed on-chain
    setTimeout(async () => {
      try {
        // Call API with refresh flag to clear server cache
        await fetch("/api/prediction/markets?refresh=true", { cache: "no-store" });
        // Refetch all market-related queries
        await queryClient.refetchQueries({ queryKey: ["prediction-markets"] });
      } catch (error) {
        console.error("Failed to refresh markets:", error);
      }
    }, 2000); // 2 second delay to allow transaction confirmation
  };

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

  const handleSelectSong = (song: TrendingTrack) => {
    setSelectedSong(song);
    setSongId(song.id);
    setEnableManualEntry(false);
    // Keep selectedArtist when song is selected
    void persistSongMetadata(song);
  };

  const handleEnableManualEntry = () => {
    if (isFormDisabled) return;
    setEnableManualEntry(true);
  };

  const handleReturnToPicker = () => {
    if (isFormDisabled) return;
    setEnableManualEntry(false);
    setSelectedArtist(null);
    setSongId("");
    setSelectedSong(null);
  };

  if (!isContractDeployed) {
    return (
      <Card title="Create Market">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm font-medium text-yellow-800 mb-1">
            Contract Not Deployed
          </p>
          <p className="text-xs text-yellow-700">
            The prediction market contract is not deployed on this chain. Please deploy the contract first.
          </p>
        </div>
      </Card>
    );
  }

  const calculatedEndTime = getEndTime();
  const endTimeDate = new Date(Number(calculatedEndTime) * 1000);
  const minDuration = minMarketDuration ? Number(minMarketDuration) : 86400; // Default 1 day
  const minEndTime = Date.now() / 1000 + minDuration;

  return (
    <Card title="Create Prediction Market">
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
          <p className="text-sm font-medium text-blue-900 mb-1">What is this market about?</p>
          <p className="text-xs text-blue-800">
            Users will bet on whether this song reaches <strong>#1 in the weekly trending charts</strong> by the end time.
          </p>
        </div>
        
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
                        setSongId("");
                      }
                    }}
                    disabled={isFormDisabled || isLoadingSongs}
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
                    className={`text-xs text-[#0052ff] hover:underline ${isFormDisabled ? "cursor-not-allowed opacity-60" : ""}`}
                    disabled={isFormDisabled}
                    aria-disabled={isFormDisabled}
                  >
                    Or enter song ID manually
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
                        setSongId("");
                      }}
                      className="text-xs text-[#0052ff] hover:underline"
                    >
                      ← Back to artists
                    </button>
                  </div>
                  <SongPicker
                    songs={filteredSongs}
                    selectedSongId={selectedSong?.id}
                    onSelect={handleSelectSong}
                    disabled={isFormDisabled}
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
              <Input
                id="songId"
                type="text"
                placeholder="e.g., song-123 or processedTrackId"
                value={songId}
                onChange={(e) => setSongId(e.target.value)}
                disabled={isFormDisabled}
              />
              <button
                type="button"
                onClick={handleReturnToPicker}
                className={`text-xs text-[#0052ff] hover:underline ${isFormDisabled ? "cursor-not-allowed opacity-60" : ""}`}
                disabled={isFormDisabled}
                aria-disabled={isFormDisabled}
              >
                Or select from list
              </button>
            </div>
          )}
          <p className="text-xs text-(--app-foreground-muted) mt-1">
            {enableManualEntry 
              ? "The unique identifier for the song (from Spinamp)"
              : selectedArtist
              ? "Choose a song from this artist"
              : "Choose a trending artist, then select a song"}
          </p>
        </div>

        <div>
          <Label htmlFor="endTime">End Time</Label>
          <div className="mt-1 space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={useWeeklyEndTime}
                onChange={(e) => setUseWeeklyEndTime(e.target.checked)}
                className="rounded"
                disabled={isFormDisabled}
              />
              <span className="text-sm">Use weekly end time (next Monday 00:01 UTC)</span>
            </label>
            {!useWeeklyEndTime && (
              <Input
                id="endTime"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                min={new Date(minEndTime * 1000).toISOString().slice(0, 16)}
                disabled={isFormDisabled}
              />
            )}
          </div>
          <p className="text-xs text-(--app-foreground-muted) mt-1">
            {useWeeklyEndTime
              ? `Market will end on: ${endTimeDate.toLocaleString("en-US", { timeZone: "UTC" })} UTC`
              : `Minimum duration: ${Math.floor(minDuration / 86400)} day(s)`}
          </p>
        </div>

        <div>
          <Label htmlFor="maxBetAmount">Max Bet Amount (USDC)</Label>
          <Input
            id="maxBetAmount"
            type="number"
            placeholder="0 = no limit"
            value={maxBetAmount}
            onChange={(e) => setMaxBetAmount(e.target.value)}
            min="0"
            step="0.01"
            className="mt-1"
            disabled={isFormDisabled}
          />
          <p className="text-xs text-(--app-foreground-muted) mt-1">
            Maximum bet amount per user for this market. Set to 0 for no limit.
          </p>
        </div>

        {!isConnected && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              Please connect your wallet to create a market
            </p>
          </div>
        )}

        {isConnected && songId && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
            <div>
              <p className="text-sm font-medium mb-2">Prediction Market Question</p>
              <p className="text-sm font-semibold text-[#0052ff]">
                Will this song reach #1 in the weekly trending charts?
              </p>
              <p className="text-xs text-(--app-foreground-muted) mt-1">
                Users can bet YES (it will reach #1) or NO (it won&apos;t reach #1)
              </p>
            </div>
            <div className="border-t border-gray-200 pt-2 space-y-1">
              <p className="text-sm font-medium">Market Details</p>
              <div className="text-xs space-y-1 text-(--app-foreground-muted)">
                <p>Song: {selectedSong ? `${selectedSong.title} - ${selectedSong.artist}` : songId}</p>
                <p className="break-all">
                  Song ID: <span className="font-mono text-[10px]">{songId}</span>
                </p>
                <p>End Time: {endTimeDate.toLocaleString("en-US", { timeZone: "UTC" })} UTC</p>
                <p>Max Bet: {maxBetAmount === "0" ? "No limit" : `${maxBetAmount} USDC`}</p>
              </div>
            </div>
            {marketCreationFee && marketCreationFee > BigInt(0) && !isOwner && (
              <div className="border-t border-gray-200 pt-2 mt-2">
                <p className="text-sm font-medium text-orange-600">
                  ⚠️ Market Creation Fee: {formatUSDC(marketCreationFee)} USDC
                </p>
                <p className="text-xs text-(--app-foreground-muted) mt-1">
                  This fee will be charged when you create the market.
                </p>
              </div>
            )}
          </div>
        )}

        {isSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-800">Market created successfully!</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">
              Error: {error.message || "Failed to create market"}
            </p>
          </div>
        )}

        {isConnected && contractAddress && songId && (
          <Transaction calls={calls} onSuccess={handleSuccess}>
            <TransactionButton 
              text="Create Market"
              className="w-full bg-[#0052ff] hover:bg-[#0040cc] text-white"
            />
          </Transaction>
        )}
      </div>
    </Card>
  );
}

