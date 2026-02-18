"use client";

import PhotoSlideshow from "@/components/PhotoSlideshow";
import BackgroundMusic from "@/components/BackgroundMusic";
import BrandLogo from "@/components/BrandLogo";
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
          {/* Brand Logo */}
          <div className="flex justify-center mb-4">
            <BrandLogo className="w-28 h-20 sm:w-36 sm:h-24 text-white" />
          </div>

          <p className="text-[10px] sm:text-xs uppercase tracking-[0.3em] text-white/80 mb-2" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
            Together with their families
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-light text-white mb-3 leading-tight" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}>
            Chris & Candice
          </h1>
          <p className="text-sm sm:text-base text-white/90 mb-2" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
            invite you to celebrate their wedding
          </p>
          <div className="w-12 h-px bg-white/40 mx-auto my-3" />

          {/* Wedding Date */}
          <p className="text-xl sm:text-2xl font-light text-white mb-6" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.7)' }}>
            Saturday, 23rd May 2026
          </p>

          {/* Collapsible Wedding Details */}
          <div className="mb-3">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="glass-card rounded-lg px-5 py-3.5 text-white transition-all duration-700 ease-out w-full flex items-center justify-between"
            >
              <span className="text-sm font-medium tracking-wide">Venue Details</span>
              <svg
                className={`w-4 h-4 transition-all duration-700 ease-out ${showDetails ? 'rotate-180 scale-110' : 'scale-100'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showDetails && (
              <div className="dropdown-content grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div className="rounded-xl p-5 text-white text-left">
                  <h3 className="text-base font-semibold mb-3 tracking-wide">Ceremony</h3>
                  <p className="text-sm text-white/95 mb-2 leading-relaxed">Wood Green New Testament Church of God</p>
                  <p className="text-xs text-white/75 mb-3 leading-relaxed">Arcadian Gardens, High Road, Wood Green, N22 5AA</p>
                  <p className="text-sm font-medium text-white/95 pt-2 border-t border-white/20">Arrive: 12:30 PM | Ceremony: 1:00 PM</p>
                </div>
                <div className="rounded-xl p-5 text-white text-left">
                  <h3 className="text-base font-semibold mb-3 tracking-wide">Reception</h3>
                  <p className="text-sm text-white/95 mb-2 leading-relaxed">Loughton Grand Marquee</p>
                  <p className="text-xs text-white/75 mb-3 leading-relaxed">Langston Road, Loughton, IG10 3TG</p>
                  <p className="text-sm font-medium text-white/95 pt-2 border-t border-white/20">Canapés & Drinks: 3:30 PM onwards</p>
                </div>
              </div>
            )}
          </div>

          {/* Collapsible Itinerary */}
          <div className="mb-6">
            <button
              onClick={() => setShowItinerary(!showItinerary)}
              className="glass-card rounded-lg px-5 py-3.5 text-white transition-all duration-700 ease-out w-full flex items-center justify-between"
            >
              <span className="text-sm font-medium tracking-wide">Full Itinerary</span>
              <svg
                className={`w-4 h-4 transition-all duration-700 ease-out ${showItinerary ? 'rotate-180 scale-110' : 'scale-100'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showItinerary && (
              <div className="dropdown-content rounded-xl p-6 text-white mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="text-left">
                    <h4 className="text-base font-semibold mb-4 text-white border-b border-white/30 pb-3 tracking-wide">Ceremony</h4>
                    <div className="space-y-2.5 text-sm">
                      <p className="flex items-baseline"><span className="font-semibold text-white/95 w-24 flex-shrink-0">12:30 PM</span><span className="text-white/90">Guest Arrival</span></p>
                      <p className="flex items-baseline"><span className="font-semibold text-white/95 w-24 flex-shrink-0">1:00 PM</span><span className="text-white/90">Ceremony Begins</span></p>
                      <p className="flex items-baseline"><span className="font-semibold text-white/95 w-24 flex-shrink-0">2:30 PM</span><span className="text-white/90">Ceremony Ends</span></p>
                    </div>
                  </div>
                  <div className="text-left">
                    <h4 className="text-base font-semibold mb-4 text-white border-b border-white/30 pb-3 tracking-wide">Reception</h4>
                    <div className="space-y-2.5 text-sm">
                      <p className="flex items-baseline"><span className="font-semibold text-white/95 w-24 flex-shrink-0">3:30 PM</span><span className="text-white/90">Canapés & Drinks</span></p>
                      <p className="flex items-baseline"><span className="font-semibold text-white/95 w-24 flex-shrink-0">5:00 PM</span><span className="text-white/90">Bride & Groom Arrival</span></p>
                      <p className="flex items-baseline"><span className="font-semibold text-white/95 w-24 flex-shrink-0">6:00 PM</span><span className="text-white/90">Dinner Served</span></p>
                      <p className="flex items-baseline"><span className="font-semibold text-white/95 w-24 flex-shrink-0">7:30 PM</span><span className="text-white/90">Cake Cutting</span></p>
                      <p className="flex items-baseline"><span className="font-semibold text-white/95 w-24 flex-shrink-0">8:00 PM</span><span className="text-white/90">Speeches</span></p>
                      <p className="flex items-baseline"><span className="font-semibold text-white/95 w-24 flex-shrink-0">9:00 PM</span><span className="text-white/90">Dance Floor Opens</span></p>
                      <p className="flex items-baseline"><span className="font-semibold text-white/95 w-24 flex-shrink-0">1:00 AM</span><span className="text-white/90">Evening Ends</span></p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RSVP Form - compact */}
          <div className="max-w-xs mx-auto w-full">
            <form onSubmit={handleSubmit} className="glass-card rounded-lg p-4">
              <p className="text-sm text-white/90 mb-3">Enter your invite code to RSVP:</p>
              <div className="space-y-2">
                <input
                  type="text"
                  value={guestId}
                  onChange={(e) => setGuestId(e.target.value)}
                  placeholder="Invite code"
                  className="w-full px-3 py-2 rounded border border-white/30 bg-white/10 text-white placeholder:text-white/50 focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/20 outline-none transition-all text-center text-sm"
                  style={{ color: 'white', WebkitTextFillColor: 'white' }}
                />
                {error && (
                  <p className="text-sm text-red-400">{error}</p>
                )}
                <button
                  type="submit"
                  className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-white text-sm py-2 px-4 rounded transition-colors duration-200"
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
