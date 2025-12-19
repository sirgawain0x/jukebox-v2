import { NextRequest, NextResponse } from 'next/server';
import {
  updateArtistUnits,
  updateUnitsForMarket,
  getArtistUnits,
  calculateArtistShare,
} from '@/lib/superfluid-units';

/**
 * GET /api/superfluid/units
 * Get units for an artist or market
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const marketId = searchParams.get('marketId');
    const artistAddress = searchParams.get('artist');

    if (!marketId) {
      return NextResponse.json(
        { error: 'Missing marketId parameter' },
        { status: 400 }
      );
    }

    const marketIdNum = parseInt(marketId);

    if (artistAddress) {
      // Get artist-specific units
      const units = await getArtistUnits(marketIdNum, artistAddress);
      const share = await calculateArtistShare(marketIdNum, artistAddress);

      return NextResponse.json({
        marketId: marketIdNum,
        artistAddress,
        units: units.toString(),
        share: share.toFixed(2),
      });
    }

    // Get all units for market (would need to get from pool service)
    return NextResponse.json({
      error: 'Getting all market units not yet implemented',
    }, { status: 501 });
  } catch (error) {
    console.error('Error fetching units:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/superfluid/units
 * Update units for artist(s)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { marketId, trackId, artistAddress, tracks } = body;

    if (!marketId) {
      return NextResponse.json(
        { error: 'Missing marketId' },
        { status: 400 }
      );
    }

    if (tracks && Array.isArray(tracks)) {
      // Batch update
      const updates = await updateUnitsForMarket(parseInt(marketId), tracks);
      return NextResponse.json({
        success: true,
        updates: updates.map((u) => ({
          ...u,
          currentUnits: u.currentUnits.toString(),
          newUnits: u.newUnits.toString(),
        })),
      });
    }

    if (trackId && artistAddress) {
      // Single update
      const update = await updateArtistUnits(
        parseInt(marketId),
        trackId,
        artistAddress
      );

      if (!update) {
        return NextResponse.json({
          success: false,
          message: 'No verified plays - artist filtered by spam protection',
        });
      }

      return NextResponse.json({
        success: true,
        update: {
          ...update,
          currentUnits: update.currentUnits.toString(),
          newUnits: update.newUnits.toString(),
        },
      });
    }

    return NextResponse.json(
      { error: 'Missing trackId/artistAddress or tracks array' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating units:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

