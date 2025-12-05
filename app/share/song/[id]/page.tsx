import type { Metadata } from "next";
import { fetchSongById } from "@/lib/server/song-data";
import { SongSharePage } from "@/app/components/music/SongSharePage";
import { notFound } from "next/navigation";

const ROOT_URL =
  process.env.NEXT_PUBLIC_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const song = await fetchSongById(id);

  if (!song) {
    return {
      title: "Song not found - Jukebox",
      description: "The requested song could not be found.",
    };
  }

  // Hybrid approach: Try album artwork for Open Graph/Twitter, but use hero for Farcaster Frame
  // Hero image is always accessible and reliable for social crawlers
  const heroImageUrl = `${ROOT_URL}/hero.png`;
  
  // Try to use album artwork if available (for Open Graph/Twitter)
  // Album artwork URLs from Spinamp should be absolute HTTPS URLs
  const albumArtworkUrl = song.cover && 
    song.cover.trim() !== "" && 
    song.cover.startsWith("https") // Ensure HTTPS for security
    ? song.cover
    : null;
  
  // Use album artwork for Open Graph/Twitter if available, otherwise use hero
  // For Farcaster Frame, always use hero.png as it's guaranteed to work
  const ogImageUrl = albumArtworkUrl || heroImageUrl;
  const fcFrameImageUrl = heroImageUrl; // Always use hero for Farcaster Frame reliability

  const shareTitle = `${song.title} by ${song.artist}`;
  const shareDescription = `Listen to "${song.title}" by ${song.artist} on Jukebox. On-chain music. Tip artists directly.`;

  return {
    title: `${shareTitle} - Jukebox`,
    description: shareDescription,
    openGraph: {
      title: shareTitle,
      description: shareDescription,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${song.title} by ${song.artist}`,
        },
      ],
      type: "music.song",
      url: `${ROOT_URL}/share/song/${id}`,
      siteName: "Jukebox",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      description: shareDescription,
      images: [ogImageUrl],
      creator: "@creativecrtv",
    },
    alternates: {
      canonical: `${ROOT_URL}/share/song/${id}`,
    },
    // Add Farcaster Frame metadata for the launch button
    other: {
      "fc:frame": JSON.stringify({
        version: "1",
        imageUrl: fcFrameImageUrl,
        button: {
          title: `Play ${song.title}`,
          action: {
            name: "Launch Jukebox",
            type: "launch_frame",
          },
        },
      }),
    },
  };
}

export default async function SongShareRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const song = await fetchSongById(id);

  if (!song) {
    notFound();
  }

  return <SongSharePage song={song} />;
}

