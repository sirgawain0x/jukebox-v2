"use client";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { useAccount, useChainId } from "wagmi";
import {
  Transaction,
  TransactionButton,
  TransactionError,
} from "@coinbase/onchainkit/transaction";
import type { TransactionResponseType } from "@coinbase/onchainkit/transaction";
import { useComposeCast } from "@coinbase/onchainkit/minikit";
// import { useNotification } from "@coinbase/onchainkit/minikit";
import { Song, Playlist } from "@/types/music";
import { Card } from "../ui/Card";
import { Icon } from "../ui/Icon";
import { AnimatedAudioIndicator } from "../ui/AnimatedAudioIndicator";
import { Pills } from "../ui/Pills";
import { playlistABI } from "@/lib/contracts";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "../ui/ToastProvider";
import { useFarcasterTransactions } from "@/app/utils/farcaster-transactions";
import { useMusic } from "@/app/contexts/MusicContext";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type JukeboxProps = {
  onSongTipped: (song: Song) => void;
  setSelectedSong: (song: Song) => void;
  playlist: Playlist | null;
};

export function Jukebox({
  onSongTipped,
  setSelectedSong,
  playlist,
}: JukeboxProps) {
  // Use global music context for persistent player
  const globalMusic = useMusic();
  
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("TRENDING");
  const [after, setAfter] = useState<string | null>(null);
  const [before, setBefore] = useState<string | null>(null);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [pageInfo, setPageInfo] = useState<{
    endCursor: string | null;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
  }>({
    endCursor: null,
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
  });
  const { address: _address } = useAccount();
  const _chainId = useChainId();
  // const sendNotification = useNotification();
  const minTipEth = BigInt(Math.floor(0.00001429 * 1e18));
  const { composeCast } = useComposeCast();
  const { showToast, showInteractiveToast } = useToast();
  
  // Use OnchainKit's built-in wallet hooks
  const { address, isConnected, connector } = useAccount();
  const farcasterTransactions = useFarcasterTransactions();
  
  // Detect Farcaster context
  const isInFarcaster = typeof window !== 'undefined' && window.location.href.includes('farcaster');
  const isMiniapp = typeof window !== 'undefined' && window.location.href.includes('miniapp');
  const shouldUseFarcasterWallet = isInFarcaster || isMiniapp;
  
  const [failedImages, setFailedImages] = useState<{ [id: string]: boolean }>(
    {}
  );
  const [tipCount, setTipCount] = useState(0);
  const [hasSeenPlaylistPrompt, setHasSeenPlaylistPrompt] = useState(false);
  const errorHandledRef = useRef(false);
  const successHandledRef = useRef(false);

  // Use global music state for audio playback
  const selectedSong = globalMusic.selectedSong;
  const isPlaying = globalMusic.isPlaying;
  const audioLoading = globalMusic.audioLoading;
  const playQueue = globalMusic.playQueue;
  const currentQueueIndex = globalMusic.currentQueueIndex;
  const isAutoPlayEnabled = globalMusic.isAutoPlayEnabled;

  // Load tip count and prompt status from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTipCount = localStorage.getItem('jukebox_tip_count');
      const savedHasSeenPrompt = localStorage.getItem('jukebox_seen_playlist_prompt');
      if (savedTipCount) setTipCount(parseInt(savedTipCount, 10));
      if (savedHasSeenPrompt) setHasSeenPlaylistPrompt(savedHasSeenPrompt === 'true');
    }
  }, []);

  // Sharing functions
  const handleShareSong = useCallback(() => {
    if (!selectedSong) return;
    
    composeCast({
      text: `🎵 Currently vibing to "${selectedSong.title}" by ${selectedSong.artist}! Check out this amazing track on Jukebox 🎶`,
      embeds: [window.location.href]
    });
  }, [selectedSong, composeCast]);

  const handleShareTip = useCallback(() => {
    if (!selectedSong) return;
    
    composeCast({
      text: `💎 Just tipped ${selectedSong.artist} for their incredible track "${selectedSong.title}"! Supporting artists directly on the blockchain 🎵✨`,
      embeds: [window.location.href]
    });
  }, [selectedSong, composeCast]);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const sortOptions = [
    { label: "🔥 Trending", value: "TRENDING" },
    { label: "🆕 Newest", value: "CREATED_AT_TIME_DESC" },
  ];

  const handleSortChange = (newSort: string) => {
    setSortBy(newSort);
    setAfter(null);
    setBefore(null);
    setDirection("forward");
  };

  useEffect(() => {
    // Clear any pending fetch timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    setLoading(true);
    setError(null);

    // Debounce network requests to prevent rapid firing
    fetchTimeoutRef.current = setTimeout(async () => {
      try {
        // Different queries for different sort types
        let query = "";
        let dataPath = "";
        const variables: Record<string, unknown> = {};
        if (sortBy === "TRENDING") {
        if (direction === "forward") {
          variables.first = 10;
          if (after) variables.after = after;
        } else {
          variables.last = 10;
          if (before) variables.before = before;
        }
        query = `query TrendingTracks($first: Int, $last: Int, $after: Cursor, $before: Cursor) {
          allTrendingTracks(first: $first, last: $last, after: $after, before: $before) {
            edges {
              cursor
              node {
                processedTrackByTrackId {
                  id
                  createdAtTime
                  createdAtBlockNumber
                  title
                  slug
                  platformInternalId
                  lossyAudioIpfsHash
                  lossyAudioUrl
                  description
                  lossyArtworkIpfsHash
                  lossyArtworkUrl
                  websiteUrl
                  platformId
                  artistId
                  supportingArtist
                  insertionId
                  phasesUpdatedAtBlock
                  chorusStart
                  duration
                  lossyAudioMimeType
                  lossyArtworkMimeType
                  mintStart
                  artistByArtistId {
                    id
                    createdAtTime
                    createdAtBlockNumber
                    slug
                    userId
                    avatarUrl
                    name
                    avatarIpfsHash
                    description
                    customTheme
                    predefinedThemeName
                  }
                  platformByPlatformId {
                    id
                    type
                    name
                  }
                  artistBySupportingArtist {
                    id
                    createdAtTime
                    createdAtBlockNumber
                    slug
                    userId
                    description
                    customTheme
                    predefinedThemeName
                    name
                    avatarIpfsHash
                    avatarUrl
                    userByUserId {
                      id
                      avatarUrl
                      name
                      avatarIpfsHash
                      description
                      customTheme
                      predefinedThemeName
                      metadata
                    }
                  }
                }
              }
            }
            pageInfo {
              endCursor
              hasNextPage
              hasPreviousPage
              startCursor
            }
          }
        }`;
        dataPath = "allTrendingTracks";
      } else {
        if (direction === "forward") {
          variables.first = 10;
          if (after) variables.after = after;
        } else {
          variables.last = 10;
          if (before) variables.before = before;
        }
        variables.orderBy = [sortBy, "ID_DESC"];
        query = `query ProcessedTracks($first: Int, $last: Int, $after: Cursor, $before: Cursor, $orderBy: [ProcessedTracksOrderBy!]) {
          allProcessedTracks(first: $first, last: $last, after: $after, before: $before, orderBy: $orderBy) {
            edges {
              cursor
              node {
                id
                createdAtTime
                createdAtBlockNumber
                title
                slug
                platformInternalId
                lossyAudioIpfsHash
                lossyAudioUrl
                description
                lossyArtworkIpfsHash
                lossyArtworkUrl
                websiteUrl
                platformId
                artistId
                supportingArtist
                insertionId
                phasesUpdatedAtBlock
                chorusStart
                duration
                lossyAudioMimeType
                lossyArtworkMimeType
                mintStart
                artistByArtistId {
                  id
                  createdAtTime
                  createdAtBlockNumber
                  slug
                  userId
                  avatarUrl
                  name
                  avatarIpfsHash
                  description
                  customTheme
                  predefinedThemeName
                }
                platformByPlatformId {
                  id
                  type
                  name
                }
                artistBySupportingArtist {
                  id
                  createdAtTime
                  createdAtBlockNumber
                  slug
                  userId
                  description
                  customTheme
                  predefinedThemeName
                  name
                  avatarIpfsHash
                  avatarUrl
                  userByUserId {
                    id
                    avatarUrl
                    name
                    avatarIpfsHash
                    description
                    customTheme
                    predefinedThemeName
                    metadata
                  }
                }
              }
            }
            pageInfo {
              endCursor
              hasNextPage
              hasPreviousPage
              startCursor
            }
          }
        }`;
        dataPath = "allProcessedTracks";
      }

      type TrackNode = {
        id: string;
        title?: string;
        lossyArtworkUrl?: string;
        lossyAudioUrl?: string;
        artistByArtistId?: {
          name?: string;
        };
        platformByPlatformId?: {
          name?: string;
        };
        artistId?: string;
        processedTrackByTrackId?: Omit<TrackNode, "processedTrackByTrackId">;
      };

      const response = await fetch("https://api.spinamp.xyz/v3/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          variables,
        }),
      });

      const result = await response.json();

      if (result.errors) {
        console.error(result.errors);
        setError("Failed to fetch tracks.");
        return;
      }

      const connection = result.data?.[dataPath] || {};
      const edges: {
        node: TrackNode;
      }[] = connection.edges || [];
      const pageInfo = connection.pageInfo || {};
      setPageInfo({
        endCursor: pageInfo.endCursor || null,
        hasNextPage: !!pageInfo.hasNextPage,
        hasPreviousPage: !!pageInfo.hasPreviousPage,
        startCursor: pageInfo.startCursor || null,
      });

      if (!Array.isArray(edges) || edges.length === 0) {
        console.error("No edges returned for", sortBy, result);
      }

      const mappedSongs: Song[] = edges
        .map((edge: { node: TrackNode }) => {
          // Support both node structures
          let track: TrackNode | null = null;
          let artistId: string | undefined;
          if (sortBy === "TRENDING") {
            track = edge.node.processedTrackByTrackId || null;
            artistId = edge.node.processedTrackByTrackId?.artistId;
          } else {
            track = edge.node;
            artistId = edge.node.artistId;
          }
          if (!track) return null;
          return {
            id: track.id || "unknown-id",
            title: track.title || "Untitled",
            artist: track.artistByArtistId?.name || "Unknown Artist",
            cover: track.lossyArtworkUrl || "",
            creatorAddress: artistId?.split("/")[1] || "",
            audioUrl: track.lossyAudioUrl || "",
            playCount: 0,
            platformName: track.platformByPlatformId?.name || undefined,
          };
        })
        .filter(Boolean) as Song[];

      setSongs(mappedSongs);
      setLoading(false);
    } catch (error) {
      console.error("Failed to load songs from Spinamp:", error);
      setError("Failed to load songs from Spinamp.");
      setLoading(false);
    }
    }, 300); // 300ms debounce delay

    // Cleanup function
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [sortBy, after, before, direction]);

  const calls = useMemo(() => {
    if (!selectedSong || !address) {
      return [];
    }
    const tipCall = {
      to: selectedSong.creatorAddress as `0x${string}`,
      data: "0x" as `0x${string}`,
      value: minTipEth,
    };
    if (playlist?.address) {
      const addSongCall = {
        abi: playlistABI,
        address: playlist.address,
        functionName: "addSong",
        args: [
          selectedSong.id,
          selectedSong.title,
          selectedSong.artist,
          selectedSong.cover,
          selectedSong.audioUrl,
        ],
      };
      return [tipCall, addSongCall];
    }
    return [tipCall];
  }, [selectedSong, address, minTipEth, playlist]);

  const handleSuccess = useCallback(
    async (_response: TransactionResponseType) => {
      // Prevent multiple success handling for the same transaction
      if (successHandledRef.current || !selectedSong) {
        return;
      }
      
      successHandledRef.current = true;
      
      // Reset the flag after a short delay
      setTimeout(() => {
        successHandledRef.current = false;
      }, 1000);
      
      const newTipCount = tipCount + 1;
      setTipCount(newTipCount);
      
      // Persist to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('jukebox_tip_count', newTipCount.toString());
      }
      
      if (playlist) {
        // User has playlist - show success with confirmation
        showToast(`🎵 Tip sent to ${selectedSong.artist}! Song automatically added to "${playlist.name}"`);
      } else {
        // No playlist - progressive disclosure
        if (newTipCount === 1) {
          // First tip - subtle educational message
          showToast(`🎵 Tip sent to ${selectedSong.artist}! 💡 Create a playlist to auto-save songs you tip!`);
        } else if (newTipCount >= 2 && !hasSeenPlaylistPrompt) {
          // 2+ tips - show interactive prompt
          setHasSeenPlaylistPrompt(true);
          if (typeof window !== 'undefined') {
            localStorage.setItem('jukebox_seen_playlist_prompt', 'true');
          }
          
          showInteractiveToast({
            message: `🎵 You've tipped ${newTipCount} artists! Create a playlist to auto-save all your favorite songs!`,
            action: {
              label: "Create My Playlist",
              onClick: () => {
                // Scroll to and highlight playlist section
                setTimeout(() => {
                  const playlistSection = document.getElementById('playlist-section');
                  if (playlistSection) {
                    playlistSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Add highlight animation
                    playlistSection.classList.add('playlist-highlight');
                    setTimeout(() => {
                      playlistSection.classList.remove('playlist-highlight');
                    }, 2000);
                  }
                }, 100);
              }
            }
          });
        } else {
          // Subsequent tips after seeing prompt
          showToast(`🎵 Tip sent to ${selectedSong.artist}! Thank you for supporting the artist.`);
        }
      }
      
      onSongTipped(selectedSong);
      handleShareTip();
    },
    [selectedSong, onSongTipped, playlist, showToast, showInteractiveToast, handleShareTip, tipCount, hasSeenPlaylistPrompt]
  );

  // Custom transaction handler for Farcaster and regular wallets
  const handleCustomTransaction = useCallback(async () => {
    if (!selectedSong || !address) {
      showToast("❌ No song selected or wallet not connected");
      return;
    }

    console.log("Transaction attempt - Debug info:", {
      shouldUseFarcasterWallet,
      canUseFarcaster: farcasterTransactions.canUseFarcaster,
      isInFarcaster,
      isMiniapp,
      walletAddress: address,
      connectorName: connector?.name,
      isConnected
    });

    try {
      if (shouldUseFarcasterWallet && farcasterTransactions.canUseFarcaster) {
        console.log("Using Farcaster transaction handling");
        // Use Farcaster transaction handling
        const transactions = [];
        
        // Add tip transaction
        const tipTransaction = farcasterTransactions.createTipTransaction(
          selectedSong.creatorAddress,
          minTipEth.toString()
        );
        transactions.push(tipTransaction);

        // Add playlist transaction if applicable
        if (playlist?.address) {
          // For contract interactions, we need to encode the function call
          // This is a simplified version - in production you'd use proper ABI encoding
          const contractTransaction = farcasterTransactions.createContractTransaction(
            playlist.address,
            "0x", // This would be the encoded addSong function call
            "0"
          );
          transactions.push(contractTransaction);
        }

        const results = await farcasterTransactions.sendBatchTransactions(transactions);
        
        // Check if all transactions succeeded
        const allSuccessful = results.every(result => result.success);
        if (allSuccessful) {
          await handleSuccess({} as TransactionResponseType);
        } else {
          const failedResults = results.filter(result => !result.success);
          showToast(`❌ Transaction failed: ${failedResults[0]?.error || 'Unknown error'}`);
        }
      } else {
        console.log("Using regular wallet transaction handling");
        // Use regular OnchainKit transaction handling
        // This will be handled by the Transaction component
        showToast("💡 Please use the tip button below to send your transaction");
      }
    } catch (error) {
      console.error("Custom transaction error:", error);
      showToast(`❌ Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [selectedSong, address, shouldUseFarcasterWallet, connector?.name, isConnected, isInFarcaster, isMiniapp, farcasterTransactions, minTipEth, playlist, handleSuccess, showToast]);
  const handleSelectSong = useCallback((song: Song) => {
    // Use global music context to set the selected song
    globalMusic.setSelectedSong(song);
    setSelectedSong(song);
    
    // Start with minimized player when song is selected
    globalMusic.setIsMinimized(true);
  }, [globalMusic, setSelectedSong]);

  const handleRemoveFromQueue = useCallback((songToRemove: Song, indexToRemove: number) => {
    globalMusic.removeFromQueue(songToRemove.id, indexToRemove);
    showToast(`Removed "${songToRemove.title}" from queue`);
  }, [globalMusic, showToast]);

  const handlePreviousSong = useCallback(() => {
    globalMusic.handlePreviousSong();
  }, [globalMusic]);

  const handleNextSong = useCallback(() => {
    globalMusic.handleNextSong();
  }, [globalMusic]);

  const handleTransactionError = useCallback((error: TransactionError) => {
    // Prevent multiple error handling for the same transaction
    if (errorHandledRef.current) {
      return;
    }
    
    errorHandledRef.current = true;
    
    // Reset the flag after a short delay
    setTimeout(() => {
      errorHandledRef.current = false;
    }, 1000);
    
    // console.error("Transaction failed:", error.message);
    
    // Handle different error types gracefully
    if (error.message.includes("Request denied") || error.message.includes("User rejected") || error.message.includes("User denied")) {
      // Don't show toast for user cancellation - this is normal behavior
      return;
    } else if (error.message.includes("insufficient funds") || error.message.includes("Insufficient funds")) {
      showToast("💰 Insufficient funds - please add more ETH to your wallet");
    } else if (error.message.includes("gas") || error.message.includes("Gas")) {
      showToast("⛽ Transaction failed due to gas issues - please try again");
    } else if (error.message.includes("network") || error.message.includes("Network")) {
      showToast("🌐 Network error - please check your connection and try again");
    } else {
      showToast("❌ Transaction failed - please try again");
    }
  }, [showToast]);

  // Audio playback is now handled by the global MusicContext
  // No need for local audio effect hooks

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end event
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = playQueue.findIndex((item) => item.id === active.id);
      const newIndex = playQueue.findIndex((item) => item.id === over.id);
      
      globalMusic.reorderQueue(oldIndex, newIndex);
    }
  };

  // Sortable queue item component
  const SortableQueueItem = ({ song, index }: { song: Song; index: number }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: song.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        className={`flex items-center p-2 rounded text-sm transition-colors ${
          index === currentQueueIndex
            ? 'bg-[#0052ff]/10 border border-[#0052ff]/20'
            : 'hover:bg-(--app-card-border)'
        } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        {/* Drag handle */}
        <div
          {...listeners}
          className="mr-2 cursor-grab active:cursor-grabbing text-(--app-foreground-muted) hover:text-(--app-foreground)"
          title="Drag to reorder"
          aria-label="Drag to reorder queue item"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className="w-4 h-4 rotate-90"
            aria-hidden="true"
          >
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </div>
        
        <span className="w-6 text-center text-xs text-(--app-foreground-muted)">
          {index + 1}
        </span>
        {song.cover && (
          <Image
            src={song.cover}
            alt={song.title}
            width={32}
            height={32}
            className="w-8 h-8 rounded object-cover ml-2"
            unoptimized
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
        <div className="flex-1 ml-2 min-w-0">
          <div className="font-medium truncate">{song.title}</div>
          <div className="text-xs text-(--app-foreground-muted) truncate">
            {song.artist}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {index === currentQueueIndex && (
            <Icon name="music" className="text-[#0052ff]" />
          )}
          <button
            onClick={() => handleRemoveFromQueue(song, index)}
            className="p-1 hover:bg-red-100 rounded transition-colors text-red-500 hover:text-red-700 cursor-pointer"
            title="Remove from queue"
            aria-label={`Remove ${song.title} from queue`}
          >
            <Icon name="x" size="sm" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <Card title="🎵 Discover Music">
      <div className="space-y-4">
        {/* Debug info for Farcaster context */}
        {process.env.NODE_ENV === 'development' && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs">
            <div className="font-medium text-blue-800 mb-2">🔧 Debug Info:</div>
            <div className="space-y-1 text-blue-700">
              <div>Wallet Connected: {isConnected ? '✅' : '❌'}</div>
              <div>Address: {address || 'None'}</div>
              <div>In Farcaster: {isInFarcaster ? '✅' : '❌'}</div>
              <div>Is Miniapp: {isMiniapp ? '✅' : '❌'}</div>
              <div>Use Farcaster Wallet: {shouldUseFarcasterWallet ? '✅' : '❌'}</div>
              <div>Connector: {connector?.name || 'None'}</div>
            </div>
          </div>
        )}
        <div className="space-y-3">
          <div className="text-sm font-medium text-(--app-foreground-muted)">
            Sort by:
          </div>
          <Pills
            options={sortOptions}
            value={sortBy}
            onChange={handleSortChange}
          />
        </div>
        {loading ? (
          <div className="grid grid-cols-1 gap-4" aria-label="Loading songs">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="flex items-center p-3 rounded-lg border border-(--app-card-border) bg-(--app-card-bg)"
              >
                <Skeleton className="w-12 h-12 rounded-lg mr-4" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4">
              {songs.map((song) => (
                <div
                  key={song.id}
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedSong?.id === song.id
                      ? "border-[#0052ff] bg-[#e6edff]"
                      : "border-[rgba(0,0,0,0.1)] bg-[rgba(255,255,255,0.4)]"
                  }`}
                  onClick={() => handleSelectSong(song)}
                >
                  {song.cover && !failedImages[song.id] ? (
                    <Image
                      src={song.cover}
                      alt={song.title}
                      width={48}
                      height={48}
                      className="w-12 h-12 rounded-lg object-cover mr-4"
                      unoptimized
                      onError={() =>
                        setFailedImages((prev) => ({
                          ...prev,
                          [song.id]: true,
                        }))
                      }
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-(--app-gray) mr-4 flex items-center justify-center">
                      <Icon
                        name="star"
                        size="sm"
                        className="text-(--app-foreground-muted)"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-(--app-foreground) truncate">
                      {song.title}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="text-xs text-(--app-foreground-muted) truncate">
                        {song.artist}
                      </div>
                      {song.platformName && (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[#e6edff] text-[#0052ff] whitespace-nowrap shrink-0">
                          {song.platformName}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {selectedSong?.id === song.id && (
                      <AnimatedAudioIndicator 
                        isPlaying={isPlaying && selectedSong?.id === song.id}
                        size="sm"
                        className="text-[#0052ff]"
                        variant="bars"
                      />
                    )}
                    {/* Quick share button */}
                    {isMiniapp && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          composeCast({
                            text: `🎵 Check out "${song.title}" by ${song.artist}! Discovered this amazing track on Jukebox 🎶`,
                            embeds: [window.location.href]
                          });
                          showToast(`Shared "${song.title}" to Farcaster!`);
                        }}
                        className="p-1 hover:bg-blue-100 rounded transition-all duration-200 cursor-pointer hover:scale-110"
                        title="Quick share to Farcaster"
                        aria-label={`Share ${song.title} to Farcaster`}
                      >
                        <Icon name="share" size="sm" className="text-blue-600" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const isInQueue = playQueue.some(queueSong => queueSong.id === song.id);
                        if (isInQueue) {
                          // Remove from queue - find the index
                          const index = playQueue.findIndex(queueSong => queueSong.id === song.id);
                          if (index >= 0) {
                            globalMusic.removeFromQueue(song.id, index);
                            showToast(`Removed "${song.title}" from queue`);
                          }
                        } else {
                          // Add to queue
                          globalMusic.addToQueue(song);
                          showToast(`Added "${song.title}" to queue`);
                        }
                      }}
                      className="p-1 hover:bg-(--app-card-border) rounded transition-all duration-200 cursor-pointer hover:scale-150"
                      title={playQueue.some(queueSong => queueSong.id === song.id) ? "Remove from queue" : "Add to queue"}
                      aria-label={playQueue.some(queueSong => queueSong.id === song.id) ? `Remove ${song.title} from queue` : `Add ${song.title} to queue`}
                    >
                      <Icon 
                        name={playQueue.some(queueSong => queueSong.id === song.id) ? "check" : "plus"} 
                        size="sm" 
                      />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-4">
              <button
                className="px-4 py-2 rounded bg-gray-200 text-(--app-foreground-muted) cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  setBefore(pageInfo.startCursor);
                  setAfter(null);
                  setDirection("backward");
                }}
                disabled={!pageInfo.hasPreviousPage || loading}
              >
                Previous
              </button>
              <button
                className="px-4 py-2 rounded bg-gray-200 text-(--app-foreground-muted) cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  setAfter(pageInfo.endCursor);
                  setBefore(null);
                  setDirection("forward");
                }}
                disabled={!pageInfo.hasNextPage || loading}
              >
                Next
              </button>
            </div>
          </>
        )}
        {selectedSong && (
          <div className="mt-4 space-y-2">
            {/* Selected song details */}
            <div className="bg-[#0052ff] text-white p-4 rounded-lg">
              <div className="flex items-center gap-3">
                {selectedSong.cover && !failedImages[selectedSong.id] ? (
                  <Image
                    src={selectedSong.cover}
                    alt={selectedSong.title}
                    width={64}
                    height={64}
                    className="w-16 h-16 rounded-lg object-cover"
                    unoptimized
                    onError={() =>
                      setFailedImages((prev) => ({
                        ...prev,
                        [selectedSong.id]: true,
                      }))
                    }
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-white/20 flex items-center justify-center">
                    <Icon
                      name="star"
                      size="md"
                      className="text-white"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{selectedSong.title}</h3>
                  <p className="text-sm opacity-90">{selectedSong.artist}</p>
                </div>
                <AnimatedAudioIndicator 
                  isPlaying={isPlaying}
                  size="md"
                  className="text-white"
                  variant="bars"
                />
              </div>
              
              {/* Audio playback is now handled by the global MusicContext */}
              {/* Visual controls and status */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={handlePreviousSong}
                    disabled={playQueue.length <= 1}
                    className="p-2 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    title="Previous song"
                    aria-label="Previous song"
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      className="w-5 h-5 text-white"
                    >
                      <polygon points="11 19 2 12 11 5 11 19" />
                      <polygon points="22 19 13 12 22 5 22 19" />
                    </svg>
                  </button>

                  <button
                    onClick={() => globalMusic.togglePlayPause()}
                    className="p-3 bg-white/20 hover:bg-white/30 rounded-full transition-colors cursor-pointer"
                    title={isPlaying ? "Pause" : "Play"}
                    aria-label={isPlaying ? "Pause" : "Play"}
                  >
                    {audioLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : isPlaying ? (
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 24 24" 
                        fill="currentColor"
                        className="w-5 h-5 text-white"
                      >
                        <rect x="6" y="4" width="4" height="16" />
                        <rect x="14" y="4" width="4" height="16" />
                      </svg>
                    ) : (
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 24 24" 
                        fill="currentColor"
                        className="w-5 h-5 text-white"
                      >
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    )}
                  </button>

                  <button
                    onClick={handleNextSong}
                    disabled={playQueue.length <= 1}
                    className="p-2 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    title="Next song"
                    aria-label="Next song"
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      className="w-5 h-5 text-white"
                    >
                      <polygon points="13 19 22 12 13 5 13 19" />
                      <polygon points="2 19 11 12 2 5 2 19" />
                    </svg>
                  </button>
                </div>
                
                {/* Audio loading indicator */}
                {audioLoading && (
                  <div className="flex items-center justify-center gap-2 text-white text-sm">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading audio...
                  </div>
                )}
              </div>
              
              {/* Tip button */}
              {shouldUseFarcasterWallet ? (
                // Farcaster-specific tip button
                <div className="w-full mt-3">
                  <div className="text-center mb-2">
                    <p className="text-sm font-medium text-white/90">
                      Tip {selectedSong?.artist} in ETH
                    </p>
                    <p className="text-xs text-white/70">
                      🎯 Using Farcaster wallet
                    </p>
                  </div>
                  <button
                    onClick={handleCustomTransaction}
                    className="w-full bg-white text-[#0052ff] hover:bg-gray-100 py-3 px-4 rounded-lg font-medium transition-colors"
                  >
                    💎 Tip Artist
                  </button>
                  <div className="text-center mb-2">
                    {!playlist && (
                      <p className="text-xs text-white/70 mt-1">
                        💡 Create a playlist to auto-save songs you tip!
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                // Regular wallet tip button
                <Transaction
                  key={selectedSong.id}
                  calls={calls}
                  onSuccess={handleSuccess}
                  onError={handleTransactionError}
                >
                  <div className="w-full mt-3">
                    <div className="text-center mb-2">
                      <p className="text-sm font-medium text-white/90">
                        Tip {selectedSong?.artist} in ETH
                      </p>
                    </div>
                    <TransactionButton className="w-full bg-white text-[#0052ff] hover:bg-gray-100" />
                    <div className="text-center mb-2">
                      {!playlist && (
                        <p className="text-xs text-white/70 mt-1">
                          💡 Create a playlist to auto-save songs you tip!
                        </p>
                      )}
                    </div>
                  </div>
                </Transaction>
              )}

               {/* Share Song Button */}
               {isMiniapp && (
                 <button
                   onClick={handleShareSong}
                   className="w-full mt-3 bg-white/20 hover:bg-white/30 text-white rounded-lg py-2 px-4 transition-all duration-200 flex items-center justify-center gap-2 text-sm font-medium cursor-pointer"
                 >
                   <Icon name="share" size="sm" />
                   Share This Track
                 </button>
               )}
            </div>
          </div>
        )}

        {/* Play Queue UI */}
        {playQueue.length > 0 && (
          <div className="mt-4 p-4 bg-white/50 rounded-lg border border-(--app-card-border)">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-(--app-foreground)">Play Queue</h4>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-(--app-foreground) cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAutoPlayEnabled}
                    onChange={(e) => globalMusic.setAutoPlayEnabled(e.target.checked)}
                    className="rounded cursor-pointer"
                  />
                  Auto-play next
                </label>
                <button
                  onClick={() => {
                    globalMusic.clearQueue();
                    showToast("Queue cleared");
                  }}
                  className="text-xs text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                >
                  Clear Queue
                </button>
              </div>
            </div>
            
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={playQueue.map(song => song.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {playQueue.map((song, index) => (
                    <SortableQueueItem
                      key={song.id}
                      song={song}
                      index={index}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            
            {playQueue.length > 1 && (
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-(--app-card-border)">
                <button
                  onClick={handlePreviousSong}
                  className="flex items-center gap-1 text-sm text-(--app-foreground-muted) hover:text-(--app-foreground) transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                  disabled={playQueue.length <= 1}
                >
                  <Icon name="chevron-left" size="sm" />
                  Previous
                </button>
                
                <span className="text-xs text-(--app-foreground-muted)">
                  {currentQueueIndex + 1} of {playQueue.length}
                </span>
                
                <button
                  onClick={handleNextSong}
                  className="flex items-center gap-1 text-sm text-(--app-foreground-muted) hover:text-(--app-foreground) transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                  disabled={playQueue.length <= 1}
                >
                  Next
                  <Icon name="chevron-right" size="sm" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
