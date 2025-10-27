"use client";
import { FC } from "react";

type AnimatedAudioIndicatorProps = {
  isPlaying?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  variant?: "bars" | "wave" | "pulse";
};

export const AnimatedAudioIndicator: FC<AnimatedAudioIndicatorProps> = ({
  isPlaying = true,
  size = "md",
  className = "",
  variant = "bars",
}) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const animationClasses = isPlaying ? "animate-pulse" : "";

  if (variant === "bars") {
    return (
      <div className={`flex items-center justify-center gap-0.5 ${sizeClasses[size]} ${className}`}>
        <div
          className={`w-0.5 bg-current rounded-full transition-all duration-300 ${
            isPlaying ? "animate-audio-bar-1" : "h-1"
          }`}
        />
        <div
          className={`w-0.5 bg-current rounded-full transition-all duration-300 ${
            isPlaying ? "animate-audio-bar-2" : "h-2"
          }`}
        />
        <div
          className={`w-0.5 bg-current rounded-full transition-all duration-300 ${
            isPlaying ? "animate-audio-bar-3" : "h-3"
          }`}
        />
        <div
          className={`w-0.5 bg-current rounded-full transition-all duration-300 ${
            isPlaying ? "animate-audio-bar-4" : "h-2"
          }`}
        />
        <div
          className={`w-0.5 bg-current rounded-full transition-all duration-300 ${
            isPlaying ? "animate-audio-bar-5" : "h-1"
          }`}
        />
      </div>
    );
  }

  if (variant === "wave") {
    return (
      <div className={`flex items-center justify-center ${sizeClasses[size]} ${className}`}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`${animationClasses} ${sizeClasses[size]}`}
        >
          <path
            d="M3 12c0-1.657 1.343-3 3-3s3 1.343 3 3-1.343 3-3 3-3-1.343-3-3z"
            className={isPlaying ? "animate-wave-1" : ""}
          />
          <path
            d="M9 12c0-1.657 1.343-3 3-3s3 1.343 3 3-1.343 3-3 3-3-1.343-3-3z"
            className={isPlaying ? "animate-wave-2" : ""}
          />
          <path
            d="M15 12c0-1.657 1.343-3 3-3s3 1.343 3 3-1.343 3-3 3-3-1.343-3-3z"
            className={isPlaying ? "animate-wave-3" : ""}
          />
        </svg>
      </div>
    );
  }

  if (variant === "pulse") {
    return (
      <div className={`flex items-center justify-center ${sizeClasses[size]} ${className}`}>
        <div
          className={`w-3 h-3 rounded-full bg-current ${animationClasses} ${
            isPlaying ? "animate-ping" : "opacity-50"
          }`}
        />
      </div>
    );
  }

  return null;
};
