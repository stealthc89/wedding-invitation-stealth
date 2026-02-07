"use client";

import { useEffect, useState } from "react";

interface Template {
  id: number;
  slug: string;
  name: string;
  subject: string;
  body_html: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/templates")
      .then((res) => res.json())
      .then(setTemplates);
  }, []);

  function startEdit(t: Template) {
    setEditingId(t.id);
    setSubject(t.subject);
    setBodyHtml(t.body_html);
  }

  async function saveTemplate() {
    if (!editingId) return;
    await fetch("/api/admin/templates", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingId, subject, body_html: bodyHtml }),
    });
    setMessage("Template saved");
    setEditingId(null);
    const res = await fetch("/api/admin/templates");
    setTemplates(await res.json());
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Email Templates</h1>
      <p className="text-sm text-gray-500">
        Available variables: {"{{guest_name}}"}, {"{{rsvp_link}}"},{" "}
        {"{{event_date}}"}, {"{{event_venue}}"}, {"{{itinerary_details}}"}
      </p>

      {message && (
        <p className="text-sm text-green-600 bg-green-50 p-2 rounded">
          {message}
        </p>
      )}

      <div className="space-y-4">
        {templates.map((t) => (
          <div key={t.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-semibold text-gray-800">{t.name}</h3>
                <p className="text-xs text-gray-400">slug: {t.slug}</p>
              </div>
              {editingId !== t.id && (
                <button
                  onClick={() => startEdit(t)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Edit
                </button>
              )}
            </div>

            {editingId === t.id ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Subject
                  </label>
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    HTML Body
                  </label>
                  <textarea
                    value={bodyHtml}
                    onChange={(e) => setBodyHtml(e.target.value)}
                    rows={12}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={saveTemplate}
                    className="px-3 py-1.5 bg-green-700 text-white rounded text-sm hover:bg-green-800"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600 mb-1">
                  <strong>Subject:</strong> {t.subject}
                </p>
                <details className="text-xs text-gray-400">
                  <summary className="cursor-pointer hover:text-gray-600">
                    Preview HTML
                  </summary>
                  <div
                    className="mt-2 border rounded p-3 bg-gray-50"
                    dangerouslySetInnerHTML={{ __html: t.body_html }}
                  />
                </details>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
