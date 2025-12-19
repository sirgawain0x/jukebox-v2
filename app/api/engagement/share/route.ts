import { NextRequest, NextResponse } from 'next/server';
import { recordShareEvent } from '@/lib/engagement-scoring';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trackId, shareUrl } = body;

    if (!trackId || !shareUrl) {
      return NextResponse.json(
        { error: 'Missing trackId or shareUrl' },
        { status: 400 }
      );
    }

    await recordShareEvent(trackId, shareUrl);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error recording share event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

