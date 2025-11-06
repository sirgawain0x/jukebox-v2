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

