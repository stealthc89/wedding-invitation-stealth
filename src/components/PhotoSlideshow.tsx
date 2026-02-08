"use client";

import { useState, useEffect } from "react";

// Fallback photos if API returns empty and no photos prop is given
// High-quality images representing the couple's romantic journey
const FALLBACK_PHOTOS = [
  "/media/venice-basilica-couple-kiss.jpeg",
  "/media/singapore-marina-bay-sands-professional.jpeg",
  "/media/bali-temple-jumping-reflection.jpeg",
  "/media/egypt-pyramids-camels-couple.jpeg",
  "/media/snow-mountains-sunset-cuddle.jpeg",
  "/media/scuba-diving-underwater-heart.jpeg",
];

// Each slide gets a different zoom origin for variety
const ZOOM_ORIGINS = [
  "center center",
  "top center",
  "center right",
  "bottom center",
  "center left",
];

interface PhotoSlideshowProps {
  photos?: string[];
  interval?: number;
  overlay?: "dark" | "light" | "none";
  children?: React.ReactNode;
}

export default function PhotoSlideshow({
  photos: photosProp,
  interval = 8000, // 8s interval (7s animation + 1s buffer)
  overlay = "dark",
  children,
}: PhotoSlideshowProps) {
  const [dynamicPhotos, setDynamicPhotos] = useState<string[] | null>(null);
  const [current, setCurrent] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  const [loaded, setLoaded] = useState<Set<number>>(new Set());
  const [activePhotos, setActivePhotos] = useState<string[]>([]);
  const INITIAL_BATCH_SIZE = 6; // Start slideshow after first 6 images

  // Fetch slideshow photos dynamically if no explicit photos prop
  useEffect(() => {
    if (photosProp) return; // Skip if caller provided photos

    fetch("/api/slideshow")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setDynamicPhotos(data);
        } else {
          setDynamicPhotos(FALLBACK_PHOTOS);
        }
      })
      .catch(() => setDynamicPhotos(FALLBACK_PHOTOS));
  }, [photosProp]);

  const photos = photosProp || dynamicPhotos || FALLBACK_PHOTOS;

  // Initialize activePhotos with first image to avoid black screen
  useEffect(() => {
    if (activePhotos.length === 0 && photos.length > 0) {
      setActivePhotos([photos[0]]);
    }
  }, [photos, activePhotos.length]);

  // Preload images with priority for first batch
  useEffect(() => {
    if (photos.length === 0) return;

    photos.forEach((photo, index) => {
      if (!loaded.has(index)) {
        const img = new Image();
        img.src = photo;
        // Eagerly load first batch, lazy load the rest
        img.loading = index < INITIAL_BATCH_SIZE ? "eager" : "lazy";
        img.decoding = "async";
        // High priority for first image
        if (index === 0) {
          img.fetchPriority = "high";
        }
        img.onload = () => {
          setLoaded((prev) => {
            const newSet = new Set(prev);
            newSet.add(index);
            return newSet;
          });
        };
      }
    });
  }, [photos]);

  // Update active photos as images load (phased approach)
  useEffect(() => {
    if (photos.length === 0) return;

    const loadedPhotos = photos.filter((_, index) => loaded.has(index));

    // Start with first 6 images once they're loaded
    if (loadedPhotos.length >= INITIAL_BATCH_SIZE && activePhotos.length === 0) {
      setActivePhotos(loadedPhotos.slice(0, INITIAL_BATCH_SIZE));
    }
    // Add newly loaded images to rotation
    else if (activePhotos.length > 0 && loadedPhotos.length > activePhotos.length) {
      setActivePhotos(loadedPhotos);
    }
  }, [loaded.size, photos.length, activePhotos.length, photos]);

  // Start slideshow timer once first batch is ready
  useEffect(() => {
    if (activePhotos.length === 0) return;

    const timer = setInterval(() => {
      setPrevious(current);
      setCurrent((prev) => (prev + 1) % activePhotos.length);
    }, interval);

    return () => clearInterval(timer);
  }, [activePhotos.length, interval, current]);

  const overlayClass =
    overlay === "dark"
      ? "bg-black/40"
      : overlay === "light"
        ? "bg-white/30"
        : "";

  return (
    <div className="slideshow-container">
      {activePhotos.map((photo, i) => {
        const isActive = i === current;
        const isExiting = i === previous;
        const className = `slideshow-slide ${isActive ? "slideshow-active" : ""} ${isExiting && !isActive ? "slideshow-exit" : ""}`;

        return (
          <div
            key={photo}
            className={className}
            style={{
              backgroundImage: `url(${photo})`,
              transformOrigin: ZOOM_ORIGINS[i % ZOOM_ORIGINS.length],
            }}
          />
        );
      })}
      {overlay !== "none" && <div className={`slideshow-overlay ${overlayClass}`} />}
      <div className="slideshow-content">{children}</div>
    </div>
  );
}
