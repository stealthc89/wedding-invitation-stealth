"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ManageMenuPage() {
  const router = useRouter();
  const [menuUrl, setMenuUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  function loadMenu() {
    fetch("/api/admin/menu")
      .then((r) => r.json())
      .then((d) => setMenuUrl(d.url));
  }

  useEffect(() => { loadMenu(); }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage("");
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/admin/menu", { method: "POST", body: form });
    const data = await res.json();
    if (res.ok) {
      setMessage("✅ Menu uploaded successfully");
      setMenuUrl(data.url);
    } else {
      setMessage(`❌ ${data.error}`);
    }
    setUploading(false);
    e.target.value = "";
  }

  async function handleDelete() {
    if (!confirm("Remove the current menu?")) return;
    await fetch("/api/admin/menu", { method: "DELETE" });
    setMenuUrl(null);
    setMessage("✅ Menu removed");
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.push("/manage")} className="text-gray-500 hover:text-gray-700 text-sm">← Back</button>
          <h1 className="text-2xl font-bold text-gray-800">Wedding Menu</h1>
        </div>

        {message && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">{message}</div>
        )}

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-800 mb-1">Upload Menu</h2>
          <p className="text-xs text-gray-500 mb-4">
            Upload a PDF (1 page) or image (PNG/JPG). The PDF will be automatically converted to an image for guests.
          </p>
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleUpload}
            disabled={uploading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
          />
          {uploading && (
            <p className="text-sm text-gray-500 mt-2 flex items-center gap-2">
              <span className="animate-spin">⏳</span> Converting and uploading...
            </p>
          )}
          <div className="flex gap-3 mt-4">
            <a
              href="/menu"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Preview guest view →
            </a>
            {menuUrl && (
              <button
                onClick={handleDelete}
                className="text-sm px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
              >
                Remove menu
              </button>
            )}
          </div>
        </div>

        {menuUrl && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold text-gray-800 mb-3">Current Menu</h2>
            <img src={menuUrl} alt="Current menu" className="w-full h-auto rounded-lg border border-gray-200" />
          </div>
        )}

        {!menuUrl && (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-400 text-sm">
            No menu uploaded yet
          </div>
        )}
      </div>
    </div>
  );
}
