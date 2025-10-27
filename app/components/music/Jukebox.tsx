"use client";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { useAccount, useChainId } from "wagmi";
import {
  Transaction,
  TransactionButton,
  TransactionToast,
  TransactionToastAction,
  TransactionToastIcon,
  TransactionToastLabel,
  TransactionError,
  TransactionStatusAction,
  TransactionStatusLabel,
  TransactionStatus,
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
  arrayMove,
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
  const [selectedSong, _setSelectedSong] = useState<Song | null>(null);
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
  const { address } = useAccount();
  const _chainId = useChainId();
  // const sendNotification = useNotification();
  const minTipEth = BigInt(Math.floor(0.00001429 * 1e18));
  const { composeCast } = useComposeCast();
  const { showToast, showInteractiveToast } = useToast();
  
  const [failedImages, setFailedImages] = useState<{ [id: string]: boolean }>(
    {}
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tipCount, setTipCount] = useState(0);
  const [hasSeenPlaylistPrompt, setHasSeenPlaylistPrompt] = useState(false);
  const errorHandledRef = useRef(false);
  const successHandledRef = useRef(false);

  // Continuous playback queue states
  const [playQueue, setPlayQueue] = useState<Song[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  const [isAutoPlayEnabled, setIsAutoPlayEnabled] = useState(true);

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
    fetchTimeoutRef.current = setTimeout(() => {
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

    fetch("https://api.spinamp.xyz/v3/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    })
      .then((res) => res.json())
      .then((result) => {
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
      })
      .catch(() => {
        setError("Failed to load songs from Spinamp.");
        setLoading(false);
      });
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
  const handleSelectSong = useCallback((song: Song) => {
    _setSelectedSong(song);
    setSelectedSong(song);
    
    // Add to queue if not already present and update current index
    setPlayQueue(prevQueue => {
      const newQueue = prevQueue.find(s => s.id === song.id) 
        ? prevQueue 
        : [...prevQueue, song];
      
      // Update current index based on the new queue
      const existingIndex = newQueue.findIndex((s: Song) => s.id === song.id);
      setCurrentQueueIndex(existingIndex >= 0 ? existingIndex : newQueue.length - 1);
      
      return newQueue;
    });
  }, [setSelectedSong]);

  const handleRemoveFromQueue = useCallback((songToRemove: Song, indexToRemove: number) => {
    setPlayQueue(prevQueue => {
      const newQueue = prevQueue.filter((_, index) => index !== indexToRemove);
      
      // Update current queue index if necessary
      setCurrentQueueIndex(prevIndex => {
        if (indexToRemove < prevIndex) {
          // If we removed a song before the current one, shift the index down
          return prevIndex - 1;
        } else if (indexToRemove === prevIndex) {
          // If we removed the currently playing song, stay at the same index or go to previous
          if (newQueue.length === 0) {
            return 0;
          }
          // If we're at the end, go to the previous song
          return prevIndex >= newQueue.length ? newQueue.length - 1 : prevIndex;
        }
        // If we removed a song after the current one, no change needed
        return prevIndex;
      });
      
      return newQueue;
    });
    
    showToast(`Removed "${songToRemove.title}" from queue`);
  }, [showToast]);

  const handlePreviousSong = useCallback(() => {
    setPlayQueue(currentQueue => {
      if (currentQueue.length <= 1) return currentQueue;
      
      setCurrentQueueIndex(prevIndex => {
        const newIndex = prevIndex > 0 ? prevIndex - 1 : currentQueue.length - 1;
        const prevSong = currentQueue[newIndex];
        if (prevSong) {
          _setSelectedSong(prevSong);
          setSelectedSong(prevSong);
        }
        return newIndex;
      });
      
      return currentQueue;
    });
  }, [setSelectedSong]);

  const handleNextSong = useCallback(() => {
    setPlayQueue(currentQueue => {
      if (currentQueue.length <= 1) return currentQueue;
      
      setCurrentQueueIndex(prevIndex => {
        const newIndex = (prevIndex + 1) % currentQueue.length;
        const nextSong = currentQueue[newIndex];
        if (nextSong) {
          _setSelectedSong(nextSong);
          setSelectedSong(nextSong);
        }
        return newIndex;
      });
      
      return currentQueue;
    });
  }, [setSelectedSong]);

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

  useEffect(() => {
    // Capture the current audio element for cleanup
    const audio = audioRef.current;
    
    if (selectedSong && audio) {
      // Try to play the audio when a new song is selected
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay might be blocked, ignore error
        });
      }
    }

    // Cleanup function to pause audio when component unmounts or song changes
    return () => {
      if (audio) {
        audio.pause();
        setIsPlaying(false);
      }
    };
  }, [selectedSong]);

  // Track audio playing state
  useEffect(() => {
    const audio = audioRef.current;
    
    if (audio) {
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);
      const handleEnded = () => setIsPlaying(false);
      
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('ended', handleEnded);
      
      return () => {
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('ended', handleEnded);
      };
    }
  }, [selectedSong]);

  // Auto-play next song when current song ends
  useEffect(() => {
    const audio = audioRef.current;
    
    const handleEnded = () => {
      if (isAutoPlayEnabled && playQueue.length > 0) {
        const nextIndex = (currentQueueIndex + 1) % playQueue.length;
        setCurrentQueueIndex(nextIndex);
        
        // Auto-select and play next song
        const nextSong = playQueue[nextIndex];
        if (nextSong) {
          _setSelectedSong(nextSong);
          setSelectedSong(nextSong);
          
          // Small delay to ensure audio element is ready
          setTimeout(() => {
            if (audio) {
              audio.currentTime = 0;
              audio.play().catch(() => {
                // Autoplay might be blocked, ignore error
              });
            }
          }, 100);
        }
      }
    };

    if (audio) {
      audio.addEventListener('ended', handleEnded);
      return () => audio.removeEventListener('ended', handleEnded);
    }
  }, [isAutoPlayEnabled, playQueue, currentQueueIndex]);

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
      setPlayQueue((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newQueue = arrayMove(items, oldIndex, newIndex);
        
        // Update currentQueueIndex if necessary
        setCurrentQueueIndex(oldCurrentIndex => {
          let newCurrentIndex = oldCurrentIndex;

          if (oldIndex === oldCurrentIndex) {
            // The currently playing song was moved
            newCurrentIndex = newIndex;
          } else if (oldIndex < oldCurrentIndex && newIndex >= oldCurrentIndex) {
            // A song before the current one was moved after it
            newCurrentIndex = oldCurrentIndex - 1;
          } else if (oldIndex > oldCurrentIndex && newIndex <= oldCurrentIndex) {
            // A song after the current one was moved before it
            newCurrentIndex = oldCurrentIndex + 1;
          }

          return newCurrentIndex;
        });
        
        return newQueue;
      });
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
            : 'hover:bg-[var(--app-card-border)]'
        } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        {/* Drag handle */}
        <div
          {...listeners}
          className="mr-2 cursor-grab active:cursor-grabbing text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)]"
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
        
        <span className="w-6 text-center text-xs text-[var(--app-foreground-muted)]">
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
          <div className="text-xs text-[var(--app-foreground-muted)] truncate">
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
        <div className="space-y-3">
          <div className="text-sm font-medium text-[var(--app-foreground-muted)]">
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
                className="flex items-center p-3 rounded-lg border border-[var(--app-card-border)] bg-[var(--app-card-bg)]"
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
                    <div className="w-12 h-12 rounded-lg bg-[var(--app-gray)] mr-4 flex items-center justify-center">
                      <Icon
                        name="star"
                        size="sm"
                        className="text-[var(--app-foreground-muted)]"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[var(--app-foreground)] truncate">
                      {song.title}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="text-xs text-[var(--app-foreground-muted)] truncate">
                        {song.artist}
                      </div>
                      {song.platformName && (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[#e6edff] text-[#0052ff] whitespace-nowrap flex-shrink-0">
                          {song.platformName}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {selectedSong?.id === song.id && (
                      <AnimatedAudioIndicator 
                        isPlaying={isPlaying && selectedSong?.id === song.id}
                        size="sm"
                        className="text-[#0052ff]"
                        variant="bars"
                      />
                    )}
                    {/* Quick share button */}
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
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const isInQueue = playQueue.some(queueSong => queueSong.id === song.id);
                        if (isInQueue) {
                          // Remove from queue
                          setPlayQueue(prevQueue => prevQueue.filter(queueSong => queueSong.id !== song.id));
                          showToast(`Removed "${song.title}" from queue`);
                        } else {
                          // Add to queue
                          setPlayQueue(prevQueue => [...prevQueue, song]);
                          showToast(`Added "${song.title}" to queue`);
                        }
                      }}
                      className="p-1 hover:bg-[var(--app-card-border)] rounded transition-all duration-200 cursor-pointer hover:scale-150"
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
                className="px-4 py-2 rounded bg-gray-200 text-[var(--app-foreground-muted)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="px-4 py-2 rounded bg-gray-200 text-[var(--app-foreground-muted)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
              
              {/* Audio controls */}
              <audio
                ref={audioRef}
                src={selectedSong.audioUrl}
                className="w-full mt-4 rounded"
                autoPlay
                preload="auto"
                onLoadStart={() => setAudioLoading(true)}
                onCanPlay={() => setAudioLoading(false)}
                onError={() => setAudioLoading(false)}
                controlsList="nodownload"
                controls
              />
              
              {/* Audio loading indicator */}
              {audioLoading && (
                <div className="flex items-center justify-center gap-2 text-white text-sm mt-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading audio...
                </div>
              )}
              
              {/* Tip button */}
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

               {/* Share Song Button */}
               <button
                 onClick={handleShareSong}
                 className="w-full mt-3 bg-white/20 hover:bg-white/30 text-white rounded-lg py-2 px-4 transition-all duration-200 flex items-center justify-center gap-2 text-sm font-medium"
               >
                 <Icon name="share" size="sm" />
                 Share This Track
               </button>
            </div>
          </div>
        )}

        {/* Play Queue UI */}
        {playQueue.length > 0 && (
          <div className="mt-4 p-4 bg-white/50 rounded-lg border border-[var(--app-card-border)]">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-[var(--app-foreground)]">Play Queue</h4>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-[var(--app-foreground)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAutoPlayEnabled}
                    onChange={(e) => setIsAutoPlayEnabled(e.target.checked)}
                    className="rounded cursor-pointer"
                  />
                  Auto-play next
                </label>
                <button
                  onClick={() => {
                    setPlayQueue([]);
                    setCurrentQueueIndex(0);
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
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-[var(--app-card-border)]">
                <button
                  onClick={handlePreviousSong}
                  className="flex items-center gap-1 text-sm text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)] transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                  disabled={playQueue.length <= 1}
                >
                  <Icon name="chevron-left" size="sm" />
                  Previous
                </button>
                
                <span className="text-xs text-[var(--app-foreground-muted)]">
                  {currentQueueIndex + 1} of {playQueue.length}
                </span>
                
                <button
                  onClick={handleNextSong}
                  className="flex items-center gap-1 text-sm text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)] transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
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
