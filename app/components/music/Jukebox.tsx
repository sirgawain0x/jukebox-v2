"use client";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
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
import { useNotification } from "@coinbase/onchainkit/minikit";
import { Song, Playlist } from "@/types/music";
import { Card } from "../ui/Card";
import { Icon } from "../ui/Icon";
import { Pills } from "../ui/Pills";
import { playlistABI } from "@/lib/contracts";
import { Skeleton } from "@/components/ui/skeleton";

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
  const sendNotification = useNotification();
  const minTipEth = BigInt(Math.floor(0.00001429 * 1e18));
  const [failedImages, setFailedImages] = useState<{ [id: string]: boolean }>(
    {}
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
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
    async (response: TransactionResponseType) => {
      const transactionHash = response.transactionReceipts[0].transactionHash;

      if (playlist && selectedSong) {
        // TODO: Replace with actual contract call to add song to playlist
        console.log(
          `Adding song ${selectedSong.id} to playlist ${playlist.name} (${playlist.address})`
        );
        // This is where you would make a write call to your playlist contract
        // For example:
        // const { write } = useContractWrite({
        //   address: playlist.address,
        //   abi: playlistABI,
        //   functionName: 'addSong',
        // });
        // write({ args: [selectedSong.id, selectedSong.metadataUrl] });
      }

      await sendNotification({
        title: "Thank you!",
        body: `You tipped the creator! Tx: ${transactionHash}`,
      });
      if (selectedSong) {
        onSongTipped(selectedSong);
      }
    },
    [sendNotification, selectedSong, onSongTipped, playlist]
  );
  function handleSelectSong(song: Song) {
    _setSelectedSong(song);
    setSelectedSong(song);
  }

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
      }
    };
  }, [selectedSong]);

  return (
    <Card title=" Discover Music">
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
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={song.cover}
                      alt={song.title}
                      className="w-12 h-12 rounded-lg object-cover mr-4"
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
                  <div className="flex-1">
                    <div className="font-medium text-[var(--app-foreground)] flex items-center gap-2">
                      {song.title}
                      {song.platformName && (
                        <span className="ml-2 px-2 py-0.5 rounded text-xs font-semibold bg-[#e6edff] text-[#0052ff]">
                          {song.platformName}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--app-foreground-muted)]">
                      {song.artist}
                    </div>
                  </div>
                  {selectedSong?.id === song.id && (
                    <Icon name="check" className="text-[#0052ff]" />
                  )}
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
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedSong.cover}
                    alt={selectedSong.title}
                    className="w-16 h-16 rounded-lg object-cover"
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
                <Icon name="check" className="text-white" />
              </div>
              
              {/* Audio controls */}
              <audio
                ref={audioRef}
                controls
                src={selectedSong.audioUrl}
                className="w-full mt-4 rounded"
                autoPlay
                preload="auto"
                onLoadStart={() => setAudioLoading(true)}
                onCanPlay={() => setAudioLoading(false)}
                onError={() => setAudioLoading(false)}
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
                calls={calls}
                onSuccess={handleSuccess}
                onError={(error: TransactionError) =>
                  sendNotification({
                    title: "Transaction failed",
                    body: error.message,
                  })
                }
              >
                <div className="w-full mt-3">
                  <TransactionButton className="w-full bg-white text-[#0052ff] hover:bg-gray-100" />
                </div>
                <TransactionStatus>
                  <TransactionStatusAction />
                  <TransactionStatusLabel />
                </TransactionStatus>
                <TransactionToast className="mb-4">
                  <TransactionToastIcon />
                  <TransactionToastLabel />
                  <TransactionToastAction />
                </TransactionToast>
              </Transaction>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
