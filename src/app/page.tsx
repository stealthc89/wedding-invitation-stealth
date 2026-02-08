"use client";

import PhotoSlideshow from "@/components/PhotoSlideshow";
import BackgroundMusic from "@/components/BackgroundMusic";
import MonogramLogo from "@/components/MonogramLogo";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [guestId, setGuestId] = useState("");
  const [error, setError] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [showItinerary, setShowItinerary] = useState(false);
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
        <div className="text-center px-4 py-8 max-w-2xl mx-auto min-h-screen flex flex-col justify-center">
          {/* Monogram Logo */}
          <div className="flex justify-center mb-4">
            <MonogramLogo className="w-20 h-20 sm:w-24 sm:h-24 text-white" />
          </div>

          <p className="text-[10px] sm:text-xs uppercase tracking-[0.3em] text-white/60 mb-2">
            Together with their families
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-light text-white mb-2 leading-tight">
            Chris & Candice
          </h1>
          <div className="w-12 h-px bg-white/30 mx-auto my-3" />
          <p className="text-sm sm:text-base text-white/70 mb-4">
            Request the pleasure of your company
          </p>

          {/* Wedding Date */}
          <p className="text-xl sm:text-2xl font-light text-white mb-6">
            Saturday, 23rd May 2026
          </p>

          {/* Collapsible Wedding Details */}
          <div className="mb-3">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="glass-card rounded-lg px-4 py-2.5 text-white hover:bg-white/10 transition-all w-full flex items-center justify-between"
            >
              <span className="text-sm font-medium">Venue Details</span>
              <svg
                className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showDetails && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <div className="glass-card rounded-lg p-4 text-white text-left">
                  <h3 className="text-sm font-semibold mb-2">Ceremony</h3>
                  <p className="text-xs text-white/80 mb-1">Wood Green New Testament Church of God</p>
                  <p className="text-[10px] text-white/60 mb-2">Arcadian Gardens, High Road, Wood Green, N22 5AA</p>
                  <p className="text-xs font-medium text-white/80">Arrive: 12:30 PM | Ceremony: 1:00 PM</p>
                </div>
                <div className="glass-card rounded-lg p-4 text-white text-left">
                  <h3 className="text-sm font-semibold mb-2">Reception</h3>
                  <p className="text-xs text-white/80 mb-1">Loughton Grand Marquee</p>
                  <p className="text-[10px] text-white/60 mb-2">Langston Road, Loughton, IG10 3TG</p>
                  <p className="text-xs font-medium text-white/80">Canapés & Drinks: 3:30 PM onwards</p>
                </div>
              </div>
            )}
          </div>

          {/* Collapsible Itinerary */}
          <div className="mb-6">
            <button
              onClick={() => setShowItinerary(!showItinerary)}
              className="glass-card rounded-lg px-4 py-2.5 text-white hover:bg-white/10 transition-all w-full flex items-center justify-between"
            >
              <span className="text-sm font-medium">Full Itinerary</span>
              <svg
                className={`w-4 h-4 transition-transform ${showItinerary ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showItinerary && (
              <div className="glass-card rounded-lg p-4 text-white mt-3">
                <div className="space-y-4 text-left">
                  <div>
                    <h4 className="text-sm font-semibold mb-2 text-white/90">Ceremony</h4>
                    <div className="space-y-1 text-xs">
                      <p><span className="font-medium text-white/70">12:30 PM</span> - Guest Arrival</p>
                      <p><span className="font-medium text-white/70">1:00 PM</span> - Ceremony Begins</p>
                      <p><span className="font-medium text-white/70">2:30 PM</span> - Ceremony Ends</p>
                    </div>
                  </div>
                  <div className="w-full h-px bg-white/20" />
                  <div>
                    <h4 className="text-sm font-semibold mb-2 text-white/90">Reception</h4>
                    <div className="space-y-1 text-xs">
                      <p><span className="font-medium text-white/70">3:30 PM</span> - Canapés & Drinks</p>
                      <p><span className="font-medium text-white/70">5:00 PM</span> - Bride & Groom Arrival</p>
                      <p><span className="font-medium text-white/70">6:00 PM</span> - Dinner Served</p>
                      <p><span className="font-medium text-white/70">7:30 PM</span> - Cake Cutting</p>
                      <p><span className="font-medium text-white/70">8:00 PM</span> - Speeches</p>
                      <p><span className="font-medium text-white/70">9:00 PM</span> - Dance Floor Opens</p>
                      <p><span className="font-medium text-white/70">1:00 AM</span> - Evening Ends</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RSVP Form - compact */}
          <div className="max-w-xs mx-auto w-full">
            <form onSubmit={handleSubmit} className="glass-card rounded-lg p-3">
              <p className="text-xs text-white/60 mb-2">Enter your invite code to RSVP:</p>
              <div className="space-y-2">
                <input
                  type="text"
                  value={guestId}
                  onChange={(e) => setGuestId(e.target.value)}
                  placeholder="Invite code"
                  className="w-full px-3 py-1.5 rounded border border-gray-300 focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/20 outline-none transition-all text-center text-xs"
                />
                {error && (
                  <p className="text-xs text-red-400">{error}</p>
                )}
                <button
                  type="submit"
                  className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-white text-xs py-1.5 px-4 rounded transition-colors duration-200"
                >
                  RSVP
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
