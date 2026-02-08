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
  interval = 7000,
  overlay = "dark",
  children,
}: PhotoSlideshowProps) {
  const [dynamicPhotos, setDynamicPhotos] = useState<string[] | null>(null);
  const [current, setCurrent] = useState(0);
  const [loaded, setLoaded] = useState<Set<number>>(new Set());

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

  // Preload all images for smoother transitions
  useEffect(() => {
    if (photos.length === 0) return;

    photos.forEach((photo, index) => {
      if (!loaded.has(index)) {
        const img = new Image();
        img.src = photo;
        // Add quality hints for better rendering
        img.loading = "eager";
        img.decoding = "async";
        img.onload = () => {
          setLoaded((prev) => {
            const newSet = new Set(prev);
            newSet.add(index);
            return newSet;
          });
        };
      }
    });
  }, [photos]); // Removed 'loaded' to prevent infinite loop

  useEffect(() => {
    if (photos.length === 0) return;

    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % photos.length);
    }, interval);

    return () => clearInterval(timer);
  }, [photos.length, interval]); // Removed 'current' to prevent interval recreation

  const overlayClass =
    overlay === "dark"
      ? "bg-black/40"
      : overlay === "light"
        ? "bg-white/30"
        : "";

  return (
    <div className="slideshow-container">
      {photos.map((photo, i) => (
        <div
          key={photo}
          className={`slideshow-slide ${i === current ? "slideshow-active" : ""}`}
          style={{
            backgroundImage: `url(${photo})`,
            transformOrigin: ZOOM_ORIGINS[i % ZOOM_ORIGINS.length],
          }}
        />
      ))}
      {overlay !== "none" && <div className={`slideshow-overlay ${overlayClass}`} />}
      <div className="slideshow-content">{children}</div>
    </div>
  );
}
