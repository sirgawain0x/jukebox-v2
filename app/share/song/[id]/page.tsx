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

  // Ensure artwork URL is absolute
  // Use song cover if available, otherwise fallback to default hero image
  const artworkUrl = song.cover && song.cover.trim() !== ""
    ? song.cover.startsWith("http")
      ? song.cover
      : `${ROOT_URL}${song.cover.startsWith("/") ? "" : "/"}${song.cover}`
    : `${ROOT_URL}/hero.png`; // Fallback to default hero image

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
          url: artworkUrl,
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
      images: [artworkUrl],
      creator: "@creativecrtv",
    },
    alternates: {
      canonical: `${ROOT_URL}/share/song/${id}`,
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

