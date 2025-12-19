import { NextRequest, NextResponse } from 'next/server';
import { getEngagementData, calculateEngagementScore } from '@/lib/engagement-scoring';

/**
 * GET /api/engagement?trackId=<trackId>
 * Get engagement metrics for a track
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trackId = searchParams.get('trackId');

    if (!trackId) {
      return NextResponse.json(
        { error: 'trackId is required' },
        { status: 400 }
      );
    }

    const engagement = await getEngagementData(trackId);
    const score = calculateEngagementScore({
      id: trackId,
      title: '',
      artist: '',
      cover: '',
      creatorAddress: '',
      audioUrl: '',
      playCount: engagement.playCount,
      tipCount: engagement.tipCount,
      shareCount: engagement.shareCount,
      predictionCount: engagement.predictionCount,
    });

    return NextResponse.json({
      playCount: engagement.playCount,
      tipCount: engagement.tipCount,
      shareCount: engagement.shareCount,
      predictionCount: engagement.predictionCount,
      engagementScore: score,
      shareByPlatform: engagement.shareByPlatform,
    });
  } catch (error) {
    console.error('Error fetching engagement data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

