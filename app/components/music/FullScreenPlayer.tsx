"use client";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useMusic } from '@/app/contexts/MusicContext';
import { Icon } from '../ui/Icon';
import { AnimatedAudioIndicator } from '../ui/AnimatedAudioIndicator';

export function FullScreenPlayer() {
  const {
    selectedSong,
    isPlaying,
    audioLoading,
    playQueue,
    currentQueueIndex,
    isAutoPlayEnabled,
    isMinimized,
    setIsMinimized,
    togglePlayPause,
    handlePreviousSong,
    handleNextSong,
    setAutoPlayEnabled,
    volume,
    isMuted,
    setVolume,
    toggleMute,
    audioRef,
  } = useMusic();

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return 'volume-x';
    if (volume < 0.5) return 'volume-1';
    return 'volume-2';
  };

  // Update progress bar
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
    };
  }, [audioRef]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audio.currentTime = percent * duration;
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!selectedSong || isMinimized) {
    return null;
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-40 bg-linear-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-800">Now Playing</h2>
          <button
            onClick={() => setIsMinimized(true)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            title="Minimize player"
            aria-label="Minimize player"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <polyline points="4 14 10 14 10 20" />
              <polyline points="20 10 14 10 14 4" />
              <line x1="14" y1="10" x2="21" y2="3" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </button>
        </div>

        {/* Album Art */}
        <div className="flex justify-center mb-6">
          {selectedSong.cover ? (
            <Image
              src={selectedSong.cover}
              alt={selectedSong.title}
              width={240}
              height={240}
              className="w-60 h-60 rounded-2xl object-cover shadow-xl"
              unoptimized
            />
          ) : (
            <div className="w-60 h-60 rounded-2xl bg-linear-to-br from-gray-200 to-gray-300 flex items-center justify-center shadow-xl">
              <Icon name="star" size="lg" className="text-gray-400" />
            </div>
          )}
        </div>

        {/* Song Info */}
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold mb-2 text-gray-800 truncate">{selectedSong.title}</h3>
          <p className="text-gray-600 truncate">{selectedSong.artist}</p>
          {selectedSong.platformName && (
            <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-600">
              {selectedSong.platformName}
            </span>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div 
            className="h-2 bg-gray-200 rounded-full cursor-pointer overflow-hidden"
            onClick={handleSeek}
          >
            <div 
              className="h-full bg-blue-500 rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Audio indicator */}
        {isPlaying && (
          <div className="flex justify-center mb-4">
            <AnimatedAudioIndicator 
              isPlaying={isPlaying}
              size="md"
              className="text-blue-500"
              variant="bars"
            />
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <button
            onClick={handlePreviousSong}
            disabled={playQueue.length <= 1}
            className="p-3 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            title="Previous song"
            aria-label="Previous song"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="w-6 h-6"
            >
              <polygon points="11 19 2 12 11 5 11 19" />
              <polygon points="22 19 13 12 22 5 22 19" />
            </svg>
          </button>

          <button
            onClick={togglePlayPause}
            className="p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors shadow-lg cursor-pointer"
            title={isPlaying ? "Pause" : "Play"}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {audioLoading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="currentColor"
                className="w-6 h-6"
              >
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="currentColor"
                className="w-6 h-6"
              >
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
          </button>

          <button
            onClick={handleNextSong}
            disabled={playQueue.length <= 1}
            className="p-3 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            title="Next song"
            aria-label="Next song"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="w-6 h-6"
            >
              <polygon points="13 19 22 12 13 5 13 19" />
              <polygon points="2 19 11 12 2 5 2 19" />
            </svg>
          </button>
        </div>

        {/* Queue info */}
        {playQueue.length > 1 && (
          <div className="text-center text-sm text-gray-500 mb-4">
            {currentQueueIndex + 1} of {playQueue.length} songs in queue
          </div>
        )}

        {/* Volume Control */}
        <div className="mb-4 px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleMute}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              title={isMuted ? "Unmute" : "Mute"}
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              <Icon name={getVolumeIcon()} size="sm" />
            </button>
            <div className="flex-1">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                className="w-full h-2 accent-blue-500 cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${volume * 100}%, #e5e7eb ${volume * 100}%, #e5e7eb 100%)`
                }}
                title={`Volume: ${Math.round(volume * 100)}%`}
                aria-label="Volume slider"
              />
            </div>
            <span className="text-xs text-gray-500 w-10 text-right">{Math.round(volume * 100)}%</span>
          </div>
        </div>

        {/* Auto-play toggle */}
        <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            id="autoplay-full"
            checked={isAutoPlayEnabled}
            onChange={(e) => setAutoPlayEnabled(e.target.checked)}
            className="rounded cursor-pointer"
          />
          <label htmlFor="autoplay-full" className="cursor-pointer">
            Auto-play next song
          </label>
        </div>
      </div>
    </div>
  );
}

