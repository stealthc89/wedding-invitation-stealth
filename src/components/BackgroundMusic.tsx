"use client";

import { useState, useEffect, useRef } from "react";

interface BackgroundMusicProps {
  src: string;
  volume?: number;
  startTime?: number; // Start playback from this time (in seconds)
}

export default function BackgroundMusic({ src, volume = 0.7, startTime = 0 }: BackgroundMusicProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Set initial volume (70%)
    audio.volume = volume;

    // Set start time (play from beginning)
    if (startTime > 0) {
      audio.currentTime = startTime;
    }

    // Try to auto-play on page load
    const tryAutoPlay = async () => {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (error) {
        // Auto-play blocked by browser - user must interact first
        console.log("Auto-play prevented. Waiting for user interaction.");
      }
    };

    tryAutoPlay();

    // Fallback: Start playing on any user interaction
    const startOnInteraction = async () => {
      if (!isPlaying && audio.paused) {
        try {
          await audio.play();
          setIsPlaying(true);
          // Remove listeners after successful play
          document.removeEventListener("click", startOnInteraction);
          document.removeEventListener("touchstart", startOnInteraction);
          document.removeEventListener("keydown", startOnInteraction);
        } catch (error) {
          console.log("Failed to start audio on interaction");
        }
      }
    };

    // Listen for user interaction to start audio
    document.addEventListener("click", startOnInteraction, { once: true });
    document.addEventListener("touchstart", startOnInteraction, { once: true });
    document.addEventListener("keydown", startOnInteraction, { once: true });

    return () => {
      document.removeEventListener("click", startOnInteraction);
      document.removeEventListener("touchstart", startOnInteraction);
      document.removeEventListener("keydown", startOnInteraction);
    };
  }, [volume, startTime]);

  const toggleMute = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    // If audio hasn't started yet, start it first
    if (audio.paused) {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (error) {
        console.log("Could not start audio");
      }
    }

    audio.muted = !audio.muted;
    setIsMuted(audio.muted); // Sync state with actual audio element status
  };

  return (
    <>
      <audio ref={audioRef} loop preload="auto">
        <source src={src} type="audio/mpeg" />
        <source src={src.replace('.mp3', '.aac')} type="audio/aac" />
        <source src={src.replace('.mp3', '.ogg')} type="audio/ogg" />
      </audio>

      {/* Small mute/unmute button only */}
      <button
        onClick={toggleMute}
        className="fixed bottom-4 right-4 p-2 md:bottom-6 md:right-6 md:p-2.5 z-50 glass-card rounded-full hover:bg-white/95 active:scale-95 transition-all duration-200 shadow-md"
        aria-label={isMuted ? "Unmute music" : "Mute music"}
      >
        {isMuted ? (
          <svg
            className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
            />
          </svg>
        ) : (
          <svg
            className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
            />
          </svg>
        )}
      </button>
    </>
  );
}
