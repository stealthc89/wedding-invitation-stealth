"use client";

import { useEffect, useState } from "react";

interface Analytics {
  totalInvited: number;
  totalResponded: number;
  outstanding: number;
  totalAttending: number;
  totalDeclined: number;
  totalPlusOnes: number;
  totalHeadcount: number;
  mealBreakdown: { meal_preference: string; count: number }[];
  totalPhotos: number;
  photosByGuest: { guest_name: string; count: number }[];
  photosOverTime: { date: string; count: number }[];
}

const MEAL_LABELS: Record<string, string> = {
  no_preference: "No preference",
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  pescatarian: "Pescatarian",
};

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<string | null>(null);
  const [sideFilter, setSideFilter] = useState<"all" | "bride" | "groom">("all");

  useEffect(() => {
    const params = sideFilter !== "all" ? `?side=${sideFilter}` : "";
    fetch(`/api/admin/analytics${params}`)
      .then((res) => res.json())
      .then(setAnalytics);
  }, [sideFilter]);

  async function sendEmails(templateSlug: string) {
    setSending(templateSlug);
    setSendResult(null);
    try {
      const res = await fetch("/api/admin/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateSlug }),
      });
      const data = await res.json();
      setSendResult(
        `Sent: ${data.sent}, Failed: ${data.failed}, Total: ${data.total}`
      );
    } catch {
      setSendResult("Failed to send emails");
    } finally {
      setSending(null);
    }
  }

  if (!analytics) {
    return <p className="text-gray-500">Loading analytics...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor RSVPs, send emails, and manage your event</p>
        </div>
        <a
          href="/manage/help"
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors flex items-center gap-2"
        >
          <span>?</span>
          <span>Help</span>
        </a>
      </div>

      {/* Side filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 font-medium">View:</span>
        {(["all", "bride", "groom"] as const).map((s) => (
          <button
            key={s}
            onClick={() => { setSideFilter(s); setAnalytics(null); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              sideFilter === s ? "bg-gray-800 text-white" : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {s === "all" ? "All guests" : s === "bride" ? "👰 Bride's guests" : "🤵 Groom's guests"}
          </button>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Invited" value={analytics.totalInvited} />
        <StatCard label="Responded" value={analytics.totalResponded} />
        <StatCard label="Outstanding" value={analytics.outstanding} color="amber" />
        <StatCard label="Total Headcount" value={analytics.totalHeadcount} color="green" />
        <StatCard label="Attending" value={analytics.totalAttending} color="green" />
        <StatCard label="Declined" value={analytics.totalDeclined} color="red" />
        <StatCard label="Plus Ones" value={analytics.totalPlusOnes} />
        <StatCard
          label="Response Rate"
          value={
            analytics.totalInvited > 0
              ? `${Math.round((analytics.totalResponded / analytics.totalInvited) * 100)}%`
              : "0%"
          }
        />
      </div>

      {/* Photo Stats */}
      {analytics.totalPhotos > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Guest Photos</h2>
            <a
              href="/manage/photos"
              className="text-sm text-blue-600 hover:underline"
            >
              View Gallery
            </a>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-500">Total Photos</p>
              <p className="text-2xl font-bold text-gray-800">{analytics.totalPhotos}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Guests Contributing</p>
              <p className="text-2xl font-bold text-gray-800">{analytics.photosByGuest.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Top Contributor</p>
              <p className="text-lg font-bold text-gray-800 truncate">
                {analytics.photosByGuest[0]?.guest_name || "—"}
                {analytics.photosByGuest[0] && (
                  <span className="text-sm text-gray-500 font-normal ml-1">
                    ({analytics.photosByGuest[0].count})
                  </span>
                )}
              </p>
            </div>
          </div>
          {analytics.photosOverTime.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-gray-500 font-medium">Upload activity</p>
              {analytics.photosOverTime.map((d) => (
                <div key={d.date} className="flex items-center gap-2 text-xs">
                  <span className="w-20 text-gray-500">{d.date}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (d.count / Math.max(...analytics.photosOverTime.map((x) => x.count))) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="w-8 text-right text-gray-600">{d.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* QR Code */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-purple-900 mb-2">📸 Photo Upload QR Code</h2>
        <p className="text-sm text-purple-700 mb-4">
          Print this QR code and display it at the venue. Guests scan it to upload photos — no login required!
        </p>
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/api/admin/qr"
            alt="Photo upload QR code"
            className="w-32 h-32 border border-gray-200 rounded"
          />
          <div className="space-y-2">
            <a
              href="/api/admin/qr?format=png"
              className="block px-4 py-2.5 bg-purple-700 text-white rounded-lg text-sm font-medium hover:bg-purple-800 text-center transition-colors shadow-sm"
            >
              ⬇️ Download PNG (print-ready)
            </a>
            <a
              href="/api/admin/qr"
              target="_blank"
              className="block px-4 py-2.5 bg-white border-2 border-purple-300 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-50 text-center transition-colors"
            >
              👁️ Open SVG
            </a>
          </div>
        </div>
      </div>

      {/* Meal Breakdown */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Meal Preferences
        </h2>
        {analytics.mealBreakdown.length === 0 ? (
          <p className="text-gray-500 text-sm">No responses yet.</p>
        ) : (
          <div className="space-y-2">
            {(() => {
              const total = analytics.mealBreakdown.reduce((sum, m) => sum + m.count, 0);
              return analytics.mealBreakdown.map((m) => {
                const pct = total > 0 ? Math.round((m.count / total) * 100) : 0;
                return (
                  <div key={m.meal_preference} className="flex items-center gap-3">
                    <span className="w-32 text-sm text-gray-600">
                      {MEAL_LABELS[m.meal_preference] || m.meal_preference}
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                      <div
                        className="bg-gray-700 h-full rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-16 text-right">
                      {m.count} ({pct}%)
                    </span>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>

      {/* Email Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">
          Email Actions
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Send invitations, reminders, itinerary, photo challenge reminders, or thank you notes to guests. Emails are sent only to relevant guests.
        </p>
        {sendResult && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 p-3 rounded-lg mb-4 flex items-start gap-2">
            <span className="text-green-600">✓</span>
            <span>{sendResult}</span>
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => sendEmails("invitation")}
            disabled={sending !== null}
            className="px-4 py-2 bg-gray-800 text-white rounded text-sm hover:bg-gray-700 disabled:opacity-50"
          >
            {sending === "invitation"
              ? "Sending..."
              : "Send Invitations (unsent only)"}
          </button>
          <button
            onClick={() => sendEmails("reminder")}
            disabled={sending !== null}
            className="px-4 py-2 bg-amber-600 text-white rounded text-sm hover:bg-amber-700 disabled:opacity-50"
          >
            {sending === "reminder"
              ? "Sending..."
              : "Send Reminders (non-responders)"}
          </button>
          <button
            onClick={() => sendEmails("itinerary")}
            disabled={sending !== null}
            className="px-4 py-2 bg-green-700 text-white rounded text-sm hover:bg-green-800 disabled:opacity-50"
          >
            {sending === "itinerary"
              ? "Sending..."
              : "Send Itinerary (attending only)"}
          </button>
          <button
            onClick={() => sendEmails("photo_challenge_reminder")}
            disabled={sending !== null}
            className="px-4 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:opacity-50"
          >
            {sending === "photo_challenge_reminder"
              ? "Sending..."
              : "Remind Photo Challenges (attending only)"}
          </button>
          <button
            onClick={() => sendEmails("thank_you")}
            disabled={sending !== null}
            className="px-4 py-2 bg-rose-600 text-white rounded text-sm hover:bg-rose-700 disabled:opacity-50"
          >
            {sending === "thank_you"
              ? "Sending..."
              : "Send Thank You (attending only)"}
          </button>
        </div>
      </div>

      {/* Export */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Export</h2>
        <a
          href="/api/admin/guests?format=csv"
          className="inline-block px-4 py-2 bg-gray-800 text-white rounded text-sm hover:bg-gray-700"
        >
          Export Guests as CSV
        </a>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  const colorClass =
    color === "green"
      ? "text-green-700"
      : color === "red"
        ? "text-red-600"
        : color === "amber"
          ? "text-amber-600"
          : "text-gray-800";

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
    </div>
  );
}
