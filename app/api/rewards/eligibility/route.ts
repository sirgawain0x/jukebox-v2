import { NextRequest, NextResponse } from 'next/server';
import { checkRewardEligibility } from '@/lib/rewards';

// GET - Check reward eligibility for a user
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

    const eligibility = await checkRewardEligibility(userId);

    return NextResponse.json(eligibility);
  } catch (error) {
    console.error('Error checking reward eligibility:', error);
    return NextResponse.json(
      { error: 'Failed to check reward eligibility' },
      { status: 500 }
    );
  }
}

