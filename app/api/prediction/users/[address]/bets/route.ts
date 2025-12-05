import { NextRequest, NextResponse } from "next/server";
import {
  getCachedUserBets,
  cacheUserBets,
  getCachedDeploymentBlock,
  cacheDeploymentBlock,
} from "@/lib/prediction-cache";
import { serializeMarketBet } from "@/lib/bigint-serialization";
import type { MarketBet, PredictionMarket } from "@/types/prediction-market";
import { Address, decodeEventLog } from "viem";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { getPredictionMarketAddress, predictionMarketABI } from "@/lib/contracts/prediction-market";
import { fetchMarketsFromChain } from "@/lib/server/prediction-market-data";

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
    const betPlacedEvent = predictionMarketABI.find(
      (item) => item.type === "event" && item.name === "BetPlaced"
    );

    if (!betPlacedEvent) {
      console.warn("BetPlaced event not found in ABI");
      return 0;
    }

    let searchFromBlock = await getCachedDeploymentBlock(contractAddress);

    const latestBlock = await publicClient.getBlockNumber();

    if (searchFromBlock === null) {
      const marketCreatedEvent = predictionMarketABI.find(
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
        const chunkLogs = await publicClient.getLogs({
          address: contractAddress as `0x${string}`,
          event: betPlacedEvent,
          args: {
            user: userAddress,
          },
          fromBlock: currentFromBlock,
          toBlock: currentToBlock,
        });

        totalCount += chunkLogs.length;

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
    const betPlacedEvent = predictionMarketABI.find(
      (item) => item.type === "event" && item.name === "BetPlaced"
    );

    if (!betPlacedEvent) {
      console.warn("BetPlaced event not found in ABI");
      return Math.floor(Date.now() / 1000); // Fallback to current time
    }

    // Search for BetPlaced events for this user and market
    const latestBlock = await publicClient.getBlockNumber();
    const searchFromBlock = await getCachedDeploymentBlock(contractAddress) || BIGINT_ZERO;

    // Fetch events with both marketId and user filters (both are indexed)
    const logs = await publicClient.getLogs({
      address: contractAddress as `0x${string}`,
      event: betPlacedEvent,
      args: {
        marketId: marketId,
        user: userAddress,
      },
      fromBlock: searchFromBlock,
      toBlock: latestBlock,
    });

    // Find the event that matches this market, user, and side
    // side is true for YES, false for NO
    const sideBool = side === "YES";
    
    // Process logs in reverse order to get the most recent matching event
    for (const log of logs.reverse()) {
      // When using getLogs with an event, viem automatically decodes it
      // The log should have decoded args
      if ('args' in log && log.args) {
        const args = log.args as { marketId?: bigint; user?: Address; side?: boolean; amount?: bigint };
        
        // Verify it matches our criteria
        if (
          args.marketId === marketId &&
          args.user?.toLowerCase() === userAddress.toLowerCase() &&
          args.side === sideBool
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
            abi: predictionMarketABI,
            data: log.data,
            topics: log.topics,
          });

          // Type guard: check if this is a BetPlaced event
          if (decoded.eventName === "BetPlaced" && "side" in decoded.args) {
            const args = decoded.args as { marketId?: bigint; user?: Address; side?: boolean; amount?: bigint };
            
            // Verify it matches our criteria
            if (
              args.marketId === marketId &&
              args.user?.toLowerCase() === userAddress.toLowerCase() &&
              args.side === sideBool
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

    // Wrap getPredictionMarketAddress in try-catch (like markets route does)
    let contractAddress: string | null = null;
    try {
      contractAddress = getPredictionMarketAddress(base.id);
    } catch {
      console.warn("Prediction market contract not deployed");
      return [];
    }

    // Get market count from contract
    let marketCount = 0;
    try {
      const count = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: predictionMarketABI,
        functionName: "marketCount",
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

    // Check each market for user bets
    for (let i = 0; i < marketCount; i++) {
      try {
        const userBet = await publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: predictionMarketABI,
          functionName: "userBets",
          args: [BigInt(i), address],
        });

        // userBet structure: [amountYes, amountNo, claimed]
        const amountYes = userBet[0] as bigint;
        const amountNo = userBet[1] as bigint;
        const claimed = userBet[2] as boolean;

        // Create bet entries for YES and NO if they exist
        if (amountYes > BigInt(0)) {
          // Fetch the actual timestamp from BetPlaced events
          const timestamp = await fetchBetTimestamp(
            publicClient,
            contractAddress,
            BigInt(i),
            address,
            "YES"
          );

          bets.push({
            id: `bet-${i}-${address}-yes`,
            marketId: `market-${i}`,
            userAddress: address,
            side: "YES",
            amount: amountYes,
            timestamp,
            claimed,
          });
        }

        if (amountNo > BigInt(0)) {
          // Fetch the actual timestamp from BetPlaced events
          const timestamp = await fetchBetTimestamp(
            publicClient,
            contractAddress,
            BigInt(i),
            address,
            "NO"
          );

          bets.push({
            id: `bet-${i}-${address}-no`,
            marketId: `market-${i}`,
            userAddress: address,
            side: "NO",
            amount: amountNo,
            timestamp,
            claimed,
          });
        }
      } catch (error) {
        console.error(`Failed to fetch user bet for market ${i}:`, error);
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
      contractAddress = getPredictionMarketAddress(base.id);
    } catch {
      console.warn("Prediction market contract not deployed");
      return NextResponse.json({ bets: [], betCount: 0 });
    }

    const cached = await getCachedUserBets(address as Address);
    let bets: MarketBet[] = [];
    let betCount = 0;

    const buildMarketsMap = async () => {
      const markets = await fetchMarketsFromChain({ includeResolved: true, includeExpired: true });
      return new Map<string, PredictionMarket>(
        markets.map((market) => [`market-${market.marketIndex}`, market])
      );
    };

    const serializeBets = (
      betList: MarketBet[],
      marketsById: Map<string, PredictionMarket>
    ) =>
      betList.map((bet) => {
        const baseBet = serializeMarketBet(bet);
        const market = marketsById.get(bet.marketId);
        return {
          ...baseBet,
          market: market
            ? {
                id: market.id,
                songTitle: market.songTitle,
                songArtist: market.songArtist,
                songCover: market.songCover,
                endTime: market.endTime,
                status: market.status,
              }
            : null,
        };
      });

    if (cached) {
      bets = cached;
      const marketsById = await buildMarketsMap();
      const serialized = serializeBets(bets, marketsById);

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
    const serialized = serializeBets(bets, marketsById);

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

