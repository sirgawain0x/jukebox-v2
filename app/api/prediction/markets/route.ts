import { NextRequest, NextResponse } from "next/server";
import { getCachedActiveMarkets, cacheActiveMarkets } from "@/lib/prediction-cache";
import { fetchTrendingSongs } from "@/lib/trending-songs";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { getPredictionMarketAddress, predictionMarketABI } from "@/lib/contracts/prediction-market";
import { serializePredictionMarkets } from "@/lib/bigint-serialization";
import type { PredictionMarket } from "@/types/prediction-market";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://base-mainnet.infura.io";

/**
 * Fetch bet counts from BetPlaced events for all markets
 */
async function fetchBetCounts(
  publicClient: ReturnType<typeof createPublicClient>,
  contractAddress: string
): Promise<Map<number, number>> {
  const betCountsMap = new Map<number, number>();
  
  try {
    // Find the BetPlaced event from the ABI
    const betPlacedEvent = predictionMarketABI.find(
      (item) => item.type === "event" && item.name === "BetPlaced"
    );

    if (!betPlacedEvent) {
      console.warn("BetPlaced event not found in ABI");
      return betCountsMap;
    }

    // RPC limits queries to 1000 blocks max, so we need to batch requests
    // Use a reasonable block range - start from last 10k blocks (covers ~2 days)
    // For production, you should cache the contract deployment block
    const MAX_BLOCKS_PER_QUERY = BigInt(1000);
    const MAX_BLOCKS_TO_SEARCH = BigInt(10000); // Last 10k blocks (~2 days)
    
    const logs: Array<{
      args?: Record<string, unknown>;
      topics?: readonly `0x${string}`[];
    }> = [];
    
    try {
      const latestBlock = await publicClient.getBlockNumber();
      // Start from last 10k blocks or block 0 if chain is shorter
      const startBlock = latestBlock > MAX_BLOCKS_TO_SEARCH 
        ? latestBlock - MAX_BLOCKS_TO_SEARCH 
        : BigInt(0);
      
      console.log(`Fetching BetPlaced events from block ${startBlock} to ${latestBlock} in chunks of ${MAX_BLOCKS_PER_QUERY} blocks`);
      
      // Fetch logs in chunks of 1000 blocks
      let currentFromBlock = startBlock;
      let chunkCount = 0;
      
      while (currentFromBlock <= latestBlock) {
        const chunkToBlock = currentFromBlock + MAX_BLOCKS_PER_QUERY - BigInt(1);
        const actualToBlock = chunkToBlock > latestBlock ? latestBlock : chunkToBlock;
        
        try {
          chunkCount++;
          console.log(`Fetching chunk ${chunkCount}: blocks ${currentFromBlock} to ${actualToBlock}`);
          
          const chunkLogs = await publicClient.getLogs({
            address: contractAddress as `0x${string}`,
            event: betPlacedEvent,
            fromBlock: currentFromBlock,
            toBlock: actualToBlock,
          }) as Array<{
            args?: Record<string, unknown>;
            topics?: readonly `0x${string}`[];
          }>;
          
          logs.push(...chunkLogs);
          console.log(`  Found ${chunkLogs.length} events in this chunk`);
          
          // Move to next chunk
          currentFromBlock = actualToBlock + BigInt(1);
          
          // If we've reached the latest block, we're done
          if (actualToBlock >= latestBlock) {
            break;
          }
        } catch (chunkError: unknown) {
          const errorMessage = chunkError instanceof Error ? chunkError.message : String(chunkError);
          console.warn(`Failed to fetch chunk ${chunkCount} (blocks ${currentFromBlock}-${actualToBlock}):`, errorMessage);
          // Continue with next chunk instead of failing completely
          currentFromBlock = actualToBlock + BigInt(1);
        }
      }
      
      console.log(`Successfully fetched ${logs.length} total BetPlaced events across ${chunkCount} chunks`);
    } catch (error: unknown) {
      // If all else fails, return empty map - we'll show 0 bets but won't crash
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Failed to fetch bet counts from events:", errorMessage);
      console.warn("Bet counts will be 0. Consider caching the contract deployment block to reduce query range.");
      return betCountsMap;
    }

    // Count bets per market
    for (const log of logs) {
      try {
        // The event args should have marketId as the first indexed parameter
        let marketId: number | undefined;
        
        if (log.args && typeof log.args === 'object') {
          const args = log.args as Record<string, unknown>;
          if ('marketId' in args && args.marketId !== undefined) {
            marketId = Number(args.marketId);
          }
        }
        
        // If args don't have marketId, try to extract from topics (indexed params)
        if (marketId === undefined && log.topics && log.topics.length > 1) {
          // marketId is the first indexed param, so it's in topics[1] (topics[0] is the event signature)
          marketId = Number(BigInt(log.topics[1]));
        }
        
        if (marketId !== undefined) {
          const currentCount = betCountsMap.get(marketId) || 0;
          betCountsMap.set(marketId, currentCount + 1);
          console.log(`Found bet for market ${marketId}, count now: ${currentCount + 1}`);
        } else {
          console.warn("BetPlaced log missing marketId:", log);
        }
      } catch (parseError) {
        console.warn("Failed to parse bet log:", parseError, log);
        continue;
      }
    }

    console.log(`Bet counts map:`, Object.fromEntries(betCountsMap));
  } catch (error) {
    console.error("Failed to fetch bet counts from events:", error);
    // Return empty map if event fetching fails
  }
  
  return betCountsMap;
}

/**
 * Fetch song information from Spinamp by songId
 */
async function fetchSongById(songId: string): Promise<{ title: string; artist: string; cover: string } | null> {
  try {
    const query = `
      query GetTrack($id: ID!) {
        processedTrack(id: $id) {
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

    if (!response.ok) return null;

    const result = await response.json();
    if (result.errors || !result.data?.processedTrack) return null;

    const track = result.data.processedTrack;
    return {
      title: track.title || "Unknown Title",
      artist: track.artistByArtistId?.name || "Unknown Artist",
      cover: track.lossyArtworkUrl || "",
    };
  } catch (error) {
    console.error(`Failed to fetch song ${songId}:`, error);
    return null;
  }
}

/**
 * Fetch markets from contract and enrich with song data
 */
async function fetchMarketsFromContract(): Promise<PredictionMarket[]> {
  try {
    // Create public client for contract reads
    const publicClient = createPublicClient({
      chain: base,
      transport: http(RPC_URL),
    }) as ReturnType<typeof createPublicClient>;

    let contractAddress: string | null = null;
    try {
      contractAddress = getPredictionMarketAddress(base.id);
    } catch (_error) {
      console.warn("Prediction market contract not deployed");
      return [];
    }

    const currentTime = Math.floor(Date.now() / 1000);

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

    // Fetch trending songs for enrichment (optional, used as fallback)
    const trendingSongs = await fetchTrendingSongs(50); // Fetch more to increase chance of match
    const songMap = new Map(trendingSongs.map(song => [song.id, song]));

    const markets: PredictionMarket[] = [];

    // First, fetch all market data from contract
    const marketDataPromises = [];
    for (let marketIndex = 0; marketIndex < marketCount; marketIndex++) {
      marketDataPromises.push(
        publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: predictionMarketABI,
          functionName: "markets",
          args: [BigInt(marketIndex)],
        }).then(data => ({ marketIndex, data }))
          .catch(error => {
            console.error(`Failed to fetch market ${marketIndex}:`, error);
            return null;
          })
      );
    }

    const marketDataResults = await Promise.all(marketDataPromises);
    const marketSongIds = new Set<string>();

    // Process market data and collect unique song IDs
    for (const result of marketDataResults) {
      if (!result) continue;
      
      const { data: marketData } = result;
      // marketData structure: [songId, endTime, resolved, winner, totalPoolYes, totalPoolNo, maxBetAmount]
      const songId = marketData[0] as string;
      const endTime = Number(marketData[1]);
      const resolved = marketData[2] as boolean;

      // Skip resolved or expired markets
      if (resolved || endTime <= currentTime) {
        continue;
      }

      // Collect unique song IDs that need fetching
      if (!songMap.has(songId)) {
        marketSongIds.add(songId);
      }
    }

    // Batch fetch song info for songs not in trending list
    const songInfoPromises = Array.from(marketSongIds).map(songId => 
      fetchSongById(songId).then(info => ({ songId, info }))
    );
    const songInfoResults = await Promise.all(songInfoPromises);
    const songInfoMap = new Map(
      songInfoResults
        .filter(result => result.info)
        .map(result => [result.songId, result.info!])
    );

    // Fetch bet counts from events for all active markets
    const betCountsMap = await fetchBetCounts(publicClient, contractAddress);

    // Now create market objects with all song info available
    for (const result of marketDataResults) {
      if (!result) continue;
      
      const { marketIndex, data: marketData } = result;
      const songId = marketData[0] as string;
      const endTime = Number(marketData[1]);
      const resolved = marketData[2] as boolean;
      const totalPoolYes = marketData[4] as bigint;
      const totalPoolNo = marketData[5] as bigint;

      // Skip resolved or expired markets
      if (resolved || endTime <= currentTime) {
        continue;
      }

      // Get song info from trending songs, fetched song info, or fallback
      let songTitle = "Unknown Title";
      let songArtist = "Unknown Artist";
      let songCover = "";

      const trendingSong = songMap.get(songId);
      if (trendingSong) {
        songTitle = trendingSong.title;
        songArtist = trendingSong.artist;
        songCover = trendingSong.cover;
      } else {
        const fetchedSongInfo = songInfoMap.get(songId);
        if (fetchedSongInfo) {
          songTitle = fetchedSongInfo.title;
          songArtist = fetchedSongInfo.artist;
          songCover = fetchedSongInfo.cover;
        } else {
          // Use songId as fallback title
          songTitle = songId;
        }
      }

      // Get bet count from events map
      const totalBets = betCountsMap.get(marketIndex) || 0;

      // Create market object
      const market: PredictionMarket = {
        id: `market-${marketIndex}`,
        songId,
        songTitle,
        songArtist,
        songCover,
        endTime,
        status: "ACTIVE",
        createdAt: currentTime, // We don't have creation time from contract, use current
        totalPoolYes,
        totalPoolNo,
        totalBets,
        contractAddress,
        marketIndex,
      };

      markets.push(market);
    }

    // Sort by market index (creation order)
    markets.sort((a, b) => (a.marketIndex || 0) - (b.marketIndex || 0));

    return markets;
  } catch (error) {
    console.error("Error fetching markets from contract:", error);
    // Fallback: return empty array
    return [];
  }
}

export async function GET(_request: NextRequest) {
  try {
    // Try to get from cache first
    const cached = await getCachedActiveMarkets();
    if (cached && cached.length > 0) {
      // Check if cache is still valid (markets haven't expired)
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Get current contract address to validate cached markets
      let currentContractAddress: string | null = null;
      try {
        currentContractAddress = getPredictionMarketAddress(base.id);
      } catch {
        // Contract not deployed, clear cache and fetch fresh
        console.warn("Contract not deployed, clearing cache");
        await cacheActiveMarkets([]);
        const markets = await fetchMarketsFromContract();
        const activeMarkets = markets.filter(
          (market) =>
            market.status === "ACTIVE" &&
            market.endTime > currentTime
        );
        await cacheActiveMarkets(activeMarkets);
        const serialized = serializePredictionMarkets(activeMarkets);
        return NextResponse.json(serialized);
      }
      
      // Validate cached markets have contractAddress and it matches current chain
      const validMarkets = cached.filter(
        (market) => 
          market.status === "ACTIVE" && 
          market.endTime > currentTime &&
          market.contractAddress && // Ensure contractAddress exists
          market.contractAddress === currentContractAddress // Ensure it matches current chain
      );
      
      // If no valid markets after validation, clear cache and fetch fresh
      if (validMarkets.length === 0 && cached.length > 0) {
        console.warn("Cached markets invalid (missing or mismatched contractAddress), fetching fresh data");
        await cacheActiveMarkets([]); // Clear invalid cache
        const markets = await fetchMarketsFromContract();
        const activeMarkets = markets.filter(
          (market) =>
            market.status === "ACTIVE" &&
            market.endTime > currentTime
        );
        await cacheActiveMarkets(activeMarkets);
        const serialized = serializePredictionMarkets(activeMarkets);
        return NextResponse.json(serialized);
      }
      
      if (validMarkets.length > 0) {
        // Always fetch fresh bet counts even for cached markets
        const publicClient = createPublicClient({
          chain: base,
          transport: http(RPC_URL),
        }) as ReturnType<typeof createPublicClient>;
        const betCountsMap = await fetchBetCounts(publicClient, currentContractAddress);
        
        // Update bet counts in cached markets
        const marketsWithFreshBetCounts = validMarkets.map((market) => ({
          ...market,
          totalBets: market.marketIndex !== undefined ? betCountsMap.get(market.marketIndex) || 0 : 0,
        }));
        
        // Serialize BigInt values to strings for JSON response
        const serialized = serializePredictionMarkets(marketsWithFreshBetCounts);
        return NextResponse.json(serialized);
      }
    }

    // Fetch from contract/trending songs
    const markets = await fetchMarketsFromContract();
    
    // Filter only active markets
    const activeMarkets = markets.filter(
      (market) =>
        market.status === "ACTIVE" &&
        market.endTime > Math.floor(Date.now() / 1000)
    );

    // Cache the results
    await cacheActiveMarkets(activeMarkets);

    // Serialize BigInt values to strings for JSON response
    const serialized = serializePredictionMarkets(activeMarkets);
    return NextResponse.json(serialized);
  } catch {
    console.error("Error fetching markets");
    return NextResponse.json(
      { error: "Failed to fetch markets" },
      { status: 500 }
    );
  }
}

