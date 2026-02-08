"use client";

import { useState, useEffect } from "react";

interface Photo {
  id: number;
  guest_name: string;
  filename: string;
  file_size: number;
  matched_guest_id: number | null;
  uploaded_at: string;
}

interface GuestCount {
  guest_name: string;
  count: number;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [guestNames, setGuestNames] = useState<GuestCount[]>([]);
  const [filter, setFilter] = useState("");
  const [message, setMessage] = useState("");

  function fetchPhotos(guest?: string) {
    const url = guest
      ? `/api/admin/photos?guest=${encodeURIComponent(guest)}`
      : "/api/admin/photos";
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setPhotos(data.photos || []);
        setGuestNames(data.guestNames || []);
      });
  }

  useEffect(() => {
    fetchPhotos();
  }, []);

  function applyFilter(guest: string) {
    setFilter(guest);
    if (guest) {
      fetchPhotos(guest);
    } else {
      fetchPhotos();
    }
  }

  async function deletePhoto(id: number) {
    if (!confirm("Delete this photo?")) return;
    await fetch("/api/admin/photos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setMessage("Photo deleted");
    fetchPhotos(filter || undefined);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Guest Photos</h1>
          <p className="text-sm text-gray-500 mt-1">
            {photos.length} photo{photos.length !== 1 ? "s" : ""} uploaded
            {filter && ` by "${filter}"`}
          </p>
        </div>
        <a
          href="/api/admin/photos?zip=all"
          className="px-4 py-2 bg-gray-800 text-white rounded text-sm hover:bg-gray-700"
        >
          Download All (ZIP)
        </a>
      </div>

      {message && (
        <p className="text-sm text-blue-600 bg-blue-50 p-2 rounded">{message}</p>
      )}

      {/* Filter by guest */}
      {guestNames.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => applyFilter("")}
            className={`px-3 py-1 rounded text-sm ${
              !filter
                ? "bg-gray-800 text-white"
                : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
            }`}
          >
            All ({guestNames.reduce((s, g) => s + g.count, 0)})
          </button>
          {guestNames.map((g) => (
            <button
              key={g.guest_name}
              onClick={() => applyFilter(g.guest_name)}
              className={`px-3 py-1 rounded text-sm ${
                filter === g.guest_name
                  ? "bg-gray-800 text-white"
                  : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              {g.guest_name} ({g.count})
            </button>
          ))}
        </div>
      )}

      {/* Photo Grid */}
      {photos.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-400 text-lg mb-2">No photos uploaded yet</p>
          <p className="text-gray-400 text-sm">
            Guests will upload photos via the QR code at the venue.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="bg-white rounded-lg shadow overflow-hidden group"
            >
              <div className="aspect-square bg-gray-100 relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/admin/photos?download=${encodeURIComponent(photo.filename)}`}
                  alt={`Photo by ${photo.guest_name}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <a
                    href={`/api/admin/photos?download=${encodeURIComponent(photo.filename)}`}
                    className="px-3 py-1.5 bg-white text-gray-800 rounded text-sm hover:bg-gray-100"
                  >
                    Download
                  </a>
                  <button
                    onClick={() => deletePhoto(photo.id)}
                    className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {photo.guest_name}
                  {photo.matched_guest_id && (
                    <span className="ml-1 text-[10px] px-1.5 py-0.5 bg-green-100 text-green-600 rounded font-medium">
                      matched
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatSize(photo.file_size)} &middot;{" "}
                  {new Date(photo.uploaded_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
