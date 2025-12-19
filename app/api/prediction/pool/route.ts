import { NextRequest, NextResponse } from 'next/server';
import { fetchActiveMarketsFromChain } from '@/lib/server/prediction-market-data';

/**
 * GET /api/prediction/pool
 * Get total USDC pool balance across all active prediction markets
 */
export async function GET(_request: NextRequest) {
  try {
    // Fetch all active markets
    const markets = await fetchActiveMarketsFromChain();
    
    // Sum up all pool balances (totalPoolYes + totalPoolNo for each market)
    let totalPoolBalance = BigInt(0);
    const activeMarketCount = markets.length;
    let totalBets = 0;

    for (const market of markets) {
      // totalPoolYes + totalPoolNo gives us the total USDC in this market's pool
      const marketPool = market.totalPoolYes + market.totalPoolNo;
      totalPoolBalance += marketPool;
      totalBets += market.totalBets || 0;
    }

    // Convert to USDC (6 decimals)
    const totalPoolUSDC = Number(totalPoolBalance) / 1e6;

    return NextResponse.json({
      totalPoolBalance: totalPoolBalance.toString(),
      totalPoolUSDC: totalPoolUSDC.toFixed(2),
      activeMarketCount,
      totalBets,
    });
  } catch (error) {
    console.error('Error fetching pool data:', error);
    // Return empty data instead of throwing
    return NextResponse.json({
      totalPoolBalance: '0',
      totalPoolUSDC: '0.00',
      activeMarketCount: 0,
      totalBets: 0,
    });
  }
}

