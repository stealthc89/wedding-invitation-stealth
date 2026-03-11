"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { CURATED_PHOTOS } from "@/lib/slideshow-photos";

interface PhotoSlideshowProps {
  photos?: string[];
  interval?: number;
  overlay?: "dark" | "light" | "none";
  children?: React.ReactNode;
}

export default function PhotoSlideshow({
  photos: photosProp,
  interval = 8000,
  overlay = "dark",
  children,
}: PhotoSlideshowProps) {
  // Start with curated list immediately (no loading delay), then sync with API
  // so any files added/removed from /media auto-update without code changes
  const [photos, setPhotos] = useState<string[]>(photosProp || CURATED_PHOTOS);
  useEffect(() => {
    if (photosProp) return;
    fetch("/api/slideshow")
      .then((r) => r.json())
      .then((data: string[]) => {
        if (Array.isArray(data) && data.length > 0) setPhotos(data);
      })
      .catch(() => {}); // Keep CURATED_PHOTOS on failure
  }, [photosProp]);
  const [current, setCurrent] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  const [firstLoaded, setFirstLoaded] = useState(false);
  const loadedRef = useRef<Set<number>>(new Set());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Preload a specific image by index, returns a promise
  const preloadImage = useCallback(
    (index: number): Promise<void> => {
      if (loadedRef.current.has(index) || index < 0 || index >= photos.length) {
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          loadedRef.current.add(index);
          resolve();
        };
        img.onerror = () => resolve(); // Don't block on errors
        img.src = photos[index];
      });
    },
    [photos]
  );

  // Preload first image immediately, then start slideshow
  useEffect(() => {
    if (photos.length === 0) return;

    preloadImage(0).then(() => {
      setFirstLoaded(true);
      // Preload second image in background
      if (photos.length > 1) {
        preloadImage(1);
      }
    });
  }, [photos, preloadImage]);

  // Slideshow timer - only starts after first image is loaded
  useEffect(() => {
    if (!firstLoaded || photos.length <= 1) return;

    timerRef.current = setInterval(() => {
      setCurrent((prev) => {
        const next = (prev + 1) % photos.length;
        setPrevious(prev);

        // Preload the image after next (look ahead by 1)
        const lookAhead = (next + 1) % photos.length;
        preloadImage(lookAhead);

        return next;
      });
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [firstLoaded, photos.length, interval, preloadImage]);

  const overlayClass =
    overlay === "dark"
      ? "bg-black/40"
      : overlay === "light"
        ? "bg-white/30"
        : "";

  return (
    <div className="slideshow-container">
      {/* Previous image - stays visible during crossfade */}
      {previous !== null && (
        <div className="slideshow-slide slideshow-exit" key={`prev-${previous}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[previous]}
            alt=""
            className="slideshow-img"
            loading="eager"
          />
        </div>
      )}

      {/* Current image */}
      {firstLoaded && (
        <div className="slideshow-slide slideshow-active" key={`curr-${current}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[current]}
            alt=""
            className="slideshow-img"
            loading="eager"
            fetchPriority={current === 0 ? "high" : "auto"}
          />
        </div>
      )}

      {overlay !== "none" && <div className={`slideshow-overlay ${overlayClass}`} />}
      <div className="slideshow-content">{children}</div>
    </div>
  );
}
