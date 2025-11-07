import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import type { AbiEvent, Log } from "viem";
import { getPredictionMarketAddress, predictionMarketABI } from "@/lib/contracts/prediction-market";
import {
  cacheMarketBets,
  getCachedMarketBets,
  getCachedDeploymentBlock,
} from "@/lib/prediction-cache";
import { serializeMarketBets } from "@/lib/bigint-serialization";
import type { MarketBet } from "@/types/prediction-market";

const DEFAULT_BASE_RPC = process.env.NEXT_PUBLIC_RPC_URL || "https://mainnet.base.org";
const BETS_CHUNK_SIZE = BigInt(2000);

const createBaseClient = () =>
  createPublicClient({
    chain: base,
    transport: http(DEFAULT_BASE_RPC),
  }) as ReturnType<typeof createPublicClient>;

const getAbiEvent = (name: string): AbiEvent | undefined =>
  predictionMarketABI.find((item) => item.type === "event" && "name" in item && item.name === name) as
    | AbiEvent
    | undefined;

const parseMarketIdentifier = (rawId: string): number | null => {
  if (!rawId) return null;
  if (rawId.startsWith("market-")) {
    const numeric = Number(rawId.replace("market-", ""));
    if (Number.isInteger(numeric) && numeric >= 0) return numeric;
    return null;
  }
  const numeric = Number(rawId);
  if (Number.isInteger(numeric) && numeric >= 0) return numeric;
  return null;
};

const buildBetId = (log: Log) => {
  const txHash = log.transactionHash ?? "";
  const logIndex = typeof log.logIndex === "number" ? log.logIndex : 0;
  return `${txHash}-${logIndex}`;
};

const normalizeBet = async (
  client: ReturnType<typeof createBaseClient>,
  marketId: string,
  log: Log,
  blockTimestamps: Map<bigint, number>
): Promise<MarketBet | null> => {
  if (!("args" in log) || !log.args) return null;

  const { user, side, amount } = log.args as {
    user?: `0x${string}`;
    side?: boolean;
    amount?: bigint;
  };

  const transactionHash = log.transactionHash;
  const blockNumber = log.blockNumber;

  if (!user || typeof side !== "boolean" || typeof amount === "undefined" || !blockNumber) return null;

  let timestamp = blockTimestamps.get(blockNumber);
  if (!timestamp) {
    const block = await client.getBlock({ blockNumber });
    timestamp = Number(block.timestamp);
    blockTimestamps.set(blockNumber, timestamp);
  }

  return {
    id: buildBetId(log),
    marketId,
    userAddress: user,
    side: side ? "YES" : "NO",
    amount: BigInt(amount),
    timestamp,
    claimed: false,
    txHash: transactionHash ?? undefined,
  };
};

const fetchBetsFromContract = async (marketId: string): Promise<MarketBet[]> => {
  const marketIndex = parseMarketIdentifier(marketId);
  if (marketIndex === null) {
    console.warn("Invalid market identifier supplied:", marketId);
    return [];
  }

  let contractAddress: string;
  try {
    contractAddress = getPredictionMarketAddress(base.id);
  } catch {
    console.warn("Prediction market contract not deployed");
    return [];
  }

  const client = createBaseClient();

  const betPlacedEvent = getAbiEvent("BetPlaced");
  if (!betPlacedEvent) {
    console.warn("BetPlaced event missing from ABI");
    return [];
  }

  const marketCreatedEvent = getAbiEvent("MarketCreated");
  const blockTimestamps = new Map<bigint, number>();

  let startBlock = await getCachedDeploymentBlock(contractAddress);

  if (!startBlock && marketCreatedEvent) {
    try {
      const creationLogs = await client.getLogs({
        address: contractAddress as `0x${string}`,
        event: marketCreatedEvent,
        args: {
          marketId: BigInt(marketIndex),
        },
      });

      if (creationLogs.length && creationLogs[0].blockNumber) {
        startBlock = creationLogs[0].blockNumber;
      }
    } catch (error) {
      console.warn("Failed to fetch MarketCreated logs:", error);
    }
  }

  const effectiveStartBlock = startBlock ?? BigInt(0);

  let latestBlock: bigint;
  try {
    latestBlock = await client.getBlockNumber();
  } catch (error) {
    console.error("Failed to fetch latest block:", error);
    return [];
  }

  const logs: Log<bigint, number, boolean, undefined>[] = [];

  let fromBlock = effectiveStartBlock;

  while (fromBlock <= latestBlock) {
    const toBlockCandidate = fromBlock + BETS_CHUNK_SIZE - BigInt(1);
    const toBlock = toBlockCandidate > latestBlock ? latestBlock : toBlockCandidate;

    try {
      const chunkLogs = await client.getLogs({
        address: contractAddress as `0x${string}`,
        event: betPlacedEvent,
        args: {
          marketId: BigInt(marketIndex),
        },
        fromBlock,
        toBlock,
      });

      logs.push(...chunkLogs);
    } catch (error) {
      console.warn(`Failed to fetch BetPlaced logs for blocks ${fromBlock}-${toBlock}:`, error);
    }

    if (toBlock === latestBlock) break;
    fromBlock = toBlock + BigInt(1);
  }

  if (!logs.length) return [];

  const normalized: MarketBet[] = [];
  for (const log of logs) {
    try {
      const bet = await normalizeBet(client, marketId, log, blockTimestamps);
      if (bet) normalized.push(bet);
    } catch (error) {
      console.warn("Failed to normalize bet log:", error);
    }
  }

  if (!normalized.length) return [];

  normalized.sort((a, b) => {
    if (a.timestamp === b.timestamp) return a.id.localeCompare(b.id);
    return a.timestamp - b.timestamp;
  });

  return normalized;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ marketId: string }> }
) {
  try {
    const { marketId } = await params;

    const cached = await getCachedMarketBets(marketId);
    if (cached) {
      const serialized = serializeMarketBets(cached);
      return NextResponse.json(serialized);
    }

    const bets = await fetchBetsFromContract(marketId);

    await cacheMarketBets(marketId, bets);

    const serialized = serializeMarketBets(bets);
    return NextResponse.json(serialized);
  } catch (error) {
    console.error("Error fetching market bets:", error);
    return NextResponse.json({ error: "Failed to fetch market bets" }, { status: 500 });
  }
}

