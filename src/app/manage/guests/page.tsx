"use client";

import { useEffect, useState, useRef } from "react";

interface Guest {
  id: number;
  token: string;
  name: string;
  email: string;
  plus_one_allowed: number;
  rsvp_status: string;
  attending: number | null;
  plus_one_attending: number;
  meal_preference: string | null;
  dietary_notes: string | null;
  responded_at: string | null;
}

interface Settings {
  invite_message_template: string;
}

const MEAL_LABELS: Record<string, string> = {
  no_preference: "No preference",
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  pescatarian: "Pescatarian",
};

export default function GuestsPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPlusOne, setNewPlusOne] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Guest>>({});
  const [message, setMessage] = useState("");
  const [inviteTemplate, setInviteTemplate] = useState("");
  const [editingTemplate, setEditingTemplate] = useState(false);
  const [tempTemplate, setTempTemplate] = useState("");
  const [copyStatus, setCopyStatus] = useState<{[key: number]: string}>({});
  const fileRef = useRef<HTMLInputElement>(null);

  function fetchGuests() {
    fetch("/api/admin/guests")
      .then((res) => res.json())
      .then((data) => {
        setGuests(data);
        setLoading(false);
      });
  }

  async function fetchInviteTemplate() {
    const res = await fetch("/api/admin/settings");
    const data = await res.json();
    const template = data.find((s: { key: string }) => s.key === "invite_message_template");
    const defaultTemplate = "You're invited to Chris & Candice's wedding! 💕\n\nPlease RSVP using your personal link:\n{url}";
    setInviteTemplate(template?.value || defaultTemplate);
  }

  async function saveInviteTemplate() {
    await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: "invite_message_template",
        value: tempTemplate,
      }),
    });
    setInviteTemplate(tempTemplate);
    setEditingTemplate(false);
    setMessage("Invite message template saved");
  }

  function getInviteMessage(guest: Guest): string {
    const url = `${baseUrl}/rsvp/${guest.token}`;
    return inviteTemplate.replace("{url}", url).replace("{name}", guest.name);
  }

  async function copyInviteMessage(guest: Guest) {
    const inviteMessage = getInviteMessage(guest);
    await navigator.clipboard.writeText(inviteMessage);
    setCopyStatus({ ...copyStatus, [guest.id]: "Copied!" });
    setTimeout(() => {
      setCopyStatus({ ...copyStatus, [guest.id]: "" });
    }, 2000);
  }

  useEffect(() => {
    fetchGuests();
    fetchInviteTemplate();
  }, []);

  async function addGuest(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/guests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        email: newEmail,
        plus_one_allowed: newPlusOne,
      }),
    });
    setNewName("");
    setNewEmail("");
    setNewPlusOne(false);
    setShowAdd(false);
    fetchGuests();
  }

  async function uploadCSV() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/admin/guests", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setMessage(`Imported ${data.imported} guests`);
    if (fileRef.current) fileRef.current.value = "";
    fetchGuests();
  }

  async function deleteGuest(id: number) {
    if (!confirm("Remove this guest?")) return;
    await fetch("/api/admin/guests", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchGuests();
  }

  async function saveEdit() {
    if (!editingId) return;
    await fetch("/api/admin/guests", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingId, ...editData }),
    });
    setEditingId(null);
    setEditData({});
    fetchGuests();
  }

  async function resendEmail(guestId: number) {
    setMessage("Sending...");
    const res = await fetch("/api/admin/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestIds: [guestId], templateSlug: "invitation" }),
    });
    const data = await res.json();
    setMessage(data.sent > 0 ? "Email sent" : "Failed to send");
  }

  const filtered = guests.filter((g) => {
    if (filter === "responded") return g.rsvp_status === "responded";
    if (filter === "pending") return g.rsvp_status === "pending";
    if (filter === "attending") return g.attending === 1;
    if (filter === "declined")
      return g.attending === 0 && g.rsvp_status === "responded";
    return true;
  });

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  if (loading) return <p className="text-gray-500">Loading guests...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Guest Management</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="px-3 py-1.5 bg-gray-800 text-white rounded text-sm hover:bg-gray-700"
          >
            Add Guest
          </button>
          <label className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 cursor-pointer">
            Upload CSV / Excel
            <input
              type="file"
              ref={fileRef}
              accept=".csv,.xlsx,.xls"
              onChange={uploadCSV}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {message && (
        <p className="text-sm text-blue-600 bg-blue-50 p-2 rounded">{message}</p>
      )}

      {/* Invite Message Template Editor */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-800">Invite Message Template</h2>
          {!editingTemplate && (
            <button
              onClick={() => {
                setTempTemplate(inviteTemplate);
                setEditingTemplate(true);
              }}
              className="px-3 py-1 bg-gray-800 text-white rounded text-sm hover:bg-gray-700"
            >
              Edit Template
            </button>
          )}
        </div>
        {editingTemplate ? (
          <div className="space-y-2">
            <textarea
              value={tempTemplate}
              onChange={(e) => setTempTemplate(e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono"
              placeholder="Use {url} for the personalized link and {name} for guest name"
            />
            <p className="text-xs text-gray-500">
              Use <code className="bg-gray-100 px-1 rounded">{"{url}"}</code> for the personalized RSVP link and <code className="bg-gray-100 px-1 rounded">{"{name}"}</code> for the guest's name
            </p>
            <div className="flex gap-2">
              <button
                onClick={saveInviteTemplate}
                className="px-3 py-1.5 bg-green-700 text-white rounded text-sm hover:bg-green-800"
              >
                Save Template
              </button>
              <button
                onClick={() => setEditingTemplate(false)}
                className="px-3 py-1.5 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded p-3 font-mono text-sm whitespace-pre-wrap text-gray-700">
            {inviteTemplate}
          </div>
        )}
      </div>

      {/* Add Guest Form */}
      {showAdd && (
        <form
          onSubmit={addGuest}
          className="bg-white rounded-lg shadow p-4 flex flex-wrap gap-3 items-end"
        >
          <div>
            <label className="block text-xs text-gray-500 mb-1">Name</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Email</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm"
            />
          </div>
          <label className="flex items-center gap-1.5 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={newPlusOne}
              onChange={(e) => setNewPlusOne(e.target.checked)}
            />
            Plus one
          </label>
          <button
            type="submit"
            className="px-3 py-1.5 bg-green-700 text-white rounded text-sm hover:bg-green-800"
          >
            Add
          </button>
        </form>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        {["all", "pending", "responded", "attending", "declined"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded text-sm capitalize ${
              filter === f
                ? "bg-gray-800 text-white"
                : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
            }`}
          >
            {f} ({f === "all"
              ? guests.length
              : guests.filter((g) => {
                  if (f === "responded") return g.rsvp_status === "responded";
                  if (f === "pending") return g.rsvp_status === "pending";
                  if (f === "attending") return g.attending === 1;
                  if (f === "declined") return g.attending === 0 && g.rsvp_status === "responded";
                  return true;
                }).length})
          </button>
        ))}
      </div>

      {/* Guest Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">RSVP URL</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Invite Message</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Attending</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">+1</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Meal</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Notes</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((g) => (
              <tr
                key={g.id}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                {editingId === g.id ? (
                  <>
                    <td className="px-4 py-2">
                      <input
                        value={editData.name ?? g.name}
                        onChange={(e) =>
                          setEditData({ ...editData, name: e.target.value })
                        }
                        className="border rounded px-1 py-0.5 text-sm w-full"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        value={editData.email ?? g.email}
                        onChange={(e) =>
                          setEditData({ ...editData, email: e.target.value })
                        }
                        className="border rounded px-1 py-0.5 text-sm w-full"
                      />
                    </td>
                    <td className="px-4 py-2" colSpan={5}>
                      <label className="flex items-center gap-1 text-sm">
                        <input
                          type="checkbox"
                          checked={
                            editData.plus_one_allowed !== undefined
                              ? !!editData.plus_one_allowed
                              : !!g.plus_one_allowed
                          }
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              plus_one_allowed: e.target.checked ? 1 : 0,
                            })
                          }
                        />
                        Plus one allowed
                      </label>
                    </td>
                    <td></td>
                    <td className="px-4 py-2">
                      <button
                        onClick={saveEdit}
                        className="text-green-700 hover:underline text-xs mr-2"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditData({});
                        }}
                        className="text-gray-500 hover:underline text-xs"
                      >
                        Cancel
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-2 font-medium text-gray-800">
                      {g.name}
                    </td>
                    <td className="px-4 py-2">
                      {g.email ? (
                        <span className="text-gray-600">{g.email}</span>
                      ) : (
                        <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded text-xs font-medium">
                          No email
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() =>
                          navigator.clipboard.writeText(
                            `${baseUrl}/rsvp/${g.token}`
                          )
                        }
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100 font-medium"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy URL
                      </button>
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => copyInviteMessage(g)}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-xs hover:bg-green-100 font-medium whitespace-nowrap"
                      >
                        {copyStatus[g.id] ? (
                          <>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {copyStatus[g.id]}
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy Message
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          g.rsvp_status === "responded"
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {g.rsvp_status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {g.attending === 1 ? "Yes" : g.attending === 0 ? "No" : "—"}
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {g.plus_one_allowed
                        ? g.plus_one_attending
                          ? "Yes"
                          : "Allowed"
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {g.meal_preference
                        ? MEAL_LABELS[g.meal_preference] || g.meal_preference
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-gray-600 max-w-[200px]">
                      {g.dietary_notes ? (
                        <span className="truncate block" title={g.dietary_notes}>
                          {g.dietary_notes}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-2 space-x-1">
                      <button
                        onClick={() => {
                          setEditingId(g.id);
                          setEditData({});
                        }}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => resendEmail(g.id)}
                        disabled={!g.email}
                        className="text-green-700 hover:underline text-xs disabled:text-gray-400 disabled:cursor-not-allowed disabled:no-underline"
                        title={!g.email ? "No email address" : "Send invitation email"}
                      >
                        Email
                      </button>
                      <button
                        onClick={() => deleteGuest(g.id)}
                        className="text-red-600 hover:underline text-xs"
                      >
                        Delete
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center text-gray-500 py-8">No guests found.</p>
        )}
      </div>
    </div>
  );
}
