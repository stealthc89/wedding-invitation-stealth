"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PhotoSlideshow from "@/components/PhotoSlideshow";
import BackgroundMusic from "@/components/BackgroundMusic";

interface GuestData {
  id: number;
  name: string;
  email: string | null;
  plus_one_allowed: number;
  rsvp_status: string;
  attending: number | null;
  plus_one_attending: number;
  meal_preference: string | null;
  dietary_notes: string | null;
  responded_at: string | null;
}

const MEAL_OPTIONS = [
  { value: "no_preference", label: "No preference" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "pescatarian", label: "Pescatarian" },
];

export default function RSVPPage() {
  const params = useParams();
  const token = params.token as string;

  const [guest, setGuest] = useState<GuestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [attending, setAttending] = useState<boolean | null>(null);
  const [plusOneCount, setPlusOneCount] = useState(0);
  const [plusOneNames, setPlusOneNames] = useState<string[]>([]);
  const [plusOneMealPreferences, setPlusOneMealPreferences] = useState<string[]>([]);
  const [plusOneDietaryNotes, setPlusOneDietaryNotes] = useState<string[]>([]);
  const [mealPreference, setMealPreference] = useState("no_preference");
  const [dietaryNotes, setDietaryNotes] = useState("");
  const [email, setEmail] = useState("");
  const [deadline, setDeadline] = useState<string | null>(null);
  const [challenges, setChallenges] = useState<string[]>([]);

  useEffect(() => {
    fetch(`/api/rsvp?token=${token}`)
      .then((res) => {
        if (!res.ok) throw new Error("Invalid invitation link");
        return res.json();
      })
      .then((data) => {
        setGuest(data);
        setEmail(data.email || "");
        if (data.rsvp_deadline) setDeadline(data.rsvp_deadline);
        if (data.challenges) setChallenges(data.challenges);
        if (data.rsvp_status === "responded") {
          setSubmitted(true);
          setAttending(data.attending === 1);
          setPlusOneCount(data.plus_one_attending || 0);
          if (data.plus_one_names) {
            try {
              setPlusOneNames(JSON.parse(data.plus_one_names));
            } catch {
              setPlusOneNames([]);
            }
          }
          if (data.plus_one_meal_preference) {
            try {
              setPlusOneMealPreferences(JSON.parse(data.plus_one_meal_preference));
            } catch {
              setPlusOneMealPreferences([]);
            }
          }
          if (data.plus_one_dietary_notes) {
            try {
              setPlusOneDietaryNotes(JSON.parse(data.plus_one_dietary_notes));
            } catch {
              setPlusOneDietaryNotes([]);
            }
          }
          setMealPreference(data.meal_preference || "no_preference");
          setDietaryNotes(data.dietary_notes || "");
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (attending === null) return;
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    // Validate plus one names
    if (attending && plusOneCount > 0) {
      const validNames = plusOneNames.filter(name => name && name.trim());
      if (validNames.length !== plusOneCount) {
        setError(`Please provide names for all ${plusOneCount} additional guest${plusOneCount > 1 ? 's' : ''}`);
        return;
      }
    }

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          email,
          attending,
          plus_one_attending: plusOneCount,
          plus_one_names: attending && plusOneCount > 0 ? JSON.stringify(plusOneNames.slice(0, plusOneCount)) : null,
          plus_one_meal_preference: attending && plusOneCount > 0 ? JSON.stringify(plusOneMealPreferences.slice(0, plusOneCount)) : null,
          plus_one_dietary_notes: attending && plusOneCount > 0 ? JSON.stringify(plusOneDietaryNotes.slice(0, plusOneCount)) : null,
          meal_preference: attending ? mealPreference : null,
          dietary_notes: attending ? dietaryNotes : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit RSVP");
      }

      if (data.challenges) setChallenges(data.challenges);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <PhotoSlideshow overlay="dark">
        <p className="text-white/70">Loading your invitation...</p>
      </PhotoSlideshow>
    );
  }

  if (error && !guest) {
    return (
      <PhotoSlideshow overlay="dark">
        <div className="text-center px-6">
          <h1 className="text-3xl text-white mb-4">Oops</h1>
          <p className="text-red-300">{error}</p>
        </div>
      </PhotoSlideshow>
    );
  }

  if (!guest) return null;

  return (
    <>
      <PhotoSlideshow overlay="dark">
        <div className="w-full max-w-lg mx-4 my-8">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-sm uppercase tracking-[0.3em] text-white/60 mb-3">
            You&apos;re Invited
          </p>
          <h1 className="text-4xl md:text-5xl text-white mb-2">
            Chris & Candice
          </h1>
          <div className="w-12 h-px bg-white/40 mx-auto my-4" />
          <p className="text-xl text-white/90 mb-6">{guest.name}</p>

          {/* Wedding Date & Location */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mt-6 text-white">
            <p className="text-2xl font-semibold mb-4">Saturday, 23rd May 2026</p>
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-semibold text-base mb-1">Ceremony - 1:00 PM</p>
                <p className="text-white/80">Wood Green New Testament Church of God</p>
                <p className="text-white/80 text-xs">Arcadian Gardens, High Road, Wood Green, N22 5AA</p>
              </div>
              <div className="w-16 h-px bg-white/20 mx-auto" />
              <div>
                <p className="font-semibold text-base mb-1">Reception - 3:30 PM onwards</p>
                <p className="text-white/80">Loughton Grand Marquee</p>
                <p className="text-white/80 text-xs">Langston Road, Loughton, IG10 3TG</p>
              </div>
            </div>
          </div>
        </div>

        {/* Deadline notice */}
        {deadline && !submitted && (
          <p className="text-center text-white/70 text-sm mb-4">
            Please respond by{" "}
            <strong className="text-white">
              {new Date(deadline + "T00:00:00").toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </strong>
          </p>
        )}

        {submitted ? (
          <div className="glass-card rounded-2xl p-8 text-center animate-fade-in">
            <div className="text-5xl mb-4 animate-bounce-subtle">{attending ? "🎉" : "💌"}</div>
            <h2 className="text-2xl text-[var(--color-primary)] mb-2 font-semibold">
              {attending ? "We can't wait to see you!" : "We'll miss you!"}
            </h2>
            <p className="text-sm text-[var(--color-muted)] mb-4">Your RSVP has been recorded</p>
            <div className="text-[var(--color-muted)] space-y-1 mb-6">
              <p>
                <strong>Attending:</strong> {attending ? "Yes" : "No"}
              </p>
              {attending && guest.plus_one_allowed > 0 && (
                <div>
                  <p>
                    <strong>Additional guests:</strong> {plusOneCount}
                  </p>
                  {plusOneCount > 0 && plusOneNames.length > 0 && (
                    <ul className="ml-4 mt-1 text-sm space-y-1">
                      {plusOneNames.map((name, i) => (
                        <li key={i} className="mb-1">
                          • {name}
                          {plusOneMealPreferences[i] && (
                            <span className="text-xs text-[var(--color-muted)] ml-2">
                              ({MEAL_OPTIONS.find((m) => m.value === plusOneMealPreferences[i])?.label})
                            </span>
                          )}
                          {plusOneDietaryNotes[i] && plusOneDietaryNotes[i].trim() && (
                            <div className="ml-4 text-xs text-[var(--color-muted)] mt-0.5">
                              Dietary: {plusOneDietaryNotes[i]}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {attending && (
                <p>
                  <strong>Meal preference:</strong>{" "}
                  {MEAL_OPTIONS.find((m) => m.value === mealPreference)?.label}
                </p>
              )}
              {attending && dietaryNotes && (
                <p>
                  <strong>Dietary notes:</strong> {dietaryNotes}
                </p>
              )}
            </div>
            {attending && challenges.length > 0 && (
              <div className="border-t border-[var(--color-border)] pt-6 mb-4 text-left bg-gradient-to-br from-purple-50/20 to-pink-50/20 rounded-lg p-4 -mx-2">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">📸</span>
                  <p className="text-base font-semibold text-[var(--color-primary)]">
                    Your Photo Challenges
                  </p>
                </div>
                <p className="text-xs text-[var(--color-muted)] mb-3 leading-relaxed">
                  Snap these at the wedding! Upload via the QR code at the venue or use the link in your confirmation email.
                </p>
                <ul className="space-y-2">
                  {challenges.map((c, i) => (
                    <li key={i} className="text-sm text-[var(--color-muted)] flex items-start gap-3 bg-white/50 rounded-lg p-2">
                      <span className="text-[var(--color-accent)] font-bold text-base">✓</span>
                      <span className="flex-1">{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-sm text-[var(--color-muted)] border-t border-[var(--color-border)] pt-4">
              If you need to make changes, please contact the bride or groom.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-8">
            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            {/* Email (required) */}
            {!guest.email && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-[var(--color-primary)] mb-1">
                  Email address <span className="text-red-600">*</span>
                </label>
                <p className="text-xs text-[var(--color-muted)] mb-3">
                  We'll send your confirmation and event details here
                </p>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="your.email@example.com"
                  className="w-full px-4 py-3 rounded-lg border-2 border-[var(--color-border)] focus:border-[var(--color-accent)] focus:outline-none text-base transition-colors"
                />
              </div>
            )}

            {/* Attendance */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-[var(--color-primary)] mb-3">
                Will you be attending?
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setAttending(true)}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                    attending === true
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white shadow-md"
                      : "border-[var(--color-border)] hover:border-[var(--color-accent)]"
                  }`}
                >
                  Joyfully Accept
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAttending(false);
                    setPlusOneCount(0);
                    setPlusOneNames([]);
                    setPlusOneMealPreferences([]);
                    setPlusOneDietaryNotes([]);
                  }}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                    attending === false
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white shadow-md"
                      : "border-[var(--color-border)] hover:border-[var(--color-accent)]"
                  }`}
                >
                  Regretfully Decline
                </button>
              </div>
            </div>

            {/* Primary Guest - Meal Preference */}
            {attending && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-[var(--color-primary)] mb-1">
                  Your meal preference
                </label>
                <p className="text-xs text-[var(--color-muted)] mb-3">
                  For {guest.name}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {MEAL_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setMealPreference(option.value)}
                      className={`py-2.5 px-3 rounded-lg border-2 text-sm transition-all ${
                        mealPreference === option.value
                          ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white shadow-md"
                          : "border-[var(--color-border)] hover:border-[var(--color-accent)]"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Primary Guest - Dietary Notes */}
            {attending && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-[var(--color-primary)] mb-1">
                  Your dietary restrictions or special requests
                </label>
                <p className="text-xs text-[var(--color-muted)] mb-3">
                  Allergies, intolerances, or anything we should know.
                </p>
                <textarea
                  value={dietaryNotes}
                  onChange={(e) => setDietaryNotes(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="e.g., nut allergy, gluten-free, halal"
                  className="w-full px-3 py-2 rounded-lg border-2 border-[var(--color-border)] focus:border-[var(--color-accent)] focus:outline-none text-sm transition-colors"
                />
              </div>
            )}

            {/* Additional Guests */}
            {attending && guest.plus_one_allowed > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-[var(--color-primary)] mb-1">
                  How many additional guests are you bringing?
                </label>
                <p className="text-xs text-[var(--color-muted)] mb-3">
                  You may bring up to {guest.plus_one_allowed} additional guest{guest.plus_one_allowed > 1 ? 's' : ''}
                </p>
                <div className="flex gap-2 mb-4">
                  {Array.from({ length: guest.plus_one_allowed + 1 }, (_, i) => i).map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        setPlusOneCount(num);
                        setPlusOneNames(Array(num).fill(''));
                        setPlusOneMealPreferences(Array(num).fill('no_preference'));
                        setPlusOneDietaryNotes(Array(num).fill(''));
                      }}
                      className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all font-medium ${
                        plusOneCount === num
                          ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white shadow-md"
                          : "border-[var(--color-border)] hover:border-[var(--color-accent)]"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>

                {/* Names, meal preferences, and dietary notes for each additional guest */}
                {plusOneCount > 0 && (
                  <div className="space-y-4 bg-gray-50/50 rounded-lg p-4">
                    <p className="text-sm font-medium text-[var(--color-primary)]">
                      Please provide details for your additional guest{plusOneCount > 1 ? 's' : ''}:
                    </p>
                    {Array.from({ length: plusOneCount }, (_, i) => (
                      <div key={i} className="space-y-3 bg-white/50 rounded-lg p-3 border border-gray-200">
                        <p className="text-xs font-semibold text-[var(--color-primary)]">Guest {i + 1}</p>
                        <div>
                          <label className="block text-xs text-[var(--color-muted)] mb-1">
                            Full name <span className="text-red-600">*</span>
                          </label>
                          <input
                            type="text"
                            value={plusOneNames[i] || ''}
                            onChange={(e) => {
                              const newNames = [...plusOneNames];
                              newNames[i] = e.target.value;
                              setPlusOneNames(newNames);
                            }}
                            required
                            placeholder="Full name"
                            className="w-full px-3 py-2 rounded-lg border-2 border-[var(--color-border)] focus:border-[var(--color-accent)] focus:outline-none text-sm transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[var(--color-muted)] mb-2">
                            Meal preference
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {MEAL_OPTIONS.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                  const newPrefs = [...plusOneMealPreferences];
                                  newPrefs[i] = option.value;
                                  setPlusOneMealPreferences(newPrefs);
                                }}
                                className={`py-2 px-2 rounded-lg border-2 text-xs transition-all ${
                                  (plusOneMealPreferences[i] || 'no_preference') === option.value
                                    ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white shadow-md"
                                    : "border-[var(--color-border)] hover:border-[var(--color-accent)]"
                                }`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-[var(--color-muted)] mb-1">
                            Dietary restrictions or special requests
                          </label>
                          <textarea
                            value={plusOneDietaryNotes[i] || ''}
                            onChange={(e) => {
                              const newNotes = [...plusOneDietaryNotes];
                              newNotes[i] = e.target.value;
                              setPlusOneDietaryNotes(newNotes);
                            }}
                            maxLength={500}
                            rows={2}
                            placeholder="e.g., nut allergy, gluten-free, halal"
                            className="w-full px-3 py-2 rounded-lg border-2 border-[var(--color-border)] focus:border-[var(--color-accent)] focus:outline-none text-sm transition-colors"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={attending === null || submitting || (!guest.email && !email)}
              className="w-full py-3.5 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md font-medium text-base"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span>
                  <span>Submitting...</span>
                </span>
              ) : (
                "Submit RSVP"
              )}
            </button>
            {attending === null && (
              <p className="text-xs text-center text-[var(--color-muted)] mt-2">
                Please select whether you'll be attending above
              </p>
            )}
          </form>
        )}
      </div>
    </PhotoSlideshow>
    <BackgroundMusic src="/audio/its-you-max.mp3" volume={0.7} startTime={0} />
  </>
  );
}
