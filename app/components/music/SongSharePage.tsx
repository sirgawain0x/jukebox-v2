"use client";

import { Song } from "@/types/music";
import { useMusic } from "@/app/contexts/MusicContext";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface SongSharePageProps {
  song: Song;
}

export function SongSharePage({ song }: SongSharePageProps) {
  const { setSelectedSong } = useMusic();
  const router = useRouter();

  useEffect(() => {
    // Auto-select the song when the page loads
    setSelectedSong(song);
    
    // Redirect to home page after a short delay to show the player
    const timer = setTimeout(() => {
      router.push("/");
    }, 2000);

    return () => clearTimeout(timer);
  }, [song, setSelectedSong, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Album Art */}
        <div className="relative aspect-square w-full bg-gradient-to-br from-blue-400 to-purple-500 overflow-hidden">
          {song.cover ? (
            <Image
              src={song.cover}
              alt={`${song.title} by ${song.artist}`}
              width={400}
              height={400}
              className="w-full h-full object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white text-6xl">
              🎵
            </div>
          )}
        </div>

        {/* Song Info */}
        <div className="p-6 space-y-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {song.title}
            </h1>
            <p className="text-lg text-gray-600">{song.artist}</p>
          </div>

          {song.platformName && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Platform:</span>
              <span className="text-sm font-medium text-gray-700">
                {song.platformName}
              </span>
            </div>
          )}

          <div className="pt-4">
            <p className="text-sm text-gray-500 animate-pulse">
              Opening in Jukebox...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

