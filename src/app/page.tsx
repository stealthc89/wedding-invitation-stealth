"use client";

import PhotoSlideshow from "@/components/PhotoSlideshow";
import BackgroundMusic from "@/components/BackgroundMusic";
import MonogramLogo from "@/components/MonogramLogo";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [guestId, setGuestId] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedId = guestId.trim();
    if (!trimmedId) {
      setError("Please enter your invite code");
      return;
    }

    // Accept both numeric IDs and UUID tokens (for backward compatibility)
    const isNumeric = /^\d+$/.test(trimmedId);
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmedId);

    if (!isNumeric && !isUUID) {
      setError("Please enter a valid invite code");
      return;
    }

    // Redirect to RSVP page
    router.push(`/rsvp/${trimmedId}`);
  };

  return (
    <>
      <PhotoSlideshow overlay="dark">
        <div className="text-center px-4 sm:px-6 py-12 sm:py-20 max-w-4xl mx-auto">
          {/* Monogram Logo */}
          <div className="flex justify-center mb-6 sm:mb-8">
            <MonogramLogo className="w-24 h-24 sm:w-32 sm:h-32 text-white" />
          </div>

          <p className="text-xs sm:text-sm uppercase tracking-[0.25em] sm:tracking-[0.3em] text-white/70 mb-3 sm:mb-4">
            Together with their families
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-normal text-white mb-2 sm:mb-3 leading-tight">
            Chris & Candice
          </h1>
          <div className="w-12 sm:w-16 h-px bg-white/40 mx-auto my-4 sm:my-6" />
          <p className="text-base sm:text-lg md:text-xl text-white/80 mb-2 px-4">
            Request the pleasure of your company
          </p>

          {/* Wedding Date */}
          <div className="mt-8 sm:mt-10">
            <p className="text-2xl sm:text-3xl md:text-4xl font-semibold text-white mb-8">
              Saturday, 23rd May 2026
            </p>
          </div>

          {/* Wedding Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8 max-w-3xl mx-auto px-4">
            <div className="glass-card rounded-lg p-6 text-white">
              <h3 className="text-xl font-semibold mb-3">Ceremony</h3>
              <p className="text-sm text-white/90 mb-2">Wood Green New Testament Church of God</p>
              <p className="text-xs text-white/70 mb-3">Arcadian Gardens, High Road, Wood Green, N22 5AA</p>
              <p className="text-sm font-medium text-white/90">Arrive: 12:30 PM</p>
              <p className="text-sm font-medium text-white/90">Ceremony: 1:00 PM</p>
            </div>
            <div className="glass-card rounded-lg p-6 text-white">
              <h3 className="text-xl font-semibold mb-3">Reception</h3>
              <p className="text-sm text-white/90 mb-2">Loughton Grand Marquee</p>
              <p className="text-xs text-white/70 mb-3">Langston Road, Loughton, IG10 3TG</p>
              <p className="text-sm font-medium text-white/90">Canapés & Drinks: 3:30 PM onwards</p>
            </div>
          </div>

          {/* Itinerary */}
          <div className="mt-10 max-w-2xl mx-auto">
            <div className="glass-card rounded-lg p-6 sm:p-8 text-white">
              <h3 className="text-2xl font-semibold mb-6 text-center">Itinerary</h3>
              <div className="space-y-6 text-left">
                <div>
                  <h4 className="text-lg font-semibold mb-3 text-white/90">Ceremony</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium text-white/80">12:30 PM</span> - Guest Arrival</p>
                    <p><span className="font-medium text-white/80">1:00 PM</span> - Ceremony Begins</p>
                    <p><span className="font-medium text-white/80">2:30 PM</span> - Ceremony Ends</p>
                  </div>
                </div>
                <div className="w-full h-px bg-white/20" />
                <div>
                  <h4 className="text-lg font-semibold mb-3 text-white/90">Reception</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium text-white/80">3:30 PM</span> - Canapés & Drinks</p>
                    <p><span className="font-medium text-white/80">5:00 PM</span> - Bride & Groom Arrival</p>
                    <p><span className="font-medium text-white/80">6:00 PM</span> - Dinner Served</p>
                    <p><span className="font-medium text-white/80">7:30 PM</span> - Cake Cutting</p>
                    <p><span className="font-medium text-white/80">8:00 PM</span> - Speeches</p>
                    <p><span className="font-medium text-white/80">9:00 PM</span> - Dance Floor Opens! 🎉</p>
                    <p><span className="font-medium text-white/80">1:00 AM</span> - Evening Ends</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Manual ID entry form - compact backup option */}
          <div className="mt-10 sm:mt-12 max-w-xs mx-auto">
            <p className="text-xs sm:text-sm text-white/60 mb-4 px-4">
              Please use your personal invitation link to RSVP
            </p>
            <p className="text-[10px] sm:text-xs text-white/40 mb-2 px-4">
              Or enter your invite code:
            </p>
            <form onSubmit={handleSubmit} className="glass-card rounded-md p-3">
              <div className="space-y-2">
                <input
                  type="text"
                  value={guestId}
                  onChange={(e) => setGuestId(e.target.value)}
                  placeholder="Invite code"
                  className="w-full px-3 py-2 rounded border border-gray-300 focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/20 outline-none transition-all text-center text-sm"
                />
                {error && (
                  <p className="text-xs text-red-600">{error}</p>
                )}
                <button
                  type="submit"
                  className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-white text-sm py-2 px-4 rounded transition-colors duration-200"
                >
                  Go
                </button>
              </div>
            </form>
          </div>
        </div>
      </PhotoSlideshow>
      <BackgroundMusic src="/audio/its-you-max.mp3" volume={0.7} startTime={0} />
    </>
  );
}
