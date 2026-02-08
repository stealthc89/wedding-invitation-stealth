"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PhotoSlideshow from "@/components/PhotoSlideshow";

interface GuestData {
  id: number;
  name: string;
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
  const [plusOneAttending, setPlusOneAttending] = useState(false);
  const [mealPreference, setMealPreference] = useState("no_preference");
  const [dietaryNotes, setDietaryNotes] = useState("");
  const [deadline, setDeadline] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/rsvp?token=${token}`)
      .then((res) => {
        if (!res.ok) throw new Error("Invalid invitation link");
        return res.json();
      })
      .then((data) => {
        setGuest(data);
        if (data.rsvp_deadline) setDeadline(data.rsvp_deadline);
        if (data.rsvp_status === "responded") {
          setSubmitted(true);
          setAttending(data.attending === 1);
          setPlusOneAttending(data.plus_one_attending === 1);
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

    setSubmitting(true);
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          attending,
          plus_one_attending: plusOneAttending,
          meal_preference: attending ? mealPreference : null,
          dietary_notes: attending ? dietaryNotes : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit RSVP");
      }

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
          <p className="text-xl text-white/90">{guest.name}</p>
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
          <div className="glass-card rounded-2xl p-8 text-center">
            <div className="text-4xl mb-4">{attending ? "🎉" : "💌"}</div>
            <h2 className="text-2xl text-[var(--color-primary)] mb-3">
              {attending ? "We can\u2019t wait to see you!" : "We\u2019ll miss you!"}
            </h2>
            <div className="text-[var(--color-muted)] space-y-1 mb-6">
              <p>
                <strong>Attending:</strong> {attending ? "Yes" : "No"}
              </p>
              {attending && guest.plus_one_allowed === 1 && (
                <p>
                  <strong>Plus one:</strong>{" "}
                  {plusOneAttending ? "Yes" : "No"}
                </p>
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
            <p className="text-sm text-[var(--color-muted)] border-t border-[var(--color-border)] pt-4">
              If you need to make changes, please contact the bride or groom.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-8">
            {error && (
              <p className="text-[var(--color-error)] text-sm mb-4">{error}</p>
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
                    setPlusOneAttending(false);
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

            {/* Plus One */}
            {attending && guest.plus_one_allowed === 1 && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-[var(--color-primary)] mb-3">
                  Will you be bringing a plus one?
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setPlusOneAttending(true)}
                    className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                      plusOneAttending
                        ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white shadow-md"
                        : "border-[var(--color-border)] hover:border-[var(--color-accent)]"
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlusOneAttending(false)}
                    className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                      !plusOneAttending
                        ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white shadow-md"
                        : "border-[var(--color-border)] hover:border-[var(--color-accent)]"
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>
            )}

            {/* Meal Preference */}
            {attending && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-[var(--color-primary)] mb-1">
                  Meal preference
                </label>
                <p className="text-xs text-[var(--color-muted)] mb-3">
                  This is a preference only, not a final selection.
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

            {/* Dietary Notes */}
            {attending && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-[var(--color-primary)] mb-1">
                  Dietary restrictions or special requests
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

            {/* Submit */}
            <button
              type="submit"
              disabled={attending === null || submitting}
              className="w-full py-3 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-40 transition-all shadow-md"
            >
              {submitting ? "Submitting..." : "Submit RSVP"}
            </button>
          </form>
        )}
      </div>
    </PhotoSlideshow>
  );
}
