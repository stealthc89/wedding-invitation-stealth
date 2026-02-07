"use client";

import { useState } from "react";

export default function MediaPage() {
  const [message, setMessage] = useState("");

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/media", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`Uploaded: ${data.filename} — Use path: /media/${data.filename}`);
      } else {
        setMessage("Upload failed: " + (data.error || "Unknown error"));
      }
    } catch {
      setMessage("Upload failed");
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Media Management</h1>
      <p className="text-sm text-gray-500">
        Upload background images or videos for the wedding site. Files are
        stored in the <code>public/media</code> directory.
      </p>

      {message && (
        <p className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
          {message}
        </p>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Upload media file</span>
          <input
            type="file"
            accept="image/*,video/*"
            onChange={handleUpload}
            className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-gray-800 file:text-white hover:file:bg-gray-700"
          />
        </label>
        <p className="mt-3 text-xs text-gray-400">
          Supported: JPEG, PNG, WebP, MP4, WebM. Max recommended size: 10 MB.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">
          Using media on the guest page
        </h2>
        <p className="text-sm text-gray-600">
          To set a background image, go to{" "}
          <strong>Settings</strong> and set the <code>background_image</code>{" "}
          key to the media path (e.g., <code>/media/background.jpg</code>).
          The guest RSVP page will use it automatically.
        </p>
      </div>
    </div>
  );
}
