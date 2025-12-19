import { NextRequest, NextResponse } from 'next/server';
import { filterCuratedSongs } from '@/lib/curated-playlists';
import { Song } from '@/types/music';

// POST - Filter songs to only show curated ones
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { songs } = body;

    if (!Array.isArray(songs)) {
      return NextResponse.json(
        { error: 'songs must be an array' },
        { status: 400 }
      );
    }

    const curatedSongs = await filterCuratedSongs(songs as Song[]);

    return NextResponse.json({ curatedSongs });
  } catch (error) {
    console.error('Error filtering curated songs:', error);
    return NextResponse.json(
      { error: 'Failed to filter curated songs' },
      { status: 500 }
    );
  }
}

