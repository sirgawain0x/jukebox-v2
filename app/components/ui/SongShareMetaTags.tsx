"use client";

import { useEffect } from 'react';
import { Song, Playlist } from '@/types/music';

/**
 * SongShareMetaTags - Dynamic social media meta tags for song/playlist sharing
 * 
 * This component dynamically updates Open Graph and Twitter meta tags when sharing
 * songs or playlists, displaying the artwork instead of the default hero image.
 * 
 * Usage:
 * - For songs: <SongShareMetaTags song={selectedSong} />
 * - For playlists: <SongShareMetaTags playlist={playlist} />
 * - Custom: <SongShareMetaTags title="Custom Title" description="Custom Description" />
 */

interface SongShareMetaTagsProps {
  song?: Song;
  playlist?: Playlist;
  title?: string;
  description?: string;
}

export function SongShareMetaTags({ 
  song, 
  playlist, 
  title, 
  description 
}: SongShareMetaTagsProps) {
  useEffect(() => {
    if (typeof window === 'undefined' || !document.head) {
      return;
    }

    // Determine the artwork URL
    const artworkUrl = song?.cover || playlist?.coverImage;
    const shareTitle = title || song?.title || playlist?.name || "Jukebox";
    const shareDescription = description || 
      (song ? `Listen to "${song.title}" by ${song.artist}` : 
       playlist ? `Check out the playlist "${playlist.name}"` : 
       "On-chain music. Tip artists directly. AI-powered playlists.");

    // Ensure artwork URL is absolute
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://jukebox.creativeplatform.xyz';
    const absoluteArtworkUrl = artworkUrl?.startsWith('http') 
      ? artworkUrl 
      : `${baseUrl}${artworkUrl?.startsWith('/') ? '' : '/'}${artworkUrl}`;

    // Helper function to update or create meta tags
    const updateMetaTag = (property: string, content: string) => {
      // Update Open Graph tags
      let metaElement = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
      if (!metaElement) {
        metaElement = document.createElement('meta');
        metaElement.setAttribute('property', property);
        document.head.appendChild(metaElement);
      }
      metaElement.content = content;

      // Also update name-based tags for Twitter
      const nameProperty = property.replace('og:', 'twitter:');
      let nameElement = document.querySelector(`meta[name="${nameProperty}"]`) as HTMLMetaElement;
      if (!nameElement) {
        nameElement = document.createElement('meta');
        nameElement.name = nameProperty;
        document.head.appendChild(nameElement);
      }
      nameElement.content = content;
    };

    // Update title
    updateMetaTag('og:title', shareTitle);
    document.title = shareTitle;

    // Update description
    updateMetaTag('og:description', shareDescription);

    // Update image if artwork is available
    if (artworkUrl) {
      updateMetaTag('og:image', absoluteArtworkUrl);
      updateMetaTag('og:image:width', '1200');
      updateMetaTag('og:image:height', '630');
      updateMetaTag('og:image:alt', shareTitle);
    }

    // Update URL to current page
    updateMetaTag('og:url', window.location.href);

    // Update site name
    updateMetaTag('og:site_name', 'Jukebox');

    // Update Twitter card type
    const twitterCardElement = document.querySelector('meta[name="twitter:card"]') as HTMLMetaElement;
    if (twitterCardElement) {
      twitterCardElement.content = 'summary_large_image';
    }

    // Cleanup function
    return () => {
      // Optionally reset to default values when component unmounts
      // This is optional - you might want to keep the song-specific tags
    };
  }, [song, playlist, title, description]);

  return null; // This component doesn't render anything
}
