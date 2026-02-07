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

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((res) => res.json())
      .then(setAnalytics);
  }, []);

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
      <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>

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

      {/* Meal Breakdown */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Meal Preferences
        </h2>
        {analytics.mealBreakdown.length === 0 ? (
          <p className="text-gray-500 text-sm">No responses yet.</p>
        ) : (
          <div className="space-y-2">
            {analytics.mealBreakdown.map((m) => {
              const pct =
                analytics.totalAttending > 0
                  ? Math.round((m.count / analytics.totalAttending) * 100)
                  : 0;
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
            })}
          </div>
        )}
      </div>

      {/* Email Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Email Actions
        </h2>
        {sendResult && (
          <p className="text-sm text-blue-600 bg-blue-50 p-2 rounded mb-4">
            {sendResult}
          </p>
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
