"use client";

import { useEffect, useState, useRef } from "react";

interface Guest {
  id: number;
  token: string;
  name: string;
  email: string;
  phone: string | null;
  plus_one_allowed: number;
  plus_one_names: string | null;
  plus_one_meal_preference: string | null;
  is_under_10: number;
  is_plus_one: number;
  linked_to_guest_id: number | null;
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

type SortField = "name" | "email" | "rsvp_status" | "attending" | "responded_at";
type SortDirection = "asc" | "desc";

export default function GuestsPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPlusOneCount, setNewPlusOneCount] = useState(0);
  const [newIsUnder10, setNewIsUnder10] = useState(false);
  const [newIsPlusOne, setNewIsPlusOne] = useState(false);
  const [newLinkedToGuestId, setNewLinkedToGuestId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Guest>>({});
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info");
  const [inviteTemplate, setInviteTemplate] = useState("");
  const [editingTemplate, setEditingTemplate] = useState(false);
  const [tempTemplate, setTempTemplate] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [showRestore, setShowRestore] = useState(false);
  const [restorePreview, setRestorePreview] = useState<Guest[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const restoreFileRef = useRef<HTMLInputElement>(null);
  const messageTimerRef = useRef<NodeJS.Timeout | null>(null);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  // Helper to show toast notifications with auto-dismiss
  function showToast(msg: string, type: "success" | "error" | "info" = "info", duration = 3000) {
    setMessage(msg);
    setMessageType(type);
    if (messageTimerRef.current) {
      clearTimeout(messageTimerRef.current);
    }
    if (duration > 0) {
      messageTimerRef.current = setTimeout(() => {
        setMessage("");
      }, duration);
    }
  }

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
    const defaultTemplate = "You're invited to Chris & Candice's wedding! 💕\n\nPlease RSVP using your personal link:\n{url}";
    setInviteTemplate(data.invite_message_template || defaultTemplate);
  }

  async function saveInviteTemplate() {
    try {
      await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invite_message_template: tempTemplate,
        }),
      });
      setInviteTemplate(tempTemplate);
      setEditingTemplate(false);
      showToast("✓ Invite message template saved", "success");
    } catch (error) {
      showToast("✗ Failed to save template", "error");
    }
  }

  function getInviteMessage(guest: Guest): string {
    const url = `${baseUrl}/rsvp/${guest.token}`;
    return inviteTemplate.replace("{url}", url).replace("{name}", guest.name);
  }

  async function copyInviteMessage(guest: Guest) {
    try {
      const inviteMessage = getInviteMessage(guest);
      await navigator.clipboard.writeText(inviteMessage);
      showToast("✓ Invite message copied to clipboard", "success", 2000);
    } catch (error) {
      showToast("✗ Failed to copy message", "error");
    }
  }

  async function copyRsvpUrl(guest: Guest) {
    try {
      await navigator.clipboard.writeText(`${baseUrl}/rsvp/${guest.token}`);
      showToast("✓ RSVP URL copied to clipboard", "success", 2000);
    } catch (error) {
      showToast("✗ Failed to copy URL", "error");
    }
  }

  useEffect(() => {
    fetchGuests();
    fetchInviteTemplate();

    // Cleanup timer on unmount
    return () => {
      if (messageTimerRef.current) {
        clearTimeout(messageTimerRef.current);
      }
    };
  }, []);

  async function addGuest(e: React.FormEvent) {
    e.preventDefault();

    // Validate: if is_plus_one is checked, linked_to_guest_id must be selected
    if (newIsPlusOne && !newLinkedToGuestId) {
      showToast("✗ Please select which primary guest this plus-one is linked to", "error");
      return;
    }

    try {
      const res = await fetch("/api/admin/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          phone: newPhone,
          plus_one_allowed: newPlusOneCount,
          is_under_10: newIsUnder10,
          is_plus_one: newIsPlusOne,
          linked_to_guest_id: newLinkedToGuestId,
        }),
      });
      if (res.ok) {
        setNewName("");
        setNewEmail("");
        setNewPhone("");
        setNewPlusOneCount(0);
        setNewIsUnder10(false);
        setNewIsPlusOne(false);
        setNewLinkedToGuestId(null);
        setShowAdd(false);
        showToast(`✓ Guest "${newName}" added successfully`, "success");
        fetchGuests();
      } else {
        showToast("✗ Failed to add guest", "error");
      }
    } catch (error) {
      showToast("✗ Failed to add guest", "error");
    }
  }

  async function uploadCSV() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/guests", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`✓ Imported ${data.imported} guest${data.imported !== 1 ? "s" : ""} successfully`, "success");
        if (fileRef.current) fileRef.current.value = "";
        fetchGuests();
      } else {
        showToast(`✗ Failed to import: ${data.error || "Unknown error"}`, "error");
      }
    } catch (error) {
      showToast("✗ Failed to upload CSV file", "error");
    }
  }

  async function deleteGuest(id: number) {
    const guest = guests.find((g) => g.id === id);
    if (!confirm(`Remove guest "${guest?.name}"?`)) return;

    try {
      const res = await fetch("/api/admin/guests", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        showToast(`✓ Guest "${guest?.name}" deleted`, "success");
        fetchGuests();
      } else {
        showToast("✗ Failed to delete guest", "error");
      }
    } catch (error) {
      showToast("✗ Failed to delete guest", "error");
    }
  }

  async function saveEdit() {
    if (!editingId) return;

    try {
      const res = await fetch("/api/admin/guests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, ...editData }),
      });
      if (res.ok) {
        showToast("✓ Guest updated successfully", "success");
        setEditingId(null);
        setEditData({});
        fetchGuests();
      } else {
        showToast("✗ Failed to update guest", "error");
      }
    } catch (error) {
      showToast("✗ Failed to update guest", "error");
    }
  }

  async function resendEmail(guestId: number) {
    const guest = guests.find((g) => g.id === guestId);
    showToast("📧 Sending email...", "info", 0);

    try {
      const res = await fetch("/api/admin/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestIds: [guestId], templateSlug: "invitation" }),
      });
      const data = await res.json();
      if (data.sent > 0) {
        showToast(`✓ Email sent to ${guest?.name}`, "success");
      } else {
        showToast(`✗ Failed to send email to ${guest?.name}`, "error");
      }
    } catch (error) {
      showToast("✗ Failed to send email", "error");
    }
  }

  async function resetRSVP(guestId: number) {
    const guest = guests.find((g) => g.id === guestId);
    if (!confirm(`Reset RSVP for "${guest?.name}"? This will clear their response and allow them to RSVP again.`)) return;

    showToast("🔄 Resetting RSVP...", "info", 0);

    try {
      const res = await fetch(`/api/admin/guests/${guestId}/reset-rsvp`, {
        method: "POST",
      });
      if (res.ok) {
        showToast(`✓ RSVP reset for ${guest?.name} - they can now resubmit`, "success");
        fetchGuests();
      } else {
        showToast(`✗ Failed to reset RSVP for ${guest?.name}`, "error");
      }
    } catch (error) {
      showToast("✗ Failed to reset RSVP", "error");
    }
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((g) => g.id)));
    }
  }

  function toggleSelect(id: number) {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  }

  async function bulkDelete() {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected guest(s)?`)) return;

    showToast(`🗑️ Deleting ${selectedIds.size} guest(s)...`, "info", 0);

    try {
      let deleted = 0;
      for (const id of selectedIds) {
        const res = await fetch("/api/admin/guests", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        if (res.ok) deleted++;
      }
      setSelectedIds(new Set());
      showToast(`✓ Deleted ${deleted} guest${deleted !== 1 ? "s" : ""} successfully`, "success");
      fetchGuests();
    } catch (error) {
      showToast("✗ Failed to delete guests", "error");
    }
  }

  async function bulkEmail() {
    if (selectedIds.size === 0) return;

    showToast(`📧 Sending emails to ${selectedIds.size} guest(s)...`, "info", 0);

    try {
      const res = await fetch("/api/admin/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestIds: Array.from(selectedIds), templateSlug: "invitation" }),
      });
      const data = await res.json();
      if (data.sent > 0) {
        showToast(`✓ Sent ${data.sent} email${data.sent !== 1 ? "s" : ""} successfully${data.failed > 0 ? ` (${data.failed} failed)` : ""}`, data.failed > 0 ? "info" : "success");
      } else {
        showToast(`✗ Failed to send emails`, "error");
      }
      setSelectedIds(new Set());
    } catch (error) {
      showToast("✗ Failed to send emails", "error");
    }
  }

  function exportSelectedCSV() {
    if (selectedIds.size === 0) return;
    const selected = filtered.filter((g) => selectedIds.has(g.id));
    exportGuestsToCSV(selected, "guests-selected");
    showToast(`✓ Exported ${selected.length} guest${selected.length !== 1 ? "s" : ""} to CSV`, "success");
  }

  function exportAllCSV() {
    exportGuestsToCSV(guests, "guests-all");
    showToast(`✓ Exported ${guests.length} guest${guests.length !== 1 ? "s" : ""} to CSV`, "success");
  }

  function downloadTemplate() {
    const csv = [
      ["Name", "Email", "Phone", "Plus One Allowed"].join(","),
      ['"John Doe"', '"john@example.com"', '"+44 7700 900000"', '1'].join(","),
      ['"Jane Smith"', '"jane@example.com"', '"+44 7700 900001"', '2'].join(","),
      ['"Mike Johnson"', '"mike@example.com"', '""', '0'].join(","),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "guest-list-template.csv";
    a.click();
    URL.revokeObjectURL(url);
    showToast("✓ Template downloaded", "success");
  }

  function exportGuestsToCSV(guestList: Guest[], filename: string) {
    const csv = [
      ["Name", "Email", "Phone", "Plus One Allowed", "Plus One Names", "Is Under 10", "Is Plus One", "Linked To Guest", "RSVP Status", "Attending", "Plus One Attending", "Meal", "Dietary Notes"].join(","),
      ...guestList.map((g) => {
        // Find the linked guest name if this is a plus-one
        const linkedGuest = g.linked_to_guest_id ? guests.find(guest => guest.id === g.linked_to_guest_id) : null;
        return [
          `"${g.name}"`,
          `"${g.email || ""}"`,
          `"${g.phone || ""}"`,
          g.plus_one_allowed,
          `"${(g.plus_one_names || "").replace(/"/g, '""')}"`,
          g.is_under_10,
          g.is_plus_one || 0,
          `"${linkedGuest ? linkedGuest.name : ""}"`,
          g.rsvp_status,
          g.attending === 1 ? "Yes" : g.attending === 0 ? "No" : "",
          g.plus_one_attending,
          g.meal_preference || "",
          `"${(g.dietary_notes || "").replace(/"/g, '""')}"`,
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    exportGuestsToCSV(guests, `backup-${timestamp}`);
    showToast(`✓ Backup created: backup-${timestamp}.csv`, "success");
  }

  async function handleRestoreFile() {
    const file = restoreFileRef.current?.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length < 2) {
        showToast("✗ Invalid backup file - no data found", "error");
        return;
      }

      // Parse CSV (skip header)
      const rows = lines.slice(1).map(line => {
        const values = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g)?.map(v => v.replace(/^"|"$/g, "").trim()) || [];
        return {
          name: values[0] || "",
          email: values[1] || "",
          phone: values[2] || "",
          plus_one_allowed: parseInt(values[3]) || 0,
          is_under_10: parseInt(values[5]) || 0,
          is_plus_one: parseInt(values[6]) || 0,
        };
      }).filter(r => r.name);

      setRestorePreview(rows as any);
      setShowRestore(true);
    } catch (error) {
      showToast("✗ Failed to read backup file", "error");
      console.error(error);
    }
  }

  async function confirmRestore() {
    if (!confirm(`⚠️ WARNING: This will DELETE all ${guests.length} current guests and restore ${restorePreview.length} guests from backup.\n\nThis action CANNOT be undone. Continue?`)) {
      return;
    }

    showToast(`🔄 Restoring backup...`, "info", 0);
    setShowRestore(false);

    try {
      // Delete all existing guests
      for (const guest of guests) {
        await fetch("/api/admin/guests", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: guest.id }),
        });
      }

      // Add guests from backup
      let imported = 0;
      for (const guest of restorePreview) {
        try {
          await fetch("/api/admin/guests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(guest),
          });
          imported++;
        } catch (error) {
          console.error("Failed to restore guest:", guest.name, error);
        }
      }

      showToast(`✓ Backup restored: ${imported} guest${imported !== 1 ? "s" : ""} imported`, "success");
      setRestorePreview([]);
      if (restoreFileRef.current) restoreFileRef.current.value = "";
      fetchGuests();
    } catch (error) {
      showToast("✗ Failed to restore backup", "error");
    }
  }

  const filtered = guests
    .filter((g) => {
      // Status filters like responded/pending/declined only apply to primary guests
      if (filter === "responded") return g.rsvp_status === "responded" && (g.is_plus_one === 0 || !g.is_plus_one);
      if (filter === "pending") return g.rsvp_status === "pending" && (g.is_plus_one === 0 || !g.is_plus_one);
      // Attending includes both primary guests and companion guests
      if (filter === "attending") return g.attending === 1;
      if (filter === "declined")
        return g.attending === 0 && g.rsvp_status === "responded" && (g.is_plus_one === 0 || !g.is_plus_one);
      if (filter === "plus_ones") return g.is_plus_one === 1;
      if (filter === "primary_guests") return g.is_plus_one === 0 || !g.is_plus_one;
      return true;
    })
    .sort((a, b) => {
      let aVal: string | number | null = a[sortField];
      let bVal: string | number | null = b[sortField];

      // Handle null values
      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;

      // String comparison
      if (typeof aVal === "string" && typeof bVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

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
          <button
            onClick={downloadTemplate}
            className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
          >
            Download Template
          </button>
          <label className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 cursor-pointer">
            Upload CSV
            <input
              type="file"
              ref={fileRef}
              accept=".csv,.xlsx,.xls"
              onChange={uploadCSV}
              className="hidden"
            />
          </label>
          <button
            onClick={exportAllCSV}
            className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
          >
            Download All CSV
          </button>
          <button
            onClick={createBackup}
            className="px-3 py-1.5 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
          >
            Create Backup
          </button>
          <label className="px-3 py-1.5 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 cursor-pointer">
            Restore Backup
            <input
              type="file"
              ref={restoreFileRef}
              accept=".csv"
              onChange={handleRestoreFile}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {message && (
        <div
          className={`text-sm p-3 rounded-lg border flex items-center gap-2 shadow-sm ${
            messageType === "success"
              ? "bg-green-50 text-green-800 border-green-200"
              : messageType === "error"
              ? "bg-red-50 text-red-800 border-red-200"
              : "bg-blue-50 text-blue-800 border-blue-200"
          }`}
        >
          <span className="font-medium">{message}</span>
          <button
            onClick={() => setMessage("")}
            className="ml-auto text-current opacity-60 hover:opacity-100"
            title="Dismiss"
          >
            ✕
          </button>
        </div>
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
          <pre className="bg-gray-50 rounded p-3 font-mono text-sm whitespace-pre-wrap text-gray-700 overflow-x-auto">
            {inviteTemplate}
          </pre>
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
          <div>
            <label className="block text-xs text-gray-500 mb-1">Phone</label>
            <input
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm"
              placeholder="+1 234 567 8900"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Extra Guests</label>
            <input
              type="number"
              min="0"
              max="10"
              value={newPlusOneCount}
              onChange={(e) => setNewPlusOneCount(parseInt(e.target.value) || 0)}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm w-20"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="checkbox"
              id="newIsUnder10"
              checked={newIsUnder10}
              onChange={(e) => setNewIsUnder10(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="newIsUnder10" className="text-xs text-gray-600 cursor-pointer">
              Guest is under 10
            </label>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="checkbox"
              id="newIsPlusOne"
              checked={newIsPlusOne}
              onChange={(e) => {
                setNewIsPlusOne(e.target.checked);
                if (!e.target.checked) {
                  setNewLinkedToGuestId(null);
                }
              }}
              className="w-4 h-4"
            />
            <label htmlFor="newIsPlusOne" className="text-xs text-gray-600 cursor-pointer">
              Is a plus-one
            </label>
          </div>
          {newIsPlusOne && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Linked to primary guest <span className="text-red-500">*</span>
              </label>
              <select
                value={newLinkedToGuestId || ""}
                onChange={(e) => setNewLinkedToGuestId(e.target.value ? parseInt(e.target.value) : null)}
                className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full"
                required
              >
                <option value="">Select primary guest...</option>
                {guests
                  .filter((g) => !g.is_plus_one)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
              </select>
            </div>
          )}
          <button
            type="submit"
            className="px-3 py-1.5 bg-green-700 text-white rounded text-sm hover:bg-green-800"
          >
            Add
          </button>
        </form>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {["all", "primary_guests", "plus_ones", "pending", "responded", "attending", "declined"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded text-sm ${
              filter === f
                ? "bg-gray-800 text-white"
                : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
            }`}
          >
            {f === "primary_guests" ? "Primary Guests" : f === "plus_ones" ? "Plus Ones" : f.charAt(0).toUpperCase() + f.slice(1)} ({f === "all"
              ? guests.length
              : guests.filter((g) => {
                  // Status filters like responded/pending/declined only count primary guests
                  if (f === "responded") return g.rsvp_status === "responded" && (g.is_plus_one === 0 || !g.is_plus_one);
                  if (f === "pending") return g.rsvp_status === "pending" && (g.is_plus_one === 0 || !g.is_plus_one);
                  // Attending includes both primary guests and companion guests
                  if (f === "attending") return g.attending === 1;
                  if (f === "declined") return g.attending === 0 && g.rsvp_status === "responded" && (g.is_plus_one === 0 || !g.is_plus_one);
                  if (f === "plus_ones") return g.is_plus_one === 1;
                  if (f === "primary_guests") return g.is_plus_one === 0 || !g.is_plus_one;
                  return true;
                }).length})
          </button>
        ))}
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3">
          <span className="text-sm text-blue-900 font-medium">
            {selectedIds.size} guest{selectedIds.size > 1 ? "s" : ""} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={bulkEmail}
              className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
            >
              Send Invites
            </button>
            <button
              onClick={exportSelectedCSV}
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              Export CSV
            </button>
            <button
              onClick={bulkDelete}
              className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              Delete
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Restore Backup Confirmation */}
      {showRestore && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg mx-4 shadow-xl">
            <h2 className="text-xl font-bold text-gray-800 mb-4">⚠️ Confirm Backup Restore</h2>
            <div className="space-y-3 mb-6">
              <p className="text-gray-700">
                This will <strong className="text-red-600">DELETE</strong> all <strong>{guests.length} current guests</strong> and restore <strong className="text-green-600">{restorePreview.length} guests</strong> from the backup file.
              </p>
              <div className="bg-orange-50 border border-orange-200 rounded p-3">
                <p className="text-sm text-orange-800 font-medium">
                  ⚠️ This action CANNOT be undone!
                </p>
                <p className="text-xs text-orange-700 mt-1">
                  Make sure you have a recent backup before proceeding.
                </p>
              </div>
              <div className="bg-gray-50 rounded p-3">
                <p className="text-sm font-medium text-gray-700 mb-2">Preview (first 5 guests):</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  {restorePreview.slice(0, 5).map((g, i) => (
                    <li key={i}>• {g.name} {g.email && `(${g.email})`}</li>
                  ))}
                  {restorePreview.length > 5 && (
                    <li className="text-gray-500">... and {restorePreview.length - 5} more</li>
                  )}
                </ul>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={confirmRestore}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded font-medium hover:bg-red-700"
              >
                Yes, Restore Backup
              </button>
              <button
                onClick={() => {
                  setShowRestore(false);
                  setRestorePreview([]);
                  if (restoreFileRef.current) restoreFileRef.current.value = "";
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded font-medium hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guest Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedIds.size === filtered.length && filtered.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 cursor-pointer"
                />
              </th>
              <th
                className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => toggleSort("name")}
              >
                <div className="flex items-center gap-1">
                  Name
                  {sortField === "name" && (
                    <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                  )}
                </div>
              </th>
              <th
                className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => toggleSort("email")}
              >
                <div className="flex items-center gap-1">
                  Email
                  {sortField === "email" && (
                    <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                  )}
                </div>
              </th>
              <th className="text-left px-2 py-3 font-medium text-gray-600 text-xs">Phone</th>
              <th
                className="text-left px-2 py-3 font-medium text-gray-600 cursor-pointer hover:bg-gray-100 select-none text-xs"
                onClick={() => toggleSort("rsvp_status")}
              >
                <div className="flex items-center gap-1">
                  Status
                  {sortField === "rsvp_status" && (
                    <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                  )}
                </div>
              </th>
              <th
                className="text-left px-2 py-3 font-medium text-gray-600 cursor-pointer hover:bg-gray-100 select-none text-xs"
                onClick={() => toggleSort("attending")}
              >
                <div className="flex items-center gap-1">
                  Attending
                  {sortField === "attending" && (
                    <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                  )}
                </div>
              </th>
              <th className="text-left px-2 py-3 font-medium text-gray-600 text-xs">+1</th>
              <th className="text-left px-2 py-3 font-medium text-gray-600 text-xs">Names</th>
              <th className="text-left px-2 py-3 font-medium text-gray-600 text-xs">Meal</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((g) => (
              <tr
                key={g.id}
                className={`border-b border-gray-100 hover:bg-gray-50 ${selectedIds.has(g.id) ? "bg-blue-50" : ""}`}
              >
                {editingId === g.id ? (
                  <>
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(g.id)}
                        onChange={() => toggleSelect(g.id)}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </td>
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
                    <td className="px-2 py-2">
                      <input
                        type="tel"
                        value={editData.phone ?? g.phone ?? ""}
                        onChange={(e) =>
                          setEditData({ ...editData, phone: e.target.value })
                        }
                        className="border rounded px-1 py-0.5 text-xs w-full"
                        placeholder="Phone"
                      />
                    </td>
                    <td className="px-2 py-2" colSpan={5}>
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-600">Extra guests:</label>
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={
                              editData.plus_one_allowed !== undefined
                                ? editData.plus_one_allowed
                                : g.plus_one_allowed
                            }
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                plus_one_allowed: parseInt(e.target.value) || 0,
                              })
                            }
                            className="border border-gray-300 rounded px-2 py-1 text-xs w-16"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-600">Child:</label>
                          <input
                            type="checkbox"
                            checked={editData.is_under_10 !== undefined ? editData.is_under_10 === 1 : g.is_under_10 === 1}
                            onChange={(e) =>
                              setEditData({ ...editData, is_under_10: e.target.checked ? 1 : 0 })
                            }
                            className="w-4 h-4"
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2">
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
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(g.id)}
                        onChange={() => toggleSelect(g.id)}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </td>
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
                    <td className="px-2 py-2 text-gray-600 text-xs">
                      <div className="max-w-[120px] truncate" title={g.phone || ""}>
                        {g.phone || "—"}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      {g.is_plus_one === 1 ? (
                        <span className="text-gray-400 text-xs">—</span>
                      ) : (
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            g.rsvp_status === "responded"
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {g.rsvp_status}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-gray-600 text-xs">
                      {g.attending === 1 ? "Yes" : g.attending === 0 ? "No" : "—"}
                    </td>
                    <td className="px-2 py-2 text-gray-600 text-xs">
                      {g.plus_one_allowed > 0
                        ? `${g.plus_one_attending}/${g.plus_one_allowed}`
                        : "—"}
                    </td>
                    <td className="px-2 py-2 text-gray-600 text-xs max-w-[150px]">
                      {g.plus_one_names ? (
                        <span className="truncate block" title={g.plus_one_names}>
                          {g.plus_one_names}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-2 py-2 text-gray-600 text-xs">
                      {g.meal_preference ? (
                        <div>
                          <div>{MEAL_LABELS[g.meal_preference] || g.meal_preference}</div>
                          {g.plus_one_meal_preference && (() => {
                            try {
                              const prefs = JSON.parse(g.plus_one_meal_preference);
                              if (Array.isArray(prefs) && prefs.length > 0) {
                                return (
                                  <div className="text-xs text-gray-500 mt-1">
                                    +{prefs.length}: {prefs.map((p: string) => MEAL_LABELS[p] || p).join(", ")}
                                  </div>
                                );
                              }
                            } catch (e) {
                              return null;
                            }
                            return null;
                          })()}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap gap-1">
                        <button
                          onClick={() => copyRsvpUrl(g)}
                          className="text-blue-600 hover:underline text-xs"
                          title="Copy RSVP URL"
                        >
                          URL
                        </button>
                        <button
                          onClick={() => copyInviteMessage(g)}
                          className="text-blue-600 hover:underline text-xs"
                          title="Copy invite message"
                        >
                          Msg
                        </button>
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
                        {g.rsvp_status === "responded" && (
                          <button
                            onClick={() => resetRSVP(g.id)}
                            className="text-orange-600 hover:underline text-xs"
                            title="Reset RSVP to allow guest to resubmit"
                          >
                            Reset
                          </button>
                        )}
                        <button
                          onClick={() => deleteGuest(g.id)}
                          className="text-red-600 hover:underline text-xs"
                        >
                          Del
                        </button>
                      </div>
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
