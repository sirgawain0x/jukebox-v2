import type { PredictionMarket } from "@/types/prediction-market"

export function isTrendingMetadataMissing(market: PredictionMarket): boolean {
  if (!market.songTitle || !market.songArtist) return true
  if (market.songTitle === market.songId) return true
  if (market.songArtist === "Unknown Artist") return true
  return false
}

