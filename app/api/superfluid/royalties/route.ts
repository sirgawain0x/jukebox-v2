import { NextRequest, NextResponse } from 'next/server';
import { getActivePools, getPoolMembers, calculateTotalFlowRate } from '@/lib/superfluid-pool';
import { getActiveBoost } from '@/lib/superfluid-fan-boost';

/**
 * GET /api/superfluid/royalties/live
 * Get live royalty data (total flow rates, top artists, etc.)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const marketId = searchParams.get('marketId');
    const artistAddress = searchParams.get('artist');

    if (artistAddress) {
      // Get artist-specific data
      return await getArtistRoyalties(artistAddress);
    }

    if (marketId) {
      // Get market-specific data
      return await getMarketRoyalties(parseInt(marketId));
    }

    // Get global live data
    return await getLiveRoyalties();
  } catch (error) {
    console.error('Error fetching royalties:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function getLiveRoyalties() {
  const pools = await getActivePools();
  
  let totalFlowRate = 0n;
  let totalArtists = 0;
  const topArtists: Array<{
    address: string;
    name: string;
    flowRate: number;
    dailyEarnings: string;
  }> = [];

  // Calculate totals across all pools
  for (const pool of pools) {
    totalFlowRate += pool.totalFlowRate;
    totalArtists += pool.totalMembers;

    // Get top artists from this pool
    const members = await getPoolMembers(pool.marketId);
    const sortedMembers = Array.from(members.entries())
      .sort((a, b) => {
        if (a[1] > b[1]) return -1;
        if (a[1] < b[1]) return 1;
        return 0;
      })
      .slice(0, 10);

    // Calculate flow rate per artist (simplified - assumes equal distribution per unit)
    const totalUnits = Array.from(members.values()).reduce((sum, units) => sum + units, 0n);
    if (totalUnits > 0n) {
      sortedMembers.forEach(([address, units]) => {
        const artistFlowRate = (pool.totalFlowRate * units) / totalUnits;
        const dailyEarnings = Number(artistFlowRate) * 86400 / 1e6; // USDC has 6 decimals

        topArtists.push({
          address,
          name: address.slice(0, 6) + '...' + address.slice(-4), // Truncated address
          flowRate: Number(artistFlowRate) / 1e6,
          dailyEarnings: dailyEarnings.toFixed(4),
        });
      });
    }
  }

  // Sort all artists and take top 10
  topArtists.sort((a, b) => b.flowRate - a.flowRate);
  const top10 = topArtists.slice(0, 10);

  // Format flow rate for display
  const flowRatePerSecond = Number(totalFlowRate) / 1e6; // USDC has 6 decimals
  const dailyTotal = flowRatePerSecond * 86400;

  return NextResponse.json({
    totalFlowRate: totalFlowRate.toString(),
    totalFlowRateFormatted: `$${flowRatePerSecond.toFixed(8)}/sec`,
    dailyTotal: dailyTotal.toFixed(2),
    artistCount: totalArtists,
    topArtists: top10,
  });
}

async function getMarketRoyalties(marketId: number) {
  const { getPool } = await import('@/lib/superfluid-pool');
  const pool = await getPool(marketId);

  if (!pool) {
    return NextResponse.json(
      { error: 'Pool not found' },
      { status: 404 }
    );
  }

  const members = await getPoolMembers(marketId);
  const totalUnits = Array.from(members.values()).reduce((sum, units) => sum + units, 0n);

  const artists = Array.from(members.entries()).map(([address, units]) => {
    const flowRate = totalUnits > 0n ? (pool.totalFlowRate * units) / totalUnits : 0n;
    const dailyEarnings = Number(flowRate) * 86400 / 1e6;

    return {
      address,
      units: units.toString(),
      flowRate: Number(flowRate) / 1e6,
      dailyEarnings: dailyEarnings.toFixed(4),
      share: totalUnits > 0n ? Number((units * 10000n) / totalUnits) / 100 : 0,
    };
  });

  return NextResponse.json({
    marketId,
    pool: {
      address: pool.poolAddress,
      totalFlowRate: pool.totalFlowRate.toString(),
      totalFlowRateFormatted: `$${(Number(pool.totalFlowRate) / 1e6).toFixed(8)}/sec`,
      totalMembers: pool.totalMembers,
      isActive: pool.isActive,
    },
    artists,
  });
}

async function getArtistRoyalties(artistAddress: string) {
  const pools = await getActivePools();
  
  const artistData = [];
  let totalFlowRate = 0n;

  for (const pool of pools) {
    const members = await getPoolMembers(pool.marketId);
    const units = members.get(artistAddress);
    
    if (units && units > 0n) {
      const totalUnits = Array.from(members.values()).reduce((sum, u) => sum + u, 0n);
      const flowRate = totalUnits > 0n ? (pool.totalFlowRate * units) / totalUnits : 0n;
      totalFlowRate += flowRate;

      // Check for active boost
      const boost = await getActiveBoost(artistAddress);
      const boostedFlowRate = boost 
        ? (flowRate * BigInt(Math.floor(boost.multiplier * 10000))) / 10000n
        : flowRate;

      artistData.push({
        marketId: pool.marketId,
        poolAddress: pool.poolAddress,
        units: units.toString(),
        flowRate: Number(flowRate) / 1e6,
        boostedFlowRate: Number(boostedFlowRate) / 1e6,
        dailyEarnings: ((Number(boostedFlowRate) * 86400) / 1e6).toFixed(4),
        boost: boost ? {
          multiplier: boost.multiplier,
          expiresAt: boost.expiresAt,
        } : null,
      });
    }
  }

  return NextResponse.json({
    artistAddress,
    totalFlowRate: totalFlowRate.toString(),
    totalFlowRateFormatted: `$${(Number(totalFlowRate) / 1e6).toFixed(8)}/sec`,
    dailyTotal: ((Number(totalFlowRate) / 1e6) * 86400).toFixed(2),
    pools: artistData,
  });
}

