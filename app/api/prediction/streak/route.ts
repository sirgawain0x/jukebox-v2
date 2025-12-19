import { NextRequest, NextResponse } from 'next/server';
import { getPredictionStreak } from '@/lib/session-tracking';
import { getStreakRewardInfo, awardStreakReward, isStreakRewardClaimed } from '@/lib/prediction-streaks';

// GET - Get prediction streak and reward info
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

    const [streak, rewardInfo, claimed] = await Promise.all([
      getPredictionStreak(userId),
      getStreakRewardInfo(userId),
      isStreakRewardClaimed(userId),
    ]);

    return NextResponse.json({
      streak,
      rewardInfo,
      claimed,
    });
  } catch (error) {
    console.error('Error getting prediction streak:', error);
    return NextResponse.json(
      { error: 'Failed to get prediction streak' },
      { status: 500 }
    );
  }
}

// POST - Claim streak reward
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const result = await awardStreakReward(userId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error claiming streak reward:', error);
    return NextResponse.json(
      { error: 'Failed to claim streak reward' },
      { status: 500 }
    );
  }
}

