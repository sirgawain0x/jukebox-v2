import { NextRequest, NextResponse } from "next/server";
import {
  getCachedUserBets,
  cacheUserBets,
  getCachedDeploymentBlock,
  cacheDeploymentBlock,
  getCachedSongMetadata,
  saveSongMetadata,
} from "@/lib/prediction-cache";
import { serializeMarketBet } from "@/lib/bigint-serialization";
import type { MarketBet, PredictionMarket, MarketPreview } from "@/types/prediction-market";
import { Address, decodeEventLog } from "viem";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { getAutomatedPredictionMarketAddress, automatedPredictionMarketABI } from "@/lib/contracts/automated-prediction-market";
import { fetchMarketsFromChain } from "@/lib/server/prediction-market-data";
import { fetchTrendingSongs } from "@/lib/trending-songs";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://mainnet.base.org";
const BIGINT_ZERO = BigInt(0);
const BIGINT_ONE = BigInt(1);
const DEFAULT_CHUNK_SIZE = BigInt(5000);
const RETRY_DIVISOR = BigInt(2);

/**
 * Fetch the actual number of bet transactions for a user from BetPlaced events
 */
async function fetchUserBetCount(
  publicClient: ReturnType<typeof createPublicClient>,
  contractAddress: string,
  userAddress: Address
): Promise<number> {
  try {
    const betPlacedEvent = automatedPredictionMarketABI.find(
      (item) => item.type === "event" && item.name === "BetPlaced"
    );

    if (!betPlacedEvent) {
      console.warn("BetPlaced event not found in ABI");
      return 0;
    }

    let searchFromBlock = await getCachedDeploymentBlock(contractAddress);

    const latestBlock = await publicClient.getBlockNumber();

    if (searchFromBlock === null) {
      const marketCreatedEvent = automatedPredictionMarketABI.find(
        (item) => item.type === "event" && item.name === "MarketCreated"
      );

      if (marketCreatedEvent) {
        try {
          const creationLogs = await publicClient.getLogs({
            address: contractAddress as `0x${string}`,
            event: marketCreatedEvent,
            fromBlock: BIGINT_ZERO,
            toBlock: latestBlock,
          });

          if (creationLogs.length) {
            searchFromBlock = creationLogs.reduce<bigint>((min, log) => {
              const blockNumber = log.blockNumber ?? BIGINT_ZERO;
              return blockNumber < min ? blockNumber : min;
            }, creationLogs[0].blockNumber ?? BIGINT_ZERO);
            await cacheDeploymentBlock(contractAddress, searchFromBlock);
          }
        } catch (creationError) {
          console.warn("Failed to preload deployment block for bet count:", creationError);
        }
      }
    }

    if (searchFromBlock === null) {
      searchFromBlock = BIGINT_ZERO;
    }

    let totalCount = 0;
    let chunkSize = DEFAULT_CHUNK_SIZE;
    let currentFromBlock = searchFromBlock;

    while (currentFromBlock <= latestBlock) {
      const proposedToBlock = currentFromBlock + chunkSize - BIGINT_ONE;
      const currentToBlock = proposedToBlock > latestBlock ? latestBlock : proposedToBlock;

      try {
        // Note: AutomatedPredictionMarket BetPlaced event only has marketId indexed
        // We need to fetch all events and filter by user in the decoded args
        const chunkLogs = await publicClient.getLogs({
          address: contractAddress as `0x${string}`,
          event: betPlacedEvent,
          fromBlock: currentFromBlock,
          toBlock: currentToBlock,
        });

        // Filter logs by user address
        const userLogs = chunkLogs.filter((log) => {
          if ("args" in log && log.args) {
            const args = log.args as { user?: Address };
            return args.user?.toLowerCase() === userAddress.toLowerCase();
          }
          return false;
        });

        totalCount += userLogs.length;

        if (currentToBlock === latestBlock) break;

        currentFromBlock = currentToBlock + BIGINT_ONE;
        chunkSize = DEFAULT_CHUNK_SIZE;
      } catch (chunkError: unknown) {
        const errorMessage = chunkError instanceof Error ? chunkError.message : String(chunkError);
        console.warn("Failed to fetch user bet count chunk:", errorMessage);

        if (chunkSize === BIGINT_ONE) {
          break;
        }

        chunkSize = chunkSize / RETRY_DIVISOR;
        if (chunkSize < BIGINT_ONE) {
          chunkSize = BIGINT_ONE;
        }
      }
    }

    return totalCount;
  } catch (error) {
    console.error("Error fetching user bet count:", error);
    return 0;
  }
}

/**
 * Fetch the timestamp for a bet from BetPlaced events
 * Decodes events to find the exact match for market, user, and side
 */
async function fetchBetTimestamp(
  publicClient: ReturnType<typeof createPublicClient>,
  contractAddress: string,
  marketId: bigint,
  userAddress: Address,
  side: "YES" | "NO"
): Promise<number> {
  try {
    const betPlacedEvent = automatedPredictionMarketABI.find(
      (item) => item.type === "event" && item.name === "BetPlaced"
    );

    if (!betPlacedEvent) {
      console.warn("BetPlaced event not found in ABI");
      return Math.floor(Date.now() / 1000); // Fallback to current time
    }

    // Search for BetPlaced events for this user and market
    const latestBlock = await publicClient.getBlockNumber();
    const searchFromBlock = await getCachedDeploymentBlock(contractAddress) || BIGINT_ZERO;

    // Note: AutomatedPredictionMarket BetPlaced event only has marketId indexed
    // We need to fetch events for the market and filter by user
    const allLogs = await publicClient.getLogs({
      address: contractAddress as `0x${string}`,
      event: betPlacedEvent,
      args: {
        marketId: marketId,
      },
      fromBlock: searchFromBlock,
      toBlock: latestBlock,
    });

    // Filter logs by user address
    const logs = allLogs.filter((log) => {
      if ("args" in log && log.args) {
        const args = log.args as { user?: Address };
        return args.user?.toLowerCase() === userAddress.toLowerCase();
      }
      return false;
    });

    // Note: AutomatedPredictionMarket uses track predictions (strings), not YES/NO sides
    // This function is kept for compatibility but the side parameter is not used

    // Process logs in reverse order to get the most recent matching event
    for (const log of logs.reverse()) {
      // When using getLogs with an event, viem automatically decodes it
      // The log should have decoded args
      if ('args' in log && log.args) {
        const args = log.args as { marketId?: bigint; user?: Address; prediction?: string; amount?: bigint };

        // Verify it matches our criteria (AutomatedPredictionMarket uses prediction string, not side bool)
        if (
          args.marketId === marketId &&
          args.user?.toLowerCase() === userAddress.toLowerCase()
        ) {
          // Get the block timestamp
          if (log.blockNumber) {
            const block = await publicClient.getBlock({
              blockNumber: log.blockNumber,
            });
            return Number(block.timestamp);
          }
        }
      } else {
        // Fallback: if args aren't decoded, try to decode manually
        try {
          const decoded = decodeEventLog({
            abi: automatedPredictionMarketABI,
            data: log.data,
            topics: log.topics,
          });

          // Type guard: check if this is a BetPlaced event
          if (decoded.eventName === "BetPlaced" && "prediction" in decoded.args) {
            const args = decoded.args as { marketId?: bigint; user?: Address; prediction?: string; amount?: bigint };

            // Verify it matches our criteria (AutomatedPredictionMarket uses prediction string, not side bool)
            if (
              args.marketId === marketId &&
              args.user?.toLowerCase() === userAddress.toLowerCase()
            ) {
              if (log.blockNumber) {
                const block = await publicClient.getBlock({
                  blockNumber: log.blockNumber,
                });
                return Number(block.timestamp);
              }
            }
          }
        } catch {
          // If decoding fails, continue to next log
          continue;
        }
      }
    }

    // Fallback: use current time if no matching event found
    return Math.floor(Date.now() / 1000);
  } catch (error) {
    console.warn(`Failed to fetch bet timestamp for market ${marketId}, side ${side}:`, error);
    return Math.floor(Date.now() / 1000); // Fallback to current time
  }
}

async function fetchUserBetsFromContract(
  address: Address,
  publicClient: ReturnType<typeof createPublicClient>
): Promise<MarketBet[]> {
  try {

    // Wrap getAutomatedPredictionMarketAddress in try-catch (like markets route does)
    let contractAddress: string | null = null;
    try {
      contractAddress = getAutomatedPredictionMarketAddress(base.id);
    } catch {
      console.warn("Automated prediction market contract not deployed");
      return [];
    }

    // Get market count from contract
    let marketCount = 0;
    try {
      const count = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: automatedPredictionMarketABI,
        functionName: "s_marketCount",
      });
      marketCount = Number(count);
    } catch (error) {
      console.error("Could not read market count from contract:", error);
      return [];
    }

    if (marketCount === 0) {
      return [];
    }

    const bets: MarketBet[] = [];

    // AutomatedPredictionMarket uses 1-based market IDs and stores bets in marketBets array
    // We need to fetch bets from the marketBets mapping for each market
    for (let marketId = 1; marketId <= marketCount; marketId++) {
      try {
        // Read marketBets array for this market
        // Note: This contract doesn't have a direct userBets function
        // We'll need to fetch from BetPlaced events instead
        // For now, we'll fetch from events (which is already done in fetchUserBetCount)

        // The contract structure is different - bets are stored per market, not per user
        // We'll need to query BetPlaced events filtered by user and marketId
        const betPlacedEvent = automatedPredictionMarketABI.find(
          (item) => item.type === "event" && item.name === "BetPlaced"
        );

        if (betPlacedEvent) {
          const searchFromBlock = await getCachedDeploymentBlock(contractAddress) || BIGINT_ZERO;
          const latestBlock = await publicClient.getBlockNumber();

          // Note: AutomatedPredictionMarket BetPlaced event only has marketId indexed
          // We need to fetch events for the market and filter by user
          const allLogs = await publicClient.getLogs({
            address: contractAddress as `0x${string}`,
            event: betPlacedEvent,
            args: {
              marketId: BigInt(marketId),
            },
            fromBlock: searchFromBlock,
            toBlock: latestBlock,
          });

          // Filter logs by user address
          const logs = allLogs.filter((log) => {
            if ("args" in log && log.args) {
              const args = log.args as { user?: Address };
              return args.user?.toLowerCase() === address.toLowerCase();
            }
            return false;
          });

          for (const log of logs) {
            if ("args" in log && log.args) {
              const args = log.args as { marketId?: bigint; user?: Address; prediction?: string; amount?: bigint };
              if (args.amount && args.amount > BigInt(0) && args.prediction) {
                const timestamp = await fetchBetTimestamp(
                  publicClient,
                  contractAddress,
                  BigInt(marketId),
                  address,
                  "YES" // AutomatedPredictionMarket uses track predictions, not YES/NO
                );

                bets.push({
                  id: `bet-${marketId}-${address}-${log.logIndex}`,
                  marketId: `market-${marketId}`,
                  userAddress: address,
                  side: "YES", // Simplified - actual side depends on if prediction matches winning track
                  amount: args.amount,
                  timestamp,
                  claimed: false, // Would need to check from contract
                  predictedTrack: args.prediction, // Store the predicted track title
                });
              }
            }
          }
        }
      } catch (error) {
        console.error(`Failed to fetch user bet for market ${marketId}:`, error);
        continue;
      }
    }

    return bets;
  } catch (error) {
    console.error("Error fetching user bets from contract:", error);
    return [];
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get("refresh") === "true";

    // Validate address format
    if (!address || !address.startsWith("0x") || address.length !== 42) {
      return NextResponse.json(
        { error: "Invalid address format" },
        { status: 400 }
      );
    }

    // Create public client for fetching bet count
    const publicClient = createPublicClient({
      chain: base,
      transport: http(RPC_URL),
    }) as ReturnType<typeof createPublicClient>;

    let contractAddress: string | null = null;
    try {
      contractAddress = getAutomatedPredictionMarketAddress(base.id);
    } catch {
      console.warn("Automated prediction market contract not deployed");
      return NextResponse.json({ bets: [], betCount: 0 });
    }

    let cached = await getCachedUserBets(address as Address);

    // Check if we need to invalidate cache due to missing predictedTrack
    if (cached && !forceRefresh) {
      const hasInvalidBets = cached.some(bet => !bet.predictedTrack);
      if (hasInvalidBets) {
        console.log("Found cached bets without predictedTrack, refreshing data...");
        cached = null;
      }
    }

    let bets: MarketBet[] = [];
    let betCount = 0;

    const buildMarketsMap = async () => {
      const markets = await fetchMarketsFromChain({ includeResolved: true, includeExpired: true });
      return new Map<string, PredictionMarket>(
        markets.map((market) => [`market-${market.marketIndex}`, market])
      );
    };

    // Helper to fetch song metadata by track title
    const fetchMetadataForTrack = async (trackTitle: string): Promise<{ title: string; artist: string; cover: string } | null> => {
      if (!trackTitle) return null;

      // Try cached metadata first
      const cached = await getCachedSongMetadata(trackTitle);
      if (cached && !cached.isFallback) {
        return {
          title: cached.title,
          artist: cached.artist,
          cover: cached.cover,
        };
      }

      // Try to find in trending songs
      try {
        const trendingSongs = await fetchTrendingSongs(100);
        const trackTitleLower = trackTitle.toLowerCase();
        const matchingSong = trendingSongs.find(
          (song) => song.title.toLowerCase() === trackTitleLower
        );

        if (matchingSong) {
          const metadata = {
            title: matchingSong.title,
            artist: matchingSong.artist,
            cover: matchingSong.cover,
          };
          // Cache it
          await saveSongMetadata(trackTitle, {
            ...metadata,
            source: "trending",
            isFallback: false,
          });
          return metadata;
        }
      } catch (error) {
        console.warn(`Failed to fetch metadata for track "${trackTitle}":`, error);
      }

      // Try Spinamp API
      try {
        const query = `
          query GetTrack($title: String!) {
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
            variables: { title: trackTitle },
          }),
        });

        if (response.ok) {
          const result = await response.json();
          const edges = result.data?.processedTracks?.edges;
          if (edges && edges.length > 0) {
            const track = edges[0].node;
            const metadata = {
              title: track.title || trackTitle,
              artist: track.artistByArtistId?.name || "Unknown Artist",
              cover: track.lossyArtworkUrl || "",
            };
            await saveSongMetadata(trackTitle, {
              ...metadata,
              source: "spinamp",
              isFallback: false,
            });
            return metadata;
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch from Spinamp for "${trackTitle}":`, error);
      }

      return null;
    };

    const serializeBets = async (
      betList: MarketBet[],
      marketsById: Map<string, PredictionMarket>
    ): Promise<Array<{ [key: string]: unknown }>> => {
      const results = await Promise.all(
        betList.map(async (bet) => {
          const baseBet = serializeMarketBet(bet);
          const market = marketsById.get(bet.marketId);

          let marketPreview: MarketPreview | null = null;

          if (market) {
            // If market has proper metadata, use it
            if (market.songTitle !== "Unknown Track" && market.songArtist !== "Unknown Artist") {
              marketPreview = {
                id: market.id,
                songTitle: market.songTitle,
                songArtist: market.songArtist,
                songCover: market.songCover,
                endTime: market.endTime,
                status: market.status,
              };
            } else if (bet.predictedTrack) {
              // Market metadata is missing, try to fetch using the bet's predicted track
              const metadata = await fetchMetadataForTrack(bet.predictedTrack);
              if (metadata) {
                marketPreview = {
                  id: market.id,
                  songTitle: metadata.title,
                  songArtist: metadata.artist,
                  songCover: metadata.cover,
                  endTime: market.endTime,
                  status: market.status,
                };
              } else {
                // Fallback to predicted track title
                marketPreview = {
                  id: market.id,
                  songTitle: bet.predictedTrack,
                  songArtist: "Unknown Artist",
                  songCover: "",
                  endTime: market.endTime,
                  status: market.status,
                };
              }
            } else {
              // No predicted track, use market data as-is
              marketPreview = {
                id: market.id,
                songTitle: market.songTitle,
                songArtist: market.songArtist,
                songCover: market.songCover,
                endTime: market.endTime,
                status: market.status,
              };
            }
          }

          return {
            ...baseBet,
            market: marketPreview,
          };
        })
      );

      return results;
    };

    if (cached && !forceRefresh) {
      bets = cached;
      const marketsById = await buildMarketsMap();
      const serialized = await serializeBets(bets, marketsById);

      try {
        betCount = await fetchUserBetCount(publicClient, contractAddress, address as Address);
      } catch {
        console.warn("Could not fetch bet count, using length as fallback");
        betCount = bets.length;
      }

      return NextResponse.json({ bets: serialized, betCount });
    }

    bets = await fetchUserBetsFromContract(address as Address, publicClient);
    await cacheUserBets(address as Address, bets);

    const marketsById = await buildMarketsMap();
    const serialized = await serializeBets(bets, marketsById);

    try {
      betCount = await fetchUserBetCount(publicClient, contractAddress, address as Address);
    } catch {
      console.warn("Could not fetch bet count, using length as fallback");
      betCount = bets.length;
    }

    return NextResponse.json({ bets: serialized, betCount });
  } catch {
    console.error("Error fetching user bets");
    return NextResponse.json(
      { error: "Failed to fetch user bets" },
      { status: 500 }
    );
  }
}

