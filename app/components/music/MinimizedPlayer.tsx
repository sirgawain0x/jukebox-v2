"use client";
import React from 'react';
import Image from 'next/image';
import { useMusic } from '@/app/contexts/MusicContext';
import { Icon } from '../ui/Icon';
import { AnimatedAudioIndicator } from '../ui/AnimatedAudioIndicator';

export function MinimizedPlayer() {
  const {
    selectedSong,
    isPlaying,
    audioLoading,
    playQueue,
    isMinimized,
    setIsMinimized,
    togglePlayPause,
    handlePreviousSong,
    handleNextSong,
  } = useMusic();

  if (!selectedSong || !isMinimized) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-3 animate-slide-up">
      <div className="flex items-center gap-3">
        {/* Album Art */}
        {selectedSong.cover ? (
          <Image
            src={selectedSong.cover}
            alt={selectedSong.title}
            width={48}
            height={48}
            className="w-12 h-12 rounded-lg object-cover cursor-pointer"
            unoptimized
            onClick={() => setIsMinimized(false)}
          />
        ) : (
          <div 
            className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center cursor-pointer"
            onClick={() => setIsMinimized(false)}
          >
            <Icon name="star" size="sm" className="text-gray-400" />
          </div>
        )}

        {/* Song Info */}
        <div 
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => setIsMinimized(false)}
        >
          <div className="font-medium text-sm truncate">{selectedSong.title}</div>
          <div className="text-xs text-gray-500 truncate">{selectedSong.artist}</div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePreviousSong}
            disabled={playQueue.length <= 1}
            className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            title="Previous song"
            aria-label="Previous song"
          >
            <Icon name="chevron-left" size="sm" />
          </button>

          <button
            onClick={togglePlayPause}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            title={isPlaying ? "Pause" : "Play"}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {audioLoading ? (
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            ) : (
              <Icon name={isPlaying ? "pause" : "play"} size="sm" />
            )}
          </button>

          <button
            onClick={handleNextSong}
            disabled={playQueue.length <= 1}
            className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            title="Next song"
            aria-label="Next song"
          >
            <Icon name="chevron-right" size="sm" />
          </button>

          {/* Audio indicator */}
          {isPlaying && (
            <AnimatedAudioIndicator 
              isPlaying={isPlaying}
              size="sm"
              className="text-blue-500"
              variant="bars"
            />
          )}

          {/* Expand button */}
          <button
            onClick={() => setIsMinimized(false)}
            className="p-1 hover:bg-gray-100 rounded transition-colors cursor-pointer"
            title="Expand player"
            aria-label="Expand player"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="w-4 h-4"
            >
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

