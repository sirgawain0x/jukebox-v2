import { createPublicClient, http } from "viem";
import type { AbiEvent } from "viem";
import { base } from "viem/chains";
import { getAutomatedPredictionMarketAddress, automatedPredictionMarketABI } from "@/lib/contracts/automated-prediction-market";
import { fetchTrendingSongs, type TrendingTrack } from "@/lib/trending-songs";
import type { PredictionMarket } from "@/types/prediction-market";
import {
  cacheBetCounts,
  cacheDeploymentBlock,
  getCachedBetCounts,
  getCachedDeploymentBlock,
  getCachedSongMetadata,
  saveSongMetadata,
} from "@/lib/prediction-cache";

const DEFAULT_BASE_RPC = process.env.NEXT_PUBLIC_RPC_URL || "https://mainnet.base.org";
const BIGINT_ZERO = BigInt(0);
const BIGINT_ONE = BigInt(1);
const BET_COUNT_CHUNK = BigInt(2000);

type MarketCreationLog = {
  marketId: number;
  blockNumber: bigint;
};

type FetchMarketsOptions = {
  includeResolved?: boolean;
  includeExpired?: boolean;
};

function createBaseClient() {
  return createPublicClient({
    chain: base,
    transport: http(DEFAULT_BASE_RPC),
  }) as ReturnType<typeof createPublicClient>;
}

function getAbiEvent(name: string): AbiEvent | undefined {
  return automatedPredictionMarketABI.find((item) => item.type === "event" && "name" in item && item.name === name) as
    | AbiEvent
    | undefined;
}

async function fetchSongMetadata(
  songId: string,
  songCache: Map<string, { title: string; artist: string; cover: string } | null>,
  trendingMap: Map<string, TrendingTrack>
): Promise<{ title: string; artist: string; cover: string } | null> {
  if (trendingMap.has(songId)) {
    const song = trendingMap.get(songId)!;
    const fromTrending = {
      title: song.title,
      artist: song.artist,
      cover: song.cover,
    };
    songCache.set(songId, fromTrending);
    await saveSongMetadata(songId, { ...fromTrending, source: "trending", isFallback: false });
    return fromTrending;
  }

  if (songCache.has(songId)) return songCache.get(songId) ?? null;

  const cached = await getCachedSongMetadata(songId);
  if (cached && !cached.isFallback) {
    const resolved = {
      title: cached.title,
      artist: cached.artist,
      cover: cached.cover,
    };
    songCache.set(songId, resolved);
    return resolved;
  }

  try {
    const query = `
      query GetTrack($id: ID!) {
        processedTrackByTrackId(id: $id) {
          id
          title
          lossyArtworkUrl
          artistByArtistId {
            name
          }
        }
      }
    `;

    const response = await fetch("https://api.spinamp.xyz/v3/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: { id: songId },
      }),
    });

    if (!response.ok) {
      const fallback = {
        title: songId,
        artist: "Unknown Artist",
        cover: "",
      };
      songCache.set(songId, fallback);
      await saveSongMetadata(songId, { ...fallback, source: "fallback", isFallback: true });
      return fallback;
    }

    const result = await response.json();
    const track = result.data?.processedTrackByTrackId;
    if (!track) {
      const fallback = {
        title: songId,
        artist: "Unknown Artist",
        cover: "",
      };
      songCache.set(songId, fallback);
      await saveSongMetadata(songId, { ...fallback, source: "fallback", isFallback: true });
      return fallback;
    }

    const resolved = {
      title: track.title || "Unknown Title",
      artist: track.artistByArtistId?.name || "Unknown Artist",
      cover: track.lossyArtworkUrl || "",
    };

    songCache.set(songId, resolved);
    await saveSongMetadata(songId, { ...resolved, source: "spinamp", isFallback: false });
    return resolved;
  } catch (error) {
    console.error(`Failed to fetch Spinamp metadata for song ${songId}:`, error);
    if (cached) {
      const resolved = {
        title: cached.title,
        artist: cached.artist,
        cover: cached.cover,
      };
      songCache.set(songId, resolved);
      return resolved;
    }

    const fallback = {
      title: songId,
      artist: "Unknown Artist",
      cover: "",
    };
    songCache.set(songId, fallback);
    await saveSongMetadata(songId, { ...fallback, source: "fallback", isFallback: true });
    return fallback;
  }
}

async function fetchMarketCreationLogs(
  client: ReturnType<typeof createPublicClient>,
  contractAddress: string
): Promise<MarketCreationLog[]> {
  const marketCreatedEvent = getAbiEvent("MarketCreated");
  if (!marketCreatedEvent) return [];

  try {
    const cachedDeploymentBlock = await getCachedDeploymentBlock(contractAddress);
    const fromBlock = cachedDeploymentBlock ?? BIGINT_ZERO;

    const logs = await client.getLogs({
      address: contractAddress as `0x${string}`,
      event: marketCreatedEvent,
      fromBlock,
    });

    const mapped = (logs || []).map((log) => {
      const args = "args" in log ? (log.args as Record<string, unknown> | undefined) : undefined;
      const marketIdValue = args?.marketId;
      const marketId =
        typeof marketIdValue === "number"
          ? marketIdValue
          : typeof marketIdValue === "bigint"
            ? Number(marketIdValue)
            : 0;

      return {
        marketId,
        blockNumber: log.blockNumber ?? BIGINT_ZERO,
      };
    });

    if (mapped.length) {
      const earliestBlock = mapped.reduce<bigint>((min, log) => {
        return log.blockNumber < min ? log.blockNumber : min;
      }, mapped[0].blockNumber);

      await cacheDeploymentBlock(contractAddress, earliestBlock);
    }

    return mapped;
  } catch (error) {
    console.error("Failed to load MarketCreated logs:", error);
    return [];
  }
}

async function fetchBetCounts(
  client: ReturnType<typeof createPublicClient>,
  contractAddress: string,
  startBlock: bigint
): Promise<Map<number, number>> {
  const betPlacedEvent = getAbiEvent("BetPlaced");
  if (!betPlacedEvent) return new Map();

  const cachedCounts = await getCachedBetCounts(contractAddress);
  if (cachedCounts) return cachedCounts;

  const betCounts = new Map<number, number>();

  try {
    const latestBlock = await client.getBlockNumber();

    let fromBlock = startBlock;
    while (fromBlock <= latestBlock) {
      const toBlockCandidate = fromBlock + BET_COUNT_CHUNK - BIGINT_ONE;
      const toBlock = toBlockCandidate > latestBlock ? latestBlock : toBlockCandidate;

      try {
        const logs = await client.getLogs({
          address: contractAddress as `0x${string}`,
          event: betPlacedEvent,
          fromBlock,
          toBlock,
        });

        for (const log of logs) {
          const args = "args" in log ? (log.args as Record<string, unknown> | undefined) : undefined;
          const marketIdValue = args?.marketId;
          if (typeof marketIdValue === "bigint" || typeof marketIdValue === "number") {
            const marketId = typeof marketIdValue === "number" ? marketIdValue : Number(marketIdValue);
            betCounts.set(marketId, (betCounts.get(marketId) ?? 0) + 1);
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch BetPlaced logs for blocks ${fromBlock}-${toBlock}:`, error);
      }

      if (toBlock === latestBlock) break;
      fromBlock = toBlock + BIGINT_ONE;
    }

    await cacheBetCounts(contractAddress, betCounts);
  } catch (error) {
    console.error("Failed to fetch bet counts:", error);
  }

  return betCounts;
}

async function buildCreationTimestampMap(
  client: ReturnType<typeof createPublicClient>,
  creationLogs: MarketCreationLog[]
): Promise<Map<number, number>> {
  if (!creationLogs.length) return new Map();

  const uniqueBlocks = Array.from(new Set(creationLogs.map((log) => log.blockNumber)));

  const timestampMap = new Map<bigint, number>();
  await Promise.all(
    uniqueBlocks.map(async (blockNumber) => {
      try {
        const block = await client.getBlock({ blockNumber });
        timestampMap.set(blockNumber, Number(block.timestamp));
      } catch (error) {
        console.warn(`Failed to fetch block ${blockNumber}:`, error);
      }
    })
  );

  const creationTimestampMap = new Map<number, number>();
  creationLogs.forEach((log) => {
    const timestamp = timestampMap.get(log.blockNumber);
    if (timestamp) creationTimestampMap.set(log.marketId, timestamp);
  });

  return creationTimestampMap;
}

export async function fetchMarketsFromChain(options: FetchMarketsOptions = {}): Promise<PredictionMarket[]> {
  const { includeResolved = false, includeExpired = false } = options;

  let contractAddress: string;
  try {
    contractAddress = getAutomatedPredictionMarketAddress(base.id);
  } catch {
    return [];
  }

  const client = createBaseClient();

  let marketCount = 0;
  try {
    const count = await client.readContract({
      address: contractAddress as `0x${string}`,
      abi: automatedPredictionMarketABI,
      functionName: "s_marketCount",
    });
    marketCount = Number(count);
  } catch (error) {
    console.error("Could not read market count:", error);
    return [];
  }

  if (marketCount === 0) return [];

  const cachedDeploymentBlock = await getCachedDeploymentBlock(contractAddress);

  const [trendingSongs, creationLogs] = await Promise.all([
    fetchTrendingSongs(100),
    fetchMarketCreationLogs(client, contractAddress),
  ]);

  const trendingMap = new Map(trendingSongs.map((song) => [song.title.toLowerCase(), song]));
  const songCache = new Map<string, { title: string; artist: string; cover: string } | null>();
  const creationTimestampMap = await buildCreationTimestampMap(client, creationLogs);

  const firstBlock = creationLogs.length
    ? creationLogs.reduce<bigint>((min, log) => (log.blockNumber < min ? log.blockNumber : min), creationLogs[0].blockNumber)
    : cachedDeploymentBlock ?? BIGINT_ZERO;

  const betCounts = await fetchBetCounts(client, contractAddress, firstBlock);

  const markets: PredictionMarket[] = [];
  const now = Math.floor(Date.now() / 1000);

  // Read markets from AutomatedPredictionMarket contract
  // Note: This contract uses 1-based indexing (market IDs start at 1)
  const marketReadPromises = Array.from({ length: marketCount }, (_, i) => i + 1).map((marketId) =>
    client
      .readContract({
        address: contractAddress as `0x${string}`,
        abi: automatedPredictionMarketABI,
        functionName: "markets",
        args: [BigInt(marketId)],
      })
      .then((data) => ({ marketId, data }))
      .catch((error) => {
        console.error(`Failed to fetch market ${marketId}:`, error);
        return null;
      })
  );

  const marketData = await Promise.all(marketReadPromises);

  for (const entry of marketData) {
    if (!entry) continue;

    const { marketId, data } = entry;
    // AutomatedPredictionMarket Market struct: id, endTime, resolveTime, resolved, winningTrack, creator, totalPool, totalPaidOut
    const endTime = Number(data[1] as bigint); // endTime
    const _resolveTime = Number(data[2] as bigint); // resolveTime (unused but kept for potential future use)
    const resolved = data[3] as boolean;
    const winningTrack = data[4] as string;
    const _creator = data[5] as string; // creator (unused)
    const totalPool = data[6] as bigint; // totalPool from contract



    // The contract stores totalPool as a single value
    // For display purposes, we'll split it evenly between YES and NO
    // (In reality, the contract doesn't track YES/NO separately - it's all one pool)
    // We'll use totalPool for both to show the correct total amount
    const totalPoolYes = totalPool ?? BigInt(0);
    const totalPoolNo = BigInt(0); // Contract doesn't track NO pool separately

    if (!includeResolved && resolved) continue;
    if (!includeExpired && !resolved && endTime <= now) continue;

    // Try to find matching song by title (case-insensitive)
    const trackTitleLower = winningTrack?.toLowerCase().trim() || "";
    let metadata: { title: string; artist: string; cover: string } | null = null;

    // If winningTrack is empty (unresolved market), we can't determine the track yet
    // But we'll still try to fetch metadata if we have a title
    if (trackTitleLower) {
      // First try to find in trending songs (exact match)
      for (const [title, song] of trendingMap.entries()) {
        if (title === trackTitleLower || song.title.toLowerCase() === trackTitleLower) {
          metadata = {
            title: song.title,
            artist: song.artist,
            cover: song.cover,
          };
          break;
        }
      }

      // If not found, try fuzzy matching in trending songs
      if (!metadata) {
        for (const song of trendingSongs) {
          const songTitleLower = song.title.toLowerCase().trim();
          // Try exact match, or match if one contains the other
          if (
            songTitleLower === trackTitleLower ||
            songTitleLower.includes(trackTitleLower) ||
            trackTitleLower.includes(songTitleLower)
          ) {
            metadata = {
              title: song.title,
              artist: song.artist,
              cover: song.cover,
            };
            break;
          }
        }
      }

      // If still not found, try to fetch from Spinamp API by title
      if (!metadata) {
        try {
          const query = `
            query SearchTrack($title: String!) {
              processedTracks(
                filter: { title: { likeInsensitive: $title } }
                first: 1
              ) {
                edges {
                  node {
                    id
                    title
                    lossyArtworkUrl
                    artistByArtistId {
                      name
                    }
                  }
                }
              }
            }
          `;

          const response = await fetch("https://api.spinamp.xyz/v3/graphql", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query,
              variables: { title: winningTrack },
            }),
          });

          if (response.ok) {
            const result = await response.json();
            const edges = result.data?.processedTracks?.edges;
            if (edges && edges.length > 0) {
              const track = edges[0].node;
              metadata = {
                title: track.title || winningTrack,
                artist: track.artistByArtistId?.name || "Unknown Artist",
                cover: track.lossyArtworkUrl || "",
              };
              // Cache it
              await saveSongMetadata(winningTrack, {
                ...metadata,
                source: "spinamp",
                isFallback: false,
              });
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch Spinamp metadata for "${winningTrack}":`, error);
        }
      }

      // If still not found, try to find song ID from title in trending songs and fetch metadata
      if (!metadata) {
        const matchingSong = Array.from(trendingSongs.values()).find(
          (song) => song.title.toLowerCase() === trackTitleLower
        );

        if (matchingSong) {
          metadata = await fetchSongMetadata(matchingSong.id, songCache, new Map(trendingSongs.map((s) => [s.id, s])));
        }
      }
    }

    // Fallback if no metadata found
    if (!metadata) {
      metadata = {
        title: winningTrack || "Unknown Track",
        artist: "Unknown Artist",
        cover: "",
      };
    }

    markets.push({
      id: `market-${marketId}`,
      songId: winningTrack || `track-${marketId}`, // Use track title as songId for compatibility
      songTitle: metadata?.title ?? winningTrack ?? "Unknown Track",
      songArtist: metadata?.artist ?? "Unknown Artist",
      songCover: metadata?.cover ?? "",
      endTime,
      status: resolved ? "RESOLVED" : "ACTIVE",
      createdAt: creationTimestampMap.get(marketId) ?? now,
      totalPoolYes,
      totalPoolNo,
      totalBets: betCounts.get(marketId) ?? 0,
      contractAddress,
      marketIndex: marketId,
    });
  }

  markets.sort((a, b) => (a.marketIndex ?? 0) - (b.marketIndex ?? 0));

  return markets;
}

export async function fetchActiveMarketsFromChain(): Promise<PredictionMarket[]> {
  return fetchMarketsFromChain({ includeResolved: false, includeExpired: false });
}


