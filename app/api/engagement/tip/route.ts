import { NextRequest, NextResponse } from 'next/server';
import { recordTipEvent } from '@/lib/engagement-scoring';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trackId, amount } = body;

    if (!trackId) {
      return NextResponse.json(
        { error: 'Missing trackId' },
        { status: 400 }
      );
    }

    await recordTipEvent(trackId, amount);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error recording tip event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

