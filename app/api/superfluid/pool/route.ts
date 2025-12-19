import { NextRequest, NextResponse } from 'next/server';
import { storePool, getPool, getActivePools, deactivatePool } from '@/lib/superfluid-pool';
import { validatePoolAndBalance } from '@/lib/superfluid-pool-validation';

/**
 * GET /api/superfluid/pool
 * Get pool information for a market or all active pools
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const marketId = searchParams.get('marketId');

    if (marketId) {
      // Get specific pool
      const pool = await getPool(parseInt(marketId));
      if (!pool) {
        return NextResponse.json(
          { error: 'Pool not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ pool });
    }

    // Get all active pools
    const pools = await getActivePools();
    return NextResponse.json({ pools });
  } catch (error) {
    console.error('Error fetching pool:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/superfluid/pool
 * Create or update pool information
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { marketId, poolAddress, tokenAddress, totalFlowRate, totalMembers } = body;

    if (!marketId || !poolAddress || !tokenAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: marketId, poolAddress, tokenAddress' },
        { status: 400 }
      );
    }

    const pool = {
      marketId: parseInt(marketId),
      poolAddress,
      tokenAddress,
      createdAt: Date.now(),
      totalFlowRate: BigInt(totalFlowRate || 0),
      totalMembers: totalMembers || 0,
      isActive: true,
    };

    await storePool(pool);

    return NextResponse.json({ success: true, pool });
  } catch (error) {
    console.error('Error creating pool:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/superfluid/pool
 * Deactivate pool (when market resolves)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const marketId = searchParams.get('marketId');

    if (!marketId) {
      return NextResponse.json(
        { error: 'Missing marketId parameter' },
        { status: 400 }
      );
    }

    await deactivatePool(parseInt(marketId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deactivating pool:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

