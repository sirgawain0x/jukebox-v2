"use client";
import { useEffect, useState } from 'react';
import { Song } from '@/types/music';
import { SupportedWebsites } from '@/lib/spinamp-utils';
import { Icon } from '../ui/Icon';

type EngagementMetricsProps = {
  song: Song;
};

export function EngagementMetrics({ song }: EngagementMetricsProps) {
  const [metrics, setMetrics] = useState({
    playCount: typeof song.playCount === 'number' ? song.playCount : 0,
    tipCount: song.tipCount || 0,
    shareCount: song.shareCount || 0,
    predictionCount: song.predictionCount || 0,
    engagementScore: song.engagementScore || 0,
    shareByPlatform: {} as Record<string, number>,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchMetrics = async () => {
      try {
        const res = await fetch(`/api/engagement?trackId=${encodeURIComponent(song.id)}`);
        if (!res.ok) {
          throw new Error('Failed to fetch engagement data');
        }
        const data = await res.json();
        
        if (mounted) {
          setMetrics({
            playCount: data.playCount || 0,
            tipCount: data.tipCount || 0,
            shareCount: data.shareCount || 0,
            predictionCount: data.predictionCount || 0,
            engagementScore: data.engagementScore || 0,
            shareByPlatform: data.shareByPlatform || {},
          });
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching engagement metrics:', err);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Fetch immediately
    fetchMetrics();

    // Poll every 5 seconds to update metrics in real-time
    const interval = setInterval(fetchMetrics, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [song.id]);

  if (loading) {
    return (
      <div className="text-sm text-[var(--app-foreground-muted)]">
        Loading metrics...
      </div>
    );
  }

  const getPlatformIcon = (platformId: string) => {
    const platform = SupportedWebsites.find(w => w.id === platformId);
    return platform?.name || platformId;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Engagement Score</span>
        <span className="text-lg font-bold text-[#0052ff]">
          {metrics.engagementScore}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <Icon name="play" size="sm" className="text-[var(--app-foreground-muted)]" />
          <div>
            <div className="text-xs text-[var(--app-foreground-muted)]">Plays</div>
            <div className="text-sm font-medium">{metrics.playCount}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Icon name="heart" size="sm" className="text-[var(--app-foreground-muted)]" />
          <div>
            <div className="text-xs text-[var(--app-foreground-muted)]">Tips</div>
            <div className="text-sm font-medium">{metrics.tipCount}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Icon name="share" size="sm" className="text-[var(--app-foreground-muted)]" />
          <div>
            <div className="text-xs text-[var(--app-foreground-muted)]">Shares</div>
            <div className="text-sm font-medium">{metrics.shareCount}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Icon name="trending-up" size="sm" className="text-[var(--app-foreground-muted)]" />
          <div>
            <div className="text-xs text-[var(--app-foreground-muted)]">Predictions</div>
            <div className="text-sm font-medium">{metrics.predictionCount}</div>
          </div>
        </div>
      </div>

      {Object.keys(metrics.shareByPlatform).length > 0 && (
        <div className="pt-2 border-t border-[var(--app-card-border)]">
          <div className="text-xs text-[var(--app-foreground-muted)] mb-2">Shares by Platform</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(metrics.shareByPlatform).map(([platform, count]) => (
              <span
                key={platform}
                className="px-2 py-1 rounded text-xs bg-[#e6edff] text-[#0052ff]"
              >
                {getPlatformIcon(platform)}: {count}
              </span>
            ))}
          </div>
        </div>
      )}

      {song.socialLinks && song.socialLinks.length > 0 && (
        <div className="pt-2 border-t border-[var(--app-card-border)]">
          <div className="text-xs text-[var(--app-foreground-muted)] mb-2">Artist Links</div>
          <div className="flex flex-wrap gap-2">
            {song.socialLinks.map((link, index) => (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-1 rounded text-xs bg-[#e6edff] text-[#0052ff] hover:bg-[#d0d9ff] transition-colors"
              >
                {link.type}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

