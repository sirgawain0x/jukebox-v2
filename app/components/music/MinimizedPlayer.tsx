"use client";
import React, { useState, useRef, useCallback } from 'react';
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
    volume,
    isMuted,
    setVolume,
    toggleMute,
    closePlayer,
  } = useMusic();

  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return 'volume-x';
    if (volume < 0.5) return 'volume-1';
    return 'volume-2';
  };

  // Handle showing the volume slider
  const handleMouseEnter = useCallback(() => {
    // Clear any existing timeout
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setShowVolumeSlider(true);
  }, []);

  // Handle hiding the volume slider with a delay
  const handleMouseLeave = useCallback(() => {
    // Set a timeout to close the slider after 300ms
    closeTimeoutRef.current = setTimeout(() => {
      setShowVolumeSlider(false);
      closeTimeoutRef.current = null;
    }, 300);
  }, []);

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

          {/* Volume Control */}
          <div 
            className="relative flex items-center gap-1"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <button
              onClick={toggleMute}
              className="p-1 hover:bg-gray-100 rounded transition-colors cursor-pointer"
              title={isMuted ? "Unmute" : "Mute"}
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              <Icon name={getVolumeIcon()} size="sm" />
            </button>
            
            {showVolumeSlider && (
              <div 
                className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-2 bg-white border border-gray-200 rounded-lg shadow-lg"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-24 h-1 accent-blue-500 cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${volume * 100}%, #e5e7eb ${volume * 100}%, #e5e7eb 100%)`
                  }}
                  title={`Volume: ${Math.round(volume * 100)}%`}
                  aria-label="Volume slider"
                />
              </div>
            )}
          </div>

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

          {/* Close button */}
          <button
            onClick={closePlayer}
            className="p-1 hover:bg-red-100 rounded transition-colors cursor-pointer text-gray-500 hover:text-red-600"
            title="Close player"
            aria-label="Close player"
          >
            <Icon name="x" size="sm" />
          </button>
        </div>
      </div>
    </div>
  );
}

