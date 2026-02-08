"use client";

import { useState, useRef } from "react";

export default function UploadPage() {
  const [name, setName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [fileCount, setFileCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileCount(e.target.files?.length || 0);
    setResult(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const files = fileRef.current?.files;
    if (!files || files.length === 0 || !name.trim()) return;

    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("name", name.trim());
    for (let i = 0; i < files.length; i++) {
      formData.append("photos", files[i]);
    }

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        setResult({ success: true, message: data.message });
        setName("");
        setFileCount(0);
        if (fileRef.current) fileRef.current.value = "";
      } else {
        setResult({ success: false, message: data.error });
      }
    } catch {
      setResult({ success: false, message: "Upload failed. Please try again." });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-sm uppercase tracking-[0.3em] text-white/50 mb-2">
            Chris & Candice
          </p>
          <h1 className="text-3xl font-light text-white mb-2">Share Your Photos</h1>
          <p className="text-white/60 text-sm">
            Capture the moments and upload them here!
          </p>
        </div>

        {/* Success State */}
        {result?.success ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-xl">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Thanks!</h2>
            <p className="text-gray-600 mb-6">{result.message}</p>
            <button
              onClick={() => setResult(null)}
              className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Upload More
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-xl space-y-5">
            {/* Error */}
            {result && !result.success && (
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{result.message}</p>
            )}

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name (as used in RSVP)"
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:border-gray-800 focus:outline-none transition-colors"
              />
            </div>

            {/* Photos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Photos
              </label>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors bg-gray-50">
                <div className="text-center">
                  <p className="text-2xl mb-1">📷</p>
                  <p className="text-sm text-gray-600">
                    {fileCount > 0
                      ? `${fileCount} photo${fileCount > 1 ? "s" : ""} selected`
                      : "Tap to select photos"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP, HEIC — max 10 MB each</p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  required
                />
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={uploading || !name.trim() || fileCount === 0}
              className="w-full py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-all text-sm font-medium"
            >
              {uploading ? "Uploading..." : `Upload ${fileCount > 0 ? fileCount + " " : ""}Photo${fileCount !== 1 ? "s" : ""}`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
