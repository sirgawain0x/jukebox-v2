import { NextRequest, NextResponse } from 'next/server';
import {
  applyFanBoost,
  getActiveBoost,
  getBoostHistory,
  getTotalBoosted,
  clearExpiredBoost,
} from '@/lib/superfluid-fan-boost';

/**
 * GET /api/superfluid/fanboost
 * Get boost information for an artist
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const artistAddress = searchParams.get('artist');
    const includeHistory = searchParams.get('history') === 'true';

    if (!artistAddress) {
      return NextResponse.json(
        { error: 'Missing artist parameter' },
        { status: 400 }
      );
    }

    // Clear expired boost first
    await clearExpiredBoost(artistAddress);

    const activeBoost = await getActiveBoost(artistAddress);
    const response: {
      activeBoost: typeof activeBoost;
      history?: any[];
      totalBoosted?: string;
    } = {
      activeBoost,
    };

    if (includeHistory) {
      const history = await getBoostHistory(artistAddress, 20);
      const totalBoosted = await getTotalBoosted(artistAddress);
      
      response.history = history;
      response.totalBoosted = totalBoosted.toString();
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching fan boost:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/superfluid/fanboost
 * Apply fan boost to an artist
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { artistAddress, multiplier, duration, boostedBy, boostAmount } = body;

    if (!artistAddress || !multiplier || !duration || !boostedBy) {
      return NextResponse.json(
        { error: 'Missing required fields: artistAddress, multiplier, duration, boostedBy' },
        { status: 400 }
      );
    }

    // Validate multiplier
    if (multiplier < 1.0 || multiplier > 5.0) {
      return NextResponse.json(
        { error: 'Multiplier must be between 1.0 and 5.0' },
        { status: 400 }
      );
    }

    // Validate duration (max 7 days)
    const maxDuration = 7 * 24 * 60 * 60;
    if (duration <= 0 || duration > maxDuration) {
      return NextResponse.json(
        { error: `Duration must be between 1 second and ${maxDuration} seconds (7 days)` },
        { status: 400 }
      );
    }

    const boost = await applyFanBoost(
      artistAddress,
      multiplier,
      duration,
      boostedBy,
      boostAmount ? BigInt(boostAmount) : undefined
    );

    return NextResponse.json({
      success: true,
      boost: {
        ...boost,
        totalBoosted: boost.totalBoosted.toString(),
      },
    });
  } catch (error) {
    console.error('Error applying fan boost:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/superfluid/fanboost
 * Clear expired boost (cleanup)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const artistAddress = searchParams.get('artist');

    if (!artistAddress) {
      return NextResponse.json(
        { error: 'Missing artist parameter' },
        { status: 400 }
      );
    }

    const cleared = await clearExpiredBoost(artistAddress);

    return NextResponse.json({ success: true, cleared });
  } catch (error) {
    console.error('Error clearing fan boost:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

