"use client";

import { useState, useEffect } from "react";
import PhotoSlideshow from "@/components/PhotoSlideshow";
import BrandLogo from "@/components/BrandLogo";

export default function MenuPage() {
  const [menuUrl, setMenuUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/menu")
      .then((r) => r.json())
      .then((d) => setMenuUrl(d.url))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PhotoSlideshow overlay="dark">
      <div className="w-full max-w-lg mx-4 my-8">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <BrandLogo className="w-28 h-20 sm:w-36 sm:h-24 text-white" />
          </div>
          <p className="text-sm uppercase tracking-[0.3em] text-white/60 mb-2">
            Together with their families
          </p>
          <h1 className="text-4xl text-white mb-1">Chris & Candice</h1>
          <p className="text-sm text-white/70 italic">Wedding Menu</p>
          <div className="w-12 h-px bg-white/40 mx-auto my-4" />
        </div>

        <div className="glass-card rounded-2xl p-4">
          {loading && (
            <p className="text-white/50 text-sm text-center py-8">Loading menu...</p>
          )}
          {!loading && !menuUrl && (
            <p className="text-white/50 text-sm text-center py-8">Menu coming soon</p>
          )}
          {!loading && menuUrl && (
            <img
              src={menuUrl}
              alt="Wedding menu"
              className="w-full h-auto rounded-xl"
            />
          )}
        </div>
      </div>
    </PhotoSlideshow>
  );
}
