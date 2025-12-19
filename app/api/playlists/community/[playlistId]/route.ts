import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

type CommunityPlaylist = {
  id: string;
  name: string;
  creator: string;
  songIds: string[];
  createdAt: number;
};

// GET - Get a specific playlist
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ playlistId: string }> }
) {
  if (!redis) {
    return NextResponse.json(
      { error: 'Redis not available' },
      { status: 503 }
    );
  }

  try {
    const { playlistId } = await params;
    const playlist = await redis.get<CommunityPlaylist>(
      `playlist:community:${playlistId}`
    );

    if (!playlist) {
      return NextResponse.json(
        { error: 'Playlist not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ playlist });
  } catch (error) {
    console.error('Error loading playlist:', error);
    return NextResponse.json(
      { error: 'Failed to load playlist' },
      { status: 500 }
    );
  }
}

// PATCH - Update a playlist (add/remove songs, rename)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ playlistId: string }> }
) {
  if (!redis) {
    return NextResponse.json(
      { error: 'Redis not available' },
      { status: 503 }
    );
  }

  try {
    const { playlistId } = await params;
    const body = await request.json();
    const playlist = await redis.get<CommunityPlaylist>(
      `playlist:community:${playlistId}`
    );

    if (!playlist) {
      return NextResponse.json(
        { error: 'Playlist not found' },
        { status: 404 }
      );
    }

    // Update playlist fields
    if (body.name !== undefined) {
      playlist.name = body.name.trim();
    }

    if (body.songIds !== undefined) {
      playlist.songIds = body.songIds;
    }

    await redis.set(`playlist:community:${playlistId}`, playlist);

    return NextResponse.json({ playlist });
  } catch (error) {
    console.error('Error updating playlist:', error);
    return NextResponse.json(
      { error: 'Failed to update playlist' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a playlist
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ playlistId: string }> }
) {
  if (!redis) {
    return NextResponse.json(
      { error: 'Redis not available' },
      { status: 503 }
    );
  }

  try {
    const { playlistId } = await params;
    await redis.del(`playlist:community:${playlistId}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting playlist:', error);
    return NextResponse.json(
      { error: 'Failed to delete playlist' },
      { status: 500 }
    );
  }
}

