import { NextRequest, NextResponse } from 'next/server';
import { getActivePools, getPoolMembers } from '@/lib/superfluid-pool';

/**
 * GET /api/superfluid/royalties/live
 * Get live royalty data (total flow rates, top artists, etc.)
 */
export async function GET(_request: NextRequest) {
  try {
    const pools = await getActivePools();
    
    let totalFlowRate = BigInt('0');
    let totalArtists = 0;
    const topArtists: Array<{
      address: string;
      name: string;
      flowRate: number;
      dailyEarnings: string;
    }> = [];

    // Calculate totals across all pools
    for (const pool of pools) {
      try {
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
        const totalUnits = Array.from(members.values()).reduce((sum, units) => sum + units, BigInt('0'));
        if (totalUnits > BigInt('0')) {
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
      } catch (poolError) {
        // Log error but continue processing other pools
        console.error(`Error processing pool ${pool.marketId}:`, poolError);
        continue;
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
  } catch (error) {
    console.error('Error in getLiveRoyalties:', error);
    // Return empty data instead of throwing
    return NextResponse.json({
      totalFlowRate: '0',
      totalFlowRateFormatted: '$0.00000000/sec',
      dailyTotal: '0.00',
      artistCount: 0,
      topArtists: [],
    });
  }
}

