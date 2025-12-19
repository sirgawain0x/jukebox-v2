"use client";
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAccount } from 'wagmi';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { Song } from '@/types/music';
import { useMusic } from '@/app/contexts/MusicContext';

type CommunityPlaylist = {
  id: string;
  name: string;
  creator: string;
  songIds: string[];
  createdAt: number;
};

type PlaylistDetailViewProps = {
  playlist: CommunityPlaylist;
  onBack: () => void;
  onPlaylistUpdated?: () => void;
};

type SongWithMetadata = Song & {
  id: string;
};

async function fetchSongMetadata(songId: string): Promise<SongWithMetadata | null> {
  try {
    const query = `
      query GetTrack($id: ID!) {
        processedTrackByTrackId(id: $id) {
          id
          title
          lossyArtworkUrl
          lossyAudioUrl
          artistByArtistId {
            id
            name
          }
        }
      }
    `;

    const response = await fetch('https://api.spinamp.xyz/v3/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { id: songId },
      }),
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    const track = result.data?.processedTrackByTrackId;

    if (!track) {
      return null;
    }

    return {
      id: track.id,
      title: track.title || 'Unknown Title',
      artist: track.artistByArtistId?.name || 'Unknown Artist',
      cover: track.lossyArtworkUrl || '',
      creatorAddress: track.artistByArtistId?.id || '',
      audioUrl: track.lossyAudioUrl || '',
      playCount: 0,
    };
  } catch (error) {
    console.error(`Failed to fetch song metadata for ${songId}:`, error);
    return null;
  }
}

export function PlaylistDetailView({ playlist, onBack, onPlaylistUpdated }: PlaylistDetailViewProps) {
  const { address } = useAccount();
  const globalMusic = useMusic();
  const [songs, setSongs] = useState<SongWithMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [playlistName, setPlaylistName] = useState(playlist.name);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showAddSong, setShowAddSong] = useState(false);
  const [availableSongs, setAvailableSongs] = useState<Song[]>([]);
  const [loadingSongs, setLoadingSongs] = useState(false);

  const isCreator = address?.toLowerCase() === playlist.creator.toLowerCase();

  const loadSongs = async () => {
    setLoading(true);
    try {
      const songData = await Promise.all(
        playlist.songIds.map(id => fetchSongMetadata(id))
      );
      setSongs(songData.filter((song): song is SongWithMetadata => song !== null));
    } catch (error) {
      console.error('Error loading songs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSongs();
  }, [playlist.songIds]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveName = async () => {
    if (!address || !isCreator) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/playlists/community/${playlist.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creator: address,
          name: playlistName.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update playlist name');
      }

      setEditingName(false);
      onPlaylistUpdated?.();
    } catch (error) {
      console.error('Error updating playlist name:', error);
      alert(error instanceof Error ? error.message : 'Failed to update playlist name');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlaylist = async () => {
    if (!address || !isCreator) return;
    if (!confirm('Are you sure you want to delete this playlist? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/playlists/community/${playlist.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creator: address,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete playlist');
      }

      onPlaylistUpdated?.();
      onBack();
    } catch (error) {
      console.error('Error deleting playlist:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete playlist');
    } finally {
      setDeleting(false);
    }
  };

  const handleRemoveSong = async (songId: string) => {
    if (!address || !isCreator) return;

    const newSongIds = playlist.songIds.filter(id => id !== songId);
    
    try {
      const response = await fetch(`/api/playlists/community/${playlist.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creator: address,
          songIds: newSongIds,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to remove song');
      }

      onPlaylistUpdated?.();
    } catch (error) {
      console.error('Error removing song:', error);
      alert(error instanceof Error ? error.message : 'Failed to remove song');
    }
  };

  const handleAddSong = async (song: Song) => {
    if (!address || !isCreator) return;

    if (playlist.songIds.includes(song.id)) {
      return; // Song already in playlist
    }

    const newSongIds = [...playlist.songIds, song.id];
    
    try {
      const response = await fetch(`/api/playlists/community/${playlist.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creator: address,
          songIds: newSongIds,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to add song');
      }

      setShowAddSong(false);
      onPlaylistUpdated?.();
    } catch (error) {
      console.error('Error adding song:', error);
      alert(error instanceof Error ? error.message : 'Failed to add song');
    }
  };

  const loadAvailableSongs = async () => {
    setLoadingSongs(true);
    try {
      const response = await fetch('https://api.spinamp.xyz/v3/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query TrendingTracks($first: Int!) {
              allTrendingTracks(first: $first) {
                edges {
                  node {
                    processedTrackByTrackId {
                      id
                      title
                      lossyArtworkUrl
                      lossyAudioUrl
                      artistByArtistId {
                        id
                        name
                      }
                    }
                  }
                }
              }
            }
          `,
          variables: { first: 50 },
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const edges = result.data?.allTrendingTracks?.edges || [];
        const tracks = edges
          .map((edge: {
            node?: {
              processedTrackByTrackId?: {
                id: string;
                title: string | null;
                lossyArtworkUrl: string | null;
                lossyAudioUrl: string | null;
                artistByArtistId?: {
                  id: string;
                  name: string | null;
                } | null;
              } | null;
            } | null;
          }) => {
            const track = edge.node?.processedTrackByTrackId;
            if (!track) return null;
            return {
              id: track.id,
              title: track.title || 'Unknown Title',
              artist: track.artistByArtistId?.name || 'Unknown Artist',
              cover: track.lossyArtworkUrl || '',
              creatorAddress: track.artistByArtistId?.id || '',
              audioUrl: track.lossyAudioUrl || '',
              playCount: 0,
            };
          })
          .filter((song: Song | null): song is Song => song !== null)
          .filter((song: Song) => !playlist.songIds.includes(song.id));
        
        setAvailableSongs(tracks);
      }
    } catch (error) {
      console.error('Error loading available songs:', error);
    } finally {
      setLoadingSongs(false);
    }
  };

  const handlePlaySong = (song: SongWithMetadata) => {
    globalMusic.setSelectedSong(song);
  };

  return (
    <Card>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)] transition-colors"
          >
            <Icon name="chevron-left" size="sm" />
            <span className="text-sm">Back</span>
          </button>
          {isCreator && (
            <button
              onClick={handleDeletePlaylist}
              disabled={deleting}
              className="text-red-500 hover:text-red-600 transition-colors disabled:opacity-50 text-sm"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>

        {/* Playlist Name */}
        <div className="flex items-center gap-2">
          {editingName && isCreator ? (
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={playlistName}
                onChange={(e) => setPlaylistName(e.target.value)}
                className="flex-1 px-3 py-2 border border-[var(--app-card-border)] rounded-lg text-sm"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveName();
                  } else if (e.key === 'Escape') {
                    setEditingName(false);
                    setPlaylistName(playlist.name);
                  }
                }}
                autoFocus
              />
              <Button
                onClick={handleSaveName}
                disabled={saving || !playlistName.trim()}
                size="sm"
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button
                onClick={() => {
                  setEditingName(false);
                  setPlaylistName(playlist.name);
                }}
                variant="outline"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold flex-1">{playlist.name}</h2>
              {isCreator && (
                <button
                  onClick={() => setEditingName(true)}
                  className="text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)] transition-colors"
                >
                  <Icon name="edit" size="sm" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Playlist Info */}
        <div className="text-sm text-[var(--app-foreground-muted)]">
          {songs.length} {songs.length === 1 ? 'song' : 'songs'} • Created by {playlist.creator.slice(0, 6)}...{playlist.creator.slice(-4)}
        </div>

        {/* Add Song Button */}
        {isCreator && (
          <div>
            {!showAddSong ? (
              <Button
                onClick={() => {
                  setShowAddSong(true);
                  loadAvailableSongs();
                }}
                variant="outline"
                size="sm"
                icon={<Icon name="plus" size="sm" />}
              >
                Add Song
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Select a song to add</span>
                  <button
                    onClick={() => setShowAddSong(false)}
                    className="text-sm text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)]"
                  >
                    Cancel
                  </button>
                </div>
                {loadingSongs ? (
                  <div className="text-center py-4 text-[var(--app-foreground-muted)]">
                    Loading songs...
                  </div>
                ) : availableSongs.length === 0 ? (
                  <div className="text-center py-4 text-[var(--app-foreground-muted)]">
                    No available songs to add
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-2 border border-[var(--app-card-border)] rounded-lg p-2">
                    {availableSongs.map((song) => (
                      <div
                        key={song.id}
                        className="flex items-center gap-3 p-2 hover:bg-[var(--app-card-bg)] rounded cursor-pointer"
                        onClick={() => handleAddSong(song)}
                      >
                        <Image
                          src={song.cover || '/placeholder-song.jpg'}
                          alt={song.title}
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder-song.jpg';
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{song.title}</div>
                          <div className="text-xs text-[var(--app-foreground-muted)] truncate">{song.artist}</div>
                        </div>
                        <Icon name="plus" size="sm" className="text-[var(--app-foreground-muted)]" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Songs List */}
        {loading ? (
          <div className="text-center py-8 text-[var(--app-foreground-muted)]">
            Loading songs...
          </div>
        ) : songs.length === 0 ? (
          <div className="text-center py-8 text-[var(--app-foreground-muted)]">
            <Icon name="music" size="lg" className="mx-auto mb-2 opacity-50" />
            <p>No songs in this playlist yet</p>
            {isCreator && (
              <p className="text-xs mt-1">Click &quot;Add Song&quot; to get started!</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {songs.map((song, index) => (
              <div
                key={song.id}
                className="flex items-center gap-3 p-3 border border-[var(--app-card-border)] rounded-lg hover:bg-[var(--app-card-bg)] transition-colors"
              >
                <div className="w-12 h-12 bg-[var(--app-accent-light)] rounded flex items-center justify-center flex-shrink-0">
                  <span className="text-[var(--app-accent)] font-bold text-sm">
                    {index + 1}
                  </span>
                </div>
                <Image
                  src={song.cover || '/placeholder-song.jpg'}
                  alt={song.title}
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded object-cover flex-shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder-song.jpg';
                  }}
                />
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => handlePlaySong(song)}
                >
                  <div className="font-medium truncate">{song.title}</div>
                  <div className="text-sm text-[var(--app-foreground-muted)] truncate">{song.artist}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePlaySong(song)}
                    className="p-2 hover:bg-[var(--app-card-bg)] rounded transition-colors"
                    title="Play"
                  >
                    <Icon name="play" size="sm" />
                  </button>
                  {isCreator && (
                    <button
                      onClick={() => handleRemoveSong(song.id)}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors text-red-500"
                      title="Remove"
                    >
                      <Icon name="trash" size="sm" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

