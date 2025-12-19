import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { getFeedItemId } from '@/lib/spinamp-utils';

type CommunityPlaylist = {
  id: string;
  name: string;
  creator: string;
  songIds: string[];
  createdAt: number;
};

// GET - List all community playlists
export async function GET(request: NextRequest) {
  if (!redis) {
    return NextResponse.json(
      { error: 'Redis not available' },
      { status: 503 }
    );
  }

  try {
    // Get all community playlist keys
    const keys = await redis.keys('playlist:community:*');
    
    // Fetch all playlists
    const playlistData = await Promise.all(
      keys.map(async (key) => {
        const data = await redis.get<CommunityPlaylist>(key);
        return data;
      })
    );

    const playlists = playlistData.filter(Boolean) as CommunityPlaylist[];
    
    // Sort by creation date (newest first)
    playlists.sort((a, b) => b.createdAt - a.createdAt);

    return NextResponse.json({ playlists });
  } catch (error) {
    console.error('Error loading community playlists:', error);
    return NextResponse.json(
      { error: 'Failed to load playlists' },
      { status: 500 }
    );
  }
}

// POST - Create a new community playlist
export async function POST(request: NextRequest) {
  if (!redis) {
    return NextResponse.json(
      { error: 'Redis not available' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { name, creator } = body;

    if (!name || !creator) {
      return NextResponse.json(
        { error: 'Name and creator are required' },
        { status: 400 }
      );
    }

    const playlistId = getFeedItemId({
      userId: creator,
      entityType: 'playlist',
      entityId: Date.now().toString(),
    });

    const playlist: CommunityPlaylist = {
      id: playlistId,
      name: name.trim(),
      creator,
      songIds: [],
      createdAt: Date.now(),
    };

    await redis.set(`playlist:community:${playlistId}`, playlist);

    return NextResponse.json({ playlist });
  } catch (error) {
    console.error('Error creating community playlist:', error);
    return NextResponse.json(
      { error: 'Failed to create playlist' },
      { status: 500 }
    );
  }
}

