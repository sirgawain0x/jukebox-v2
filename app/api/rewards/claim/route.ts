import { NextRequest, NextResponse } from 'next/server';
import { claimRewards } from '@/lib/rewards';

// POST - Claim rewards for a user
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

    const result = await claimRewards(userId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error claiming rewards:', error);
    return NextResponse.json(
      { error: 'Failed to claim rewards' },
      { status: 500 }
    );
  }
}

