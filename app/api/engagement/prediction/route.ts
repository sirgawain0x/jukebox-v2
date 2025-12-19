import { NextRequest, NextResponse } from 'next/server';
import { recordPredictionEvent } from '@/lib/engagement-scoring';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trackId } = body;

    if (!trackId) {
      return NextResponse.json(
        { error: 'Missing trackId' },
        { status: 400 }
      );
    }

    await recordPredictionEvent(trackId);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error recording prediction event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

