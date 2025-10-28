"use client";
import React, { useState, useRef, useCallback, useEffect } from 'react';
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
    audioRef,
  } = useMusic();

  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showControls, setShowControls] = useState(true);
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const titleContainerRef = useRef<HTMLDivElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return 'volume-x';
    if (volume < 0.5) return 'volume-1';
    return 'volume-2';
  };

  const handleRewind = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, audio.currentTime - 15);
  };

  const handleFastForward = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const duration = audio.duration;
    if (!duration) return;
    audio.currentTime = Math.min(duration, audio.currentTime + 30);
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

  // Handle showing controls
  const handleShowControls = useCallback(() => {
    setShowControls(true);
    
    // Clear any existing fade timeout
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
    }
    
    // Set new timeout to hide controls after 3 seconds
    fadeTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
      fadeTimeoutRef.current = null;
    }, 3000);
  }, []);

  // Auto-hide controls on mount and when playing changes
  React.useEffect(() => {
    handleShowControls();
    
    // Cleanup on unmount
    return () => {
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
    };
  }, [handleShowControls, isPlaying]);

  // Check if title should scroll
  useEffect(() => {
    const checkOverflow = () => {
      if (titleContainerRef.current && selectedSong?.title) {
        // Create a temporary element to measure the text
        const temp = document.createElement('div');
        temp.style.cssText = 'position: absolute; visibility: hidden; white-space: nowrap; font-size: 0.875rem; font-weight: 500;';
        temp.textContent = selectedSong.title;
        document.body.appendChild(temp);
        
        const textWidth = temp.offsetWidth;
        const containerWidth = titleContainerRef.current.clientWidth;
        const isOverflowing = textWidth > containerWidth;
        
        document.body.removeChild(temp);
        setShouldScroll(isOverflowing);
      }
    };

    // Small delay to ensure accurate measurements after render and fonts load
    const timeout = setTimeout(checkOverflow, 100);
    window.addEventListener('resize', checkOverflow);
    
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', checkOverflow);
    };
  }, [selectedSong?.title]);

  if (!selectedSong || !isMinimized) {
    return null;
  }

  return (
    <div 
      className="fixed bottom-4 left-4 right-4 z-50 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-3 animate-slide-up"
      onMouseEnter={handleShowControls}
      onMouseMove={handleShowControls}
      onTouchStart={handleShowControls}
    >
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
          ref={titleContainerRef}
          className="flex-1 min-w-0 cursor-pointer overflow-hidden"
          onClick={() => setIsMinimized(false)}
        >
          {shouldScroll ? (
            <div className="font-medium text-sm animate-marquee">
              <span className="inline-block pr-8">{selectedSong.title}</span>
              <span className="inline-block pr-8">{selectedSong.title}</span>
            </div>
          ) : (
            <div className="font-medium text-sm truncate">{selectedSong.title}</div>
          )}
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

          {/* 15-second rewind button */}
          <button
            onClick={handleRewind}
            className="p-1 hover:bg-gray-100 rounded transition-colors cursor-pointer"
            title="Rewind 15 seconds"
            aria-label="Rewind 15 seconds"
          >
            <div className="relative w-4 h-4">
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
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[6px] font-bold text-gray-700">
                15
              </span>
            </div>
          </button>

          {/* Play/Pause button with animated indicator behind it */}
          <div className="relative">
            {/* Audio indicator - stays visible, positioned behind the button */}
            {isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
                <AnimatedAudioIndicator 
                  isPlaying={isPlaying}
                  size="sm"
                  className="text-blue-500 opacity-60"
                  variant="bars"
                />
              </div>
            )}
            
            {/* Button with fade effect */}
            <button
              onClick={togglePlayPause}
              className={`relative z-10 p-2 hover:bg-gray-100 rounded-full transition-all duration-500 ease-in-out cursor-pointer ${
                showControls ? 'opacity-100' : 'opacity-0'
              }`}
              title={isPlaying ? "Pause" : "Play"}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {audioLoading ? (
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
              ) : (
                <Icon name={isPlaying ? "pause" : "play"} size="sm" />
              )}
            </button>
          </div>

          {/* 30-second fast forward button */}
          <button
            onClick={handleFastForward}
            className="p-1 hover:bg-gray-100 rounded transition-colors cursor-pointer"
            title="Fast forward 30 seconds"
            aria-label="Fast forward 30 seconds"
          >
            <div className="relative w-4 h-4">
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
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[6px] font-bold text-gray-700">
                30
              </span>
            </div>
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

