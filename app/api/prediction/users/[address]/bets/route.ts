import { NextRequest, NextResponse } from "next/server";
import { getCachedUserBets, cacheUserBets } from "@/lib/prediction-cache";
import { serializeMarketBets } from "@/lib/bigint-serialization";
import type { MarketBet } from "@/types/prediction-market";
import { Address } from "viem";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { getPredictionMarketAddress, predictionMarketABI } from "@/lib/contracts/prediction-market";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://base-mainnet.infura.io";

/**
 * Fetch the actual number of bet transactions for a user from BetPlaced events
 */
async function fetchUserBetCount(
  publicClient: any,
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

    const MAX_BLOCKS_PER_QUERY = BigInt(1000);
    const MAX_BLOCKS_TO_SEARCH = BigInt(10000);
    
    let totalCount = 0;
    
    try {
      const latestBlock = await publicClient.getBlockNumber();
      const startBlock = latestBlock > MAX_BLOCKS_TO_SEARCH 
        ? latestBlock - MAX_BLOCKS_TO_SEARCH 
        : BigInt(0);
      
      let currentFromBlock = startBlock;
      
      while (currentFromBlock <= latestBlock) {
        const chunkToBlock = currentFromBlock + MAX_BLOCKS_PER_QUERY - BigInt(1);
        const actualToBlock = chunkToBlock > latestBlock ? latestBlock : chunkToBlock;
        
        try {
          const chunkLogs = await publicClient.getLogs({
            address: contractAddress as `0x${string}`,
            event: betPlacedEvent as any,
            args: {
              user: userAddress,
            },
            fromBlock: currentFromBlock,
            toBlock: actualToBlock,
          });
          
          totalCount += chunkLogs.length;
          
          currentFromBlock = actualToBlock + BigInt(1);
          
          if (actualToBlock >= latestBlock) {
            break;
          }
        } catch (chunkError: any) {
          console.warn(`Failed to fetch bet count chunk:`, chunkError.message || chunkError);
          currentFromBlock = actualToBlock + BigInt(1);
        }
      }
    } catch (error: any) {
      console.error("Failed to fetch user bet count from events:", error.message || error);
      return 0;
    }
    
    return totalCount;
  } catch (error) {
    console.error("Error fetching user bet count:", error);
    return 0;
  }
}

async function fetchUserBetsFromContract(
  address: Address,
  publicClient: any
): Promise<MarketBet[]> {
  try {

    // Wrap getPredictionMarketAddress in try-catch (like markets route does)
    let contractAddress: string | null = null;
    try {
      contractAddress = getPredictionMarketAddress(base.id);
    } catch (error) {
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
          bets.push({
            id: `bet-${i}-${address}-yes`,
            marketId: `market-${i}`,
            userAddress: address,
            side: "YES",
            amount: amountYes,
            timestamp: Math.floor(Date.now() / 1000), // We don't have timestamp from contract
            claimed,
          });
        }

        if (amountNo > BigInt(0)) {
          bets.push({
            id: `bet-${i}-${address}-no`,
            marketId: `market-${i}`,
            userAddress: address,
            side: "NO",
            amount: amountNo,
            timestamp: Math.floor(Date.now() / 1000),
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
    });

    let contractAddress: string | null = null;
    try {
      contractAddress = getPredictionMarketAddress(base.id);
    } catch (error) {
      console.warn("Prediction market contract not deployed");
      return NextResponse.json({ bets: [], betCount: 0 });
    }

    // Try to get from cache first
    const cached = await getCachedUserBets(address as Address);
    let bets: MarketBet[] = [];
    let betCount = 0;

    if (cached) {
      bets = cached;
      // Serialize BigInt values to strings for JSON response
      const serialized = serializeMarketBets(cached);
      // Fetch actual bet count from events
      try {
        betCount = await fetchUserBetCount(publicClient, contractAddress, address as Address);
      } catch (error) {
        console.warn("Could not fetch bet count, using length as fallback:", error);
        betCount = cached.length;
      }
      return NextResponse.json({ bets: serialized, betCount });
    }

    // Fetch from contract/subgraph
    bets = await fetchUserBetsFromContract(address as Address, publicClient);

    // Cache the results
    await cacheUserBets(address as Address, bets);

    // Serialize BigInt values to strings for JSON response
    const serialized = serializeMarketBets(bets);
    
    // Fetch actual bet count from events
    try {
      betCount = await fetchUserBetCount(publicClient, contractAddress, address as Address);
    } catch (error) {
      console.warn("Could not fetch bet count, using length as fallback:", error);
      betCount = bets.length;
    }
    
    return NextResponse.json({ bets: serialized, betCount });
  } catch (error) {
    console.error("Error fetching user bets:", error);
    return NextResponse.json(
      { error: "Failed to fetch user bets" },
      { status: 500 }
    );
  }
}

