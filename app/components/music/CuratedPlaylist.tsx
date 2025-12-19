"use client";
import { useState, useEffect } from 'react';
import { Song } from '@/types/music';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { filterCuratedSongs } from '@/lib/curated-playlists';

type CuratedPlaylistProps = {
  songs: Song[];
  onSongsFiltered?: (curatedSongs: Song[]) => void;
};

export function CuratedPlaylist({ songs, onSongsFiltered }: CuratedPlaylistProps) {
  const [curatedSongs, setCuratedSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCurated, setShowCurated] = useState(false);

  useEffect(() => {
    if (showCurated && songs.length > 0) {
      setLoading(true);
      filterCuratedSongs(songs).then(filtered => {
        setCuratedSongs(filtered);
        onSongsFiltered?.(filtered);
        setLoading(false);
      }).catch(err => {
        console.error('Error filtering curated songs:', err);
        setCuratedSongs([]);
        setLoading(false);
      });
    } else {
      setCuratedSongs([]);
      onSongsFiltered?.(songs);
    }
  }, [songs, showCurated, onSongsFiltered]);

  return (
    <Card title="🎯 Curated Playlist">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--app-foreground-muted)]">
            Show only verified, high-quality tracks
          </p>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showCurated}
              onChange={(e) => setShowCurated(e.target.checked)}
              className="rounded cursor-pointer"
            />
            <span className="text-sm font-medium">Curated Only</span>
          </label>
        </div>

        {loading && (
          <div className="text-center py-4 text-[var(--app-foreground-muted)]">
            Filtering curated songs...
          </div>
        )}

        {showCurated && !loading && curatedSongs.length === 0 && (
          <div className="text-center py-4 text-[var(--app-foreground-muted)]">
            No curated songs found. Try adjusting the filters.
          </div>
        )}

        {showCurated && curatedSongs.length > 0 && (
          <div className="text-sm text-green-600 flex items-center gap-2">
            <Icon name="check" size="sm" />
            <span>{curatedSongs.length} curated songs available</span>
          </div>
        )}
      </div>
    </Card>
  );
}

