import { NextRequest, NextResponse } from 'next/server';
import { getDailyStats, updateDailySession, isEligibleForRewards } from '@/lib/session-tracking';

// GET - Get daily stats for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const stats = await getDailyStats(userId);
    const eligible = await isEligibleForRewards(userId);

    console.log(`📊 Daily stats for ${userId}:`, { ...stats, eligible });

    return NextResponse.json({
      ...stats,
      eligible,
    });
  } catch (error) {
    console.error('Error getting daily stats:', error);
    return NextResponse.json(
      { error: 'Failed to get daily stats' },
      { status: 500 }
    );
  }
}

// POST - Update daily session (increment play count)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, fullPlay } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const session = await updateDailySession(userId, fullPlay || false);
    const stats = await getDailyStats(userId);
    const eligible = await isEligibleForRewards(userId);

    console.log(`✅ Updated daily session for ${userId}:`, { fullPlay, session, stats, eligible });

    return NextResponse.json({
      session,
      stats: {
        ...stats,
        eligible,
      },
    });
  } catch (error) {
    console.error('Error updating daily session:', error);
    return NextResponse.json(
      { error: 'Failed to update daily session' },
      { status: 500 }
    );
  }
}

