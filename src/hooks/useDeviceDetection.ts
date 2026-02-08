"use client";

import { useState, useEffect } from "react";

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  screenSize: "mobile" | "tablet" | "desktop";
  orientation: "portrait" | "landscape";
}

/**
 * Hook to detect device type and capabilities
 * Updates on window resize and orientation changes
 */
export function useDeviceDetection(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => {
    // Server-side defaults (mobile-first)
    if (typeof window === "undefined") {
      return {
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        isTouchDevice: false,
        screenSize: "mobile",
        orientation: "portrait",
      };
    }

    return getDeviceInfo();
  });

  useEffect(() => {
    // Update device info on mount and when window resizes
    const handleResize = () => {
      setDeviceInfo(getDeviceInfo());
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  return deviceInfo;
}

function getDeviceInfo(): DeviceInfo {
  const width = window.innerWidth;
  const height = window.innerHeight;

  // Check for touch capability
  const isTouchDevice =
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore - msMaxTouchPoints is IE-specific
    navigator.msMaxTouchPoints > 0;

  // Determine device type based on screen width
  // Mobile: < 768px, Tablet: 768-1024px, Desktop: > 1024px
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  const screenSize: "mobile" | "tablet" | "desktop" = isMobile
    ? "mobile"
    : isTablet
    ? "tablet"
    : "desktop";

  const orientation: "portrait" | "landscape" =
    height > width ? "portrait" : "landscape";

  return {
    isMobile,
    isTablet,
    isDesktop,
    isTouchDevice,
    screenSize,
    orientation,
  };
}
