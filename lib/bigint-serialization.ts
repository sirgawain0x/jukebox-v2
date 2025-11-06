import type { PredictionMarket, MarketBet } from "@/types/prediction-market";

/**
 * Serialize BigInt values to strings for JSON serialization
 */
export function serializePredictionMarket(market: PredictionMarket): Omit<PredictionMarket, "totalPoolYes" | "totalPoolNo"> & {
  totalPoolYes: string;
  totalPoolNo: string;
} {
  return {
    ...market,
    totalPoolYes: market.totalPoolYes.toString(),
    totalPoolNo: market.totalPoolNo.toString(),
  };
}

/**
 * Deserialize string values back to BigInt
 */
export function deserializePredictionMarket(
  market: Omit<PredictionMarket, "totalPoolYes" | "totalPoolNo"> & {
    totalPoolYes: string | bigint;
    totalPoolNo: string | bigint;
  }
): PredictionMarket {
  return {
    ...market,
    totalPoolYes: typeof market.totalPoolYes === "string" ? BigInt(market.totalPoolYes) : market.totalPoolYes,
    totalPoolNo: typeof market.totalPoolNo === "string" ? BigInt(market.totalPoolNo) : market.totalPoolNo,
  };
}

/**
 * Serialize array of markets
 */
export function serializePredictionMarkets(markets: PredictionMarket[]) {
  return markets.map(serializePredictionMarket);
}

/**
 * Deserialize array of markets
 */
export function deserializePredictionMarkets(
  markets: (Omit<PredictionMarket, "totalPoolYes" | "totalPoolNo"> & {
    totalPoolYes: string | bigint;
    totalPoolNo: string | bigint;
  })[]
): PredictionMarket[] {
  return markets.map(deserializePredictionMarket);
}

/**
 * Serialize MarketBet BigInt values
 */
export function serializeMarketBet(bet: MarketBet): Omit<MarketBet, "amount"> & {
  amount: string;
} {
  return {
    ...bet,
    amount: bet.amount.toString(),
  };
}

/**
 * Deserialize MarketBet string values
 */
export function deserializeMarketBet(
  bet: Omit<MarketBet, "amount"> & {
    amount: string | bigint;
  }
): MarketBet {
  return {
    ...bet,
    amount: typeof bet.amount === "string" ? BigInt(bet.amount) : bet.amount,
  };
}

/**
 * Serialize array of bets
 */
export function serializeMarketBets(bets: MarketBet[]) {
  return bets.map(serializeMarketBet);
}

/**
 * Deserialize array of bets
 */
export function deserializeMarketBets(
  bets: (Omit<MarketBet, "amount"> & {
    amount: string | bigint;
  })[]
): MarketBet[] {
  return bets.map(deserializeMarketBet);
}

