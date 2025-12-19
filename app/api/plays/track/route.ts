import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { updateDailySession } from '@/lib/session-tracking';

// Rate limiting: max 10 play events per minute per user
const RATE_LIMIT_WINDOW = 60; // seconds
const RATE_LIMIT_MAX = 10;

interface PlayEventRequest {
  trackId: string;
  userId: string | null;
  duration: number;
  timestamp: number;
  sessionId: string;
}

// Check rate limit
async function checkRateLimit(
  userId: string | null,
  sessionId: string
): Promise<boolean> {
  if (!redis) {
    return true; // Allow if Redis not available
  }

  const identifier = userId || sessionId;
  const key = `play:ratelimit:${identifier}`;
  
  try {
    const count = await redis.get<number>(key);
    if (count && count >= RATE_LIMIT_MAX) {
      return false;
    }

    // Increment counter
    await redis.incr(key);
    await redis.expire(key, RATE_LIMIT_WINDOW);
    return true;
  } catch (error) {
    console.error('Rate limit check error:', error);
    return true; // Allow on error
  }
}

// Store play event in Redis
async function storePlayEvent(event: PlayEventRequest): Promise<void> {
  if (!redis) {
    console.warn('Redis not available, play event not stored');
    return;
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    // Only count if duration >= 30 seconds (qualified play)
    if (event.duration < 30) {
      return; // Don't count as a play
    }

    // Check if this play event was already processed (idempotency)
    // Use sessionId + trackId (without timestamp) to prevent duplicate reports
    // for the same song in the same session. This ensures that even if reportPlayEvent
    // is called multiple times (e.g., from handleTimeUpdate and handleEnded) with
    // different timestamps, we only process it once and update daily session once.
    const eventId = `play:event:${event.sessionId}:${event.trackId}`;
    const exists = await redis.get<boolean>(eventId);
    if (exists) {
      console.log(`⏭️ Skipping duplicate play event: ${eventId}`);
      return; // Already processed
    }

    // Mark event as processed (24 hour TTL)
    await redis.set(eventId, true, { ex: 24 * 60 * 60 });
    console.log(`✅ Processing new play event: ${eventId} (duration: ${event.duration}s)`);

    // Increment counters
    const pipeline = redis.pipeline();
    
    // Total play count
    pipeline.incr(`play:track:${event.trackId}:total`);
    
    // Daily play count
    pipeline.incr(`play:track:${event.trackId}:${today}`);
    pipeline.expire(`play:track:${event.trackId}:${today}`, 7 * 24 * 60 * 60); // Keep for 7 days
    
    // Weekly play count (rolling 7 days)
    pipeline.incr(`play:track:${event.trackId}:weekly:${weekAgo}`);
    pipeline.expire(`play:track:${event.trackId}:weekly:${weekAgo}`, 7 * 24 * 60 * 60);

    // Per-user tracking (for analytics)
    if (event.userId) {
      const userKey = `play:user:${event.userId}:${event.trackId}:${event.timestamp}`;
      pipeline.set(userKey, event.duration, { ex: 30 * 24 * 60 * 60 }); // 30 days
    }

    await pipeline.exec();

    // Update daily session for play-to-earn (qualified play = full play)
    if (event.userId) {
      try {
        await updateDailySession(event.userId, true);
        console.log(`✅ Updated daily session for user ${event.userId} (play event: ${event.trackId})`);
      } catch (error) {
        console.error('❌ Failed to update daily session:', error);
        // Don't throw - we don't want to fail play tracking if session update fails
      }
    }
  } catch (error) {
    console.error('Error storing play event:', error);
    // Don't throw - we want to return success even if storage fails
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: PlayEventRequest = await request.json();

    // Validate request
    if (!body.trackId || typeof body.duration !== 'number' || body.duration < 0) {
      return NextResponse.json(
        { error: 'Invalid play event data' },
        { status: 400 }
      );
    }

    // Check rate limit
    const allowed = await checkRateLimit(body.userId || null, body.sessionId);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Store play event (async, don't wait)
    storePlayEvent(body).catch((error) => {
      console.error('Failed to store play event:', error);
    });

    // Get current play count
    let playCount = 0;
    if (redis) {
      try {
        const count = await redis.get<number>(`play:track:${body.trackId}:total`);
        playCount = count || 0;
      } catch (error) {
        console.error('Error fetching play count:', error);
      }
    }

    return NextResponse.json({
      success: true,
      playCount,
    });
  } catch (error) {
    console.error('Error processing play event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

