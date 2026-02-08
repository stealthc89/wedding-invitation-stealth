"use client";

import { useState, useEffect } from "react";

interface Challenge {
  id: number;
  text: string;
  created_at: string;
}

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [newText, setNewText] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [message, setMessage] = useState("");

  function fetchChallenges() {
    fetch("/api/admin/challenges")
      .then((res) => res.json())
      .then(setChallenges);
  }

  useEffect(() => {
    fetchChallenges();
  }, []);

  async function addChallenge(e: React.FormEvent) {
    e.preventDefault();
    if (!newText.trim()) return;

    await fetch("/api/admin/challenges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: newText }),
    });
    setNewText("");
    setMessage("Challenge added");
    fetchChallenges();
  }

  async function saveEdit() {
    if (!editingId || !editText.trim()) return;

    await fetch("/api/admin/challenges", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingId, text: editText }),
    });
    setEditingId(null);
    setEditText("");
    fetchChallenges();
  }

  async function deleteChallenge(id: number) {
    if (!confirm("Delete this challenge?")) return;

    await fetch("/api/admin/challenges", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setMessage("Challenge deleted");
    fetchChallenges();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Photo Challenges</h1>
        <p className="text-sm text-gray-500 mt-1">
          Create fun photo prompts for guests. When a guest submits their RSVP,
          they&apos;ll be randomly assigned 2–3 challenges from this pool.
        </p>
      </div>

      {message && (
        <p className="text-sm text-blue-600 bg-blue-50 p-2 rounded">{message}</p>
      )}

      {/* Add Challenge */}
      <form onSubmit={addChallenge} className="bg-white rounded-lg shadow p-4 flex gap-3">
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder='e.g., "Take a selfie with the groom"'
          className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
          required
        />
        <button
          type="submit"
          className="px-4 py-2 bg-gray-800 text-white rounded text-sm hover:bg-gray-700"
        >
          Add Challenge
        </button>
      </form>

      {/* Challenge List */}
      <div className="bg-white rounded-lg shadow divide-y divide-gray-100">
        {challenges.length === 0 ? (
          <p className="text-center text-gray-400 py-8">
            No challenges yet. Add some above!
          </p>
        ) : (
          challenges.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3">
              {editingId === c.id ? (
                <>
                  <input
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                    autoFocus
                  />
                  <button
                    onClick={saveEdit}
                    className="text-green-700 hover:underline text-xs"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-gray-500 hover:underline text-xs"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-gray-800">{c.text}</span>
                  <button
                    onClick={() => {
                      setEditingId(c.id);
                      setEditText(c.text);
                    }}
                    className="text-blue-600 hover:underline text-xs"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteChallenge(c.id)}
                    className="text-red-600 hover:underline text-xs"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Info */}
      <div className="bg-white rounded-lg shadow p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">How it works</h2>
        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
          <li>When a guest RSVPs &quot;attending&quot;, they&apos;re randomly assigned 2–3 challenges</li>
          <li>Challenges appear on their RSVP confirmation page and in the confirmation email</li>
          <li>A global QR code at the venue links to the photo upload page</li>
          <li>This is just for fun — no enforcement or scoring</li>
        </ul>
      </div>
    </div>
  );
}
