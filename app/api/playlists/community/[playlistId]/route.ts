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
    const { creator } = body;

    // Validate creator is a string
    if (!creator || typeof creator !== 'string') {
      return NextResponse.json(
        { error: 'Creator address is required and must be a string' },
        { status: 400 }
      );
    }

    const playlist = await redis.get<CommunityPlaylist>(
      `playlist:community:${playlistId}`
    );

    if (!playlist) {
      return NextResponse.json(
        { error: 'Playlist not found' },
        { status: 404 }
      );
    }

    // Check if requester is the creator
    if (playlist.creator.toLowerCase() !== creator.toLowerCase()) {
      return NextResponse.json(
        { error: 'Only the playlist creator can modify this playlist' },
        { status: 403 }
      );
    }

    // Update playlist fields
    if (body.name !== undefined) {
      // Validate name is a string
      if (typeof body.name !== 'string') {
        return NextResponse.json(
          { error: 'Playlist name must be a string' },
          { status: 400 }
        );
      }
      playlist.name = body.name.trim();
    }

    if (body.songIds !== undefined) {
      // Validate songIds is an array
      if (!Array.isArray(body.songIds)) {
        return NextResponse.json(
          { error: 'songIds must be an array' },
          { status: 400 }
        );
      }
      // Validate all songIds are strings
      if (!body.songIds.every((id: unknown) => typeof id === 'string')) {
        return NextResponse.json(
          { error: 'All songIds must be strings' },
          { status: 400 }
        );
      }
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
    let body: { creator?: unknown } = {};
    try {
      body = await request.json();
    } catch {
      // Body might be empty for DELETE requests
    }
    const { creator } = body;

    // Validate creator is a string
    if (!creator || typeof creator !== 'string') {
      return NextResponse.json(
        { error: 'Creator address is required and must be a string' },
        { status: 400 }
      );
    }

    const playlist = await redis.get<CommunityPlaylist>(
      `playlist:community:${playlistId}`
    );

    if (!playlist) {
      return NextResponse.json(
        { error: 'Playlist not found' },
        { status: 404 }
      );
    }

    // Check if requester is the creator
    if (playlist.creator.toLowerCase() !== creator.toLowerCase()) {
      return NextResponse.json(
        { error: 'Only the playlist creator can delete this playlist' },
        { status: 403 }
      );
    }

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

