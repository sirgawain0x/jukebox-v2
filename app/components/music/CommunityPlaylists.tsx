"use client";
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';

type CommunityPlaylist = {
  id: string;
  name: string;
  creator: string;
  songIds: string[];
  createdAt: number;
};

type CommunityPlaylistsProps = {
  onPlaylistSelect?: (playlist: CommunityPlaylist) => void;
};

export function CommunityPlaylists({ onPlaylistSelect }: CommunityPlaylistsProps) {
  const { address } = useAccount();
  const [playlists, setPlaylists] = useState<CommunityPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    try {
      const response = await fetch('/api/playlists/community');
      if (!response.ok) {
        throw new Error('Failed to load playlists');
      }
      const data = await response.json();
      setPlaylists(data.playlists || []);
    } catch (error) {
      console.error('Error loading playlists:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPlaylist = async () => {
    if (!address || !newPlaylistName.trim()) {
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/playlists/community', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newPlaylistName.trim(),
          creator: address,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create playlist');
      }

      const data = await response.json();
      setPlaylists(prev => [data.playlist, ...prev]);
      setNewPlaylistName('');
    } catch (error) {
      console.error('Error creating playlist:', error);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <Card title="🎵 Community Playlists">
        <div className="text-center py-4 text-[var(--app-foreground-muted)]">
          Loading playlists...
        </div>
      </Card>
    );
  }

  return (
    <Card title="🎵 Community Playlists">
      <div className="space-y-4">
        {/* Create Playlist */}
        {address && (
          <div className="flex gap-2">
            <input
              type="text"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder="My Winning Predictions"
              className="flex-1 px-3 py-2 border border-[var(--app-card-border)] rounded-lg text-sm"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  createPlaylist();
                }
              }}
            />
            <button
              onClick={createPlaylist}
              disabled={creating || !newPlaylistName.trim()}
              className="px-4 py-2 bg-[#0052ff] text-white rounded-lg hover:bg-[#0040cc] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        )}

        {/* Playlists List */}
        {playlists.length === 0 ? (
          <div className="text-center py-8 text-[var(--app-foreground-muted)]">
            <Icon name="music" size="lg" className="mx-auto mb-2 opacity-50" />
            <p>No community playlists yet</p>
            <p className="text-xs mt-1">Create one to share your favorite predictions!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {playlists.map((playlist) => (
              <div
                key={playlist.id}
                onClick={() => onPlaylistSelect?.(playlist)}
                className="p-3 border border-[var(--app-card-border)] rounded-lg hover:bg-[var(--app-card-bg)] cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium">{playlist.name}</div>
                    <div className="text-xs text-[var(--app-foreground-muted)] mt-1">
                      {playlist.songIds.length} songs • Created by {playlist.creator.slice(0, 6)}...{playlist.creator.slice(-4)}
                    </div>
                  </div>
                  <Icon name="chevron-right" size="sm" className="text-[var(--app-foreground-muted)]" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

