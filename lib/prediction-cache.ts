import { redis } from "./redis";
import {
  serializePredictionMarkets,
  deserializePredictionMarkets,
  serializePredictionMarket,
  deserializePredictionMarket,
  serializeMarketBets,
  deserializeMarketBets,
} from "./bigint-serialization";
import type { PredictionMarket, MarketBet, MarketOdds } from "@/types/prediction-market";

const CACHE_TTL = {
  ACTIVE: 300, // 5 minutes for active market data
  HISTORICAL: 3600, // 1 hour for historical data
  LEADERBOARD: 300, // 5 minutes for leaderboard
  BET_COUNTS: 60, // refresh bet counts every minute
  DEPLOYMENT_BLOCK: 86400, // cache deployment block for a day
};

/**
 * Cache key helpers
 */
const cacheKeys = {
  activeMarkets: () => "prediction:markets:active",
  market: (marketId: string) => `prediction:market:${marketId}`,
  marketBets: (marketId: string) => `prediction:bets:${marketId}`,
  userBets: (address: string) => `prediction:user:bets:${address}`,
  marketOdds: (marketId: string) => `prediction:odds:${marketId}`,
  leaderboard: (period: string) => `prediction:leaderboard:${period}`,
  resolvedMarkets: (week: string) => `prediction:resolved:${week}`,
  songMetadata: (songId: string) => `prediction:song:${songId}`,
  betCounts: (contractAddress: string) => `prediction:bet-counts:${contractAddress}`,
  deploymentBlock: (contractAddress: string) => `prediction:deployment-block:${contractAddress}`,
};

/**
 * Cache active markets list
 */
export async function cacheActiveMarkets(
  markets: PredictionMarket[]
): Promise<void> {
  if (!redis) return;

  try {
    // Serialize BigInt values to strings before caching
    const serialized = serializePredictionMarkets(markets);
    await redis.setex(
      cacheKeys.activeMarkets(),
      CACHE_TTL.ACTIVE,
      JSON.stringify(serialized)
    );
  } catch (error) {
    console.error("Failed to cache active markets:", error);
  }
}

/**
 * Get cached active markets
 */
export async function getCachedActiveMarkets(): Promise<PredictionMarket[] | null> {
  if (!redis) return null;

  try {
    const data = await redis.get(cacheKeys.activeMarkets());
    if (!data || typeof data !== 'string' || data.trim() === '') return null;
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return null;
    // Deserialize string values back to BigInt
    return deserializePredictionMarkets(parsed);
  } catch (error) {
    console.error("Failed to get cached active markets:", error);
    return null;
  }
}

/**
 * Cache individual market data
 */
export async function cacheMarket(market: PredictionMarket): Promise<void> {
  if (!redis) return;

  try {
    const ttl = market.status === "ACTIVE" ? CACHE_TTL.ACTIVE : CACHE_TTL.HISTORICAL;
    // Serialize BigInt values to strings before caching
    const serialized = serializePredictionMarket(market);
    await redis.setex(
      cacheKeys.market(market.id),
      ttl,
      JSON.stringify(serialized)
    );
  } catch (error) {
    console.error("Failed to cache market:", error);
  }
}

/**
 * Get cached market data
 */
export async function getCachedMarket(
  marketId: string
): Promise<PredictionMarket | null> {
  if (!redis) return null;

  try {
    const data = await redis.get(cacheKeys.market(marketId));
    if (!data || typeof data !== 'string' || data.trim() === '') return null;
    const parsed = JSON.parse(data);
    // Deserialize string values back to BigInt
    return deserializePredictionMarket(parsed);
  } catch (error) {
    console.error("Failed to get cached market:", error);
    return null;
  }
}

/**
 * Cache market bets
 */
export async function cacheMarketBets(
  marketId: string,
  bets: MarketBet[]
): Promise<void> {
  if (!redis) return;

  try {
    // Serialize BigInt values to strings before caching
    const serialized = serializeMarketBets(bets);
    await redis.setex(
      cacheKeys.marketBets(marketId),
      CACHE_TTL.ACTIVE,
      JSON.stringify(serialized)
    );
  } catch (error) {
    console.error("Failed to cache market bets:", error);
  }
}

/**
 * Get cached market bets
 */
export async function getCachedMarketBets(
  marketId: string
): Promise<MarketBet[] | null> {
  if (!redis) return null;

  try {
    const data = await redis.get(cacheKeys.marketBets(marketId));
    if (!data || typeof data !== 'string' || data.trim() === '') return null;
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return null;
    // Deserialize string values back to BigInt
    return deserializeMarketBets(parsed);
  } catch (error) {
    console.error("Failed to get cached market bets:", error);
    return null;
  }
}

/**
 * Cache user bets
 */
export async function cacheUserBets(
  address: string,
  bets: MarketBet[]
): Promise<void> {
  if (!redis) return;

  try {
    // Serialize BigInt values to strings before caching
    const serialized = serializeMarketBets(bets);
    await redis.setex(
      cacheKeys.userBets(address),
      CACHE_TTL.ACTIVE,
      JSON.stringify(serialized)
    );
  } catch (error) {
    console.error("Failed to cache user bets:", error);
  }
}

/**
 * Get cached user bets
 */
export async function getCachedUserBets(
  address: string
): Promise<MarketBet[] | null> {
  if (!redis) return null;

  try {
    const data = await redis.get(cacheKeys.userBets(address));
    if (!data || typeof data !== 'string' || data.trim() === '') return null;
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return null;
    // Deserialize string values back to BigInt
    return deserializeMarketBets(parsed);
  } catch (error) {
    console.error("Failed to get cached user bets:", error);
    return null;
  }
}

/**
 * Cache market odds
 */
export async function cacheMarketOdds(
  marketId: string,
  odds: MarketOdds
): Promise<void> {
  if (!redis) return;

  try {
    await redis.setex(
      cacheKeys.marketOdds(marketId),
      CACHE_TTL.ACTIVE,
      JSON.stringify(odds)
    );
  } catch (error) {
    console.error("Failed to cache market odds:", error);
  }
}

/**
 * Get cached market odds
 */
export async function getCachedMarketOdds(
  marketId: string
): Promise<MarketOdds | null> {
  if (!redis) return null;

  try {
    const data = await redis.get(cacheKeys.marketOdds(marketId));
    if (!data || typeof data !== 'string' || data.trim() === '') return null;
    return JSON.parse(data) as MarketOdds;
  } catch (error) {
    console.error("Failed to get cached market odds:", error);
    return null;
  }
}

/**
 * Calculate and cache market odds from pool sizes
 */
export function calculateOdds(
  poolYes: bigint,
  poolNo: bigint
): MarketOdds {
  const total = poolYes + poolNo;

  if (total === BigInt(0)) {
    return {
      yesOdds: 50,
      noOdds: 50,
      yesImplied: 0.5,
      noImplied: 0.5,
    };
  }

  const yesImplied = Number(poolYes) / Number(total);
  const noImplied = Number(poolNo) / Number(total);

  // Convert to percentage odds (for display)
  const yesOdds = yesImplied * 100;
  const noOdds = noImplied * 100;

  return {
    yesOdds,
    noOdds,
    yesImplied,
    noImplied,
  };
}

/**
 * Invalidate cache for a market (when it's resolved or updated)
 */
export async function invalidateMarketCache(marketId: string): Promise<void> {
  if (!redis) return;

  try {
    await redis.del(cacheKeys.market(marketId));
    await redis.del(cacheKeys.marketBets(marketId));
    await redis.del(cacheKeys.marketOdds(marketId));
    // Also invalidate active markets list
    await redis.del(cacheKeys.activeMarkets());
  } catch (error) {
    console.error("Failed to invalidate market cache:", error);
  }
}

/**
 * Invalidate all active markets cache (when a new market is created)
 */
export async function invalidateActiveMarketsCache(): Promise<void> {
  if (!redis) return;

  try {
    await redis.del(cacheKeys.activeMarkets());
    // Also invalidate bet counts cache since new markets will change counts
    // Note: We'd need contract address to be more specific, but clearing all is safe
  } catch (error) {
    console.error("Failed to invalidate active markets cache:", error);
  }
}

export interface CachedSongMetadata {
  title: string;
  artist: string;
  cover: string;
  source: "trending" | "spinamp" | "fallback" | "creator";
  isFallback: boolean;
  updatedAt: number;
}

interface SaveSongMetadataInput {
  title?: string;
  artist?: string;
  cover?: string;
  source?: CachedSongMetadata["source"];
  isFallback?: boolean;
}

interface SaveSongMetadataOptions {
  force?: boolean;
}

function normalizeSongMetadata(
  songId: string,
  metadata: Partial<CachedSongMetadata>
): CachedSongMetadata {
  const normalisedCover =
    typeof metadata.cover === "string" ? metadata.cover : "";

  const isFallback =
    metadata.isFallback ??
    (metadata.source === "fallback" ||
      !metadata.title ||
      metadata.title === songId);

  return {
    title: metadata.title && metadata.title.trim().length ? metadata.title : songId,
    artist:
      metadata.artist && metadata.artist.trim().length
        ? metadata.artist
        : "Unknown Artist",
    cover: normalisedCover,
    source: metadata.source ?? (isFallback ? "fallback" : "spinamp"),
    isFallback,
    updatedAt: metadata.updatedAt ?? Date.now(),
  };
}

export async function saveSongMetadata(
  songId: string,
  metadata: SaveSongMetadataInput,
  options: SaveSongMetadataOptions = {}
): Promise<CachedSongMetadata | null> {
  if (!redis) return null;

  try {
    const existing = await getCachedSongMetadata(songId);

    if (existing && !options.force) {
      const incoming = normalizeSongMetadata(songId, {
        ...metadata,
        updatedAt: Date.now(),
      });

      if (!existing.isFallback && incoming.isFallback) {
        return existing;
      }

      const merged: CachedSongMetadata = {
        title: incoming.title || existing.title,
        artist: incoming.artist || existing.artist,
        cover: incoming.cover || existing.cover,
        source: incoming.isFallback ? existing.source : incoming.source,
        isFallback: existing.isFallback && !incoming.isFallback ? false : incoming.isFallback,
        updatedAt: Date.now(),
      };

      await redis.set(
        cacheKeys.songMetadata(songId),
        JSON.stringify(merged)
      );
      return merged;
    }

    const record = normalizeSongMetadata(songId, {
      ...metadata,
      updatedAt: Date.now(),
    });

    await redis.set(
      cacheKeys.songMetadata(songId),
      JSON.stringify(record)
    );

    return record;
  } catch (error) {
    console.error("Failed to save song metadata:", error);
    return null;
  }
}

export async function getCachedSongMetadata(
  songId: string
): Promise<CachedSongMetadata | null> {
  if (!redis) return null;

  try {
    const data = await redis.get(cacheKeys.songMetadata(songId));
    if (!data || typeof data !== "string" || data.trim() === "") return null;
    const parsed = JSON.parse(data) as Partial<CachedSongMetadata> | undefined;
    if (!parsed || typeof parsed !== "object") return null;
    return normalizeSongMetadata(songId, parsed);
  } catch (error) {
    console.error("Failed to get cached song metadata:", error);
    return null;
  }
}

export async function cacheBetCounts(
  contractAddress: string,
  counts: Map<number, number>
): Promise<void> {
  if (!redis) return;

  try {
    const serialized = Object.fromEntries(counts);
    await redis.setex(
      cacheKeys.betCounts(contractAddress),
      CACHE_TTL.BET_COUNTS,
      JSON.stringify(serialized)
    );
  } catch (error) {
    console.error("Failed to cache bet counts:", error);
  }
}

export async function getCachedBetCounts(
  contractAddress: string
): Promise<Map<number, number> | null> {
  if (!redis) return null;

  try {
    const data = await redis.get(cacheKeys.betCounts(contractAddress));
    if (!data || typeof data !== "string" || data.trim() === "") return null;
    const parsed = JSON.parse(data) as Record<string, number>;
    return new Map(
      Object.entries(parsed).map(([key, value]) => [Number(key), value])
    );
  } catch (error) {
    console.error("Failed to get cached bet counts:", error);
    return null;
  }
}

export async function cacheDeploymentBlock(
  contractAddress: string,
  blockNumber: bigint
): Promise<void> {
  if (!redis) return;

  try {
    await redis.setex(
      cacheKeys.deploymentBlock(contractAddress),
      CACHE_TTL.DEPLOYMENT_BLOCK,
      blockNumber.toString()
    );
  } catch (error) {
    console.error("Failed to cache deployment block:", error);
  }
}

export async function getCachedDeploymentBlock(
  contractAddress: string
): Promise<bigint | null> {
  if (!redis) return null;

  try {
    const data = await redis.get(cacheKeys.deploymentBlock(contractAddress));
    if (!data || typeof data !== "string" || data.trim() === "") return null;
    return BigInt(data);
  } catch (error) {
    console.error("Failed to get cached deployment block:", error);
    return null;
  }
}

