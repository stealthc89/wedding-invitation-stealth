"use client";

import { useState, useEffect } from "react";

interface MediaFile {
  name: string;
  path: string;
  size: number;
  modified: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isVideo(name: string): boolean {
  return /\.(mp4|webm)$/i.test(name);
}

export default function MediaPage() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  function fetchFiles() {
    fetch("/api/admin/media")
      .then((res) => res.json())
      .then((data) => setFiles(data))
      .catch(() => setMessage("Failed to load files"));
  }

  useEffect(() => {
    fetchFiles();
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setUploading(true);
    setMessage("");
    let uploaded = 0;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/admin/media", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.success) {
          uploaded++;
        } else {
          setMessage(`Failed to upload ${file.name}: ${data.error}`);
        }
      } catch {
        setMessage(`Failed to upload ${file.name}`);
      }
    }

    if (uploaded > 0) {
      setMessage(`Uploaded ${uploaded} file${uploaded > 1 ? "s" : ""} successfully`);
    }

    setUploading(false);
    e.target.value = "";
    fetchFiles();
  }

  async function handleDelete(filename: string) {
    if (!confirm(`Delete ${filename}?`)) return;

    try {
      const res = await fetch("/api/admin/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`Deleted ${filename}`);
        fetchFiles();
      } else {
        setMessage(`Failed to delete: ${data.error}`);
      }
    } catch {
      setMessage("Delete failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Media Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Upload background images and videos for the wedding site slideshow.
          </p>
        </div>
        <label
          className={`px-4 py-2 rounded text-sm font-medium cursor-pointer ${
            uploading
              ? "bg-gray-400 text-white"
              : "bg-gray-800 text-white hover:bg-gray-700"
          }`}
        >
          {uploading ? "Uploading..." : "Upload Files"}
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {message && (
        <p className="text-sm text-blue-600 bg-blue-50 p-3 rounded">{message}</p>
      )}

      {/* Instructions */}
      <div className="bg-white rounded-lg shadow p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">How media works</h2>
        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
          <li>
            Files are saved to <code className="bg-gray-100 px-1 rounded">public/media/</code> and served at <code className="bg-gray-100 px-1 rounded">/media/filename.jpg</code>
          </li>
          <li>
            The slideshow on the home and RSVP pages cycles through the photos listed in <code className="bg-gray-100 px-1 rounded">src/components/PhotoSlideshow.tsx</code>
          </li>
          <li>
            To add photos to the slideshow, upload them here and update the <code className="bg-gray-100 px-1 rounded">DEFAULT_PHOTOS</code> array in that file
          </li>
          <li>Supported formats: JPEG, PNG, WebP, GIF, MP4, WebM</li>
          <li>Recommended: landscape orientation, 1920x1280+, under 2 MB per file</li>
        </ul>
      </div>

      {/* File Gallery */}
      {files.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-400 text-lg mb-2">No media files yet</p>
          <p className="text-gray-400 text-sm">
            Upload photos and videos using the button above, or add them to{" "}
            <code className="bg-gray-100 px-1 rounded">public/media/</code> in the repo.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {files.map((file) => (
            <div
              key={file.name}
              className="bg-white rounded-lg shadow overflow-hidden group"
            >
              {/* Preview */}
              <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                {isVideo(file.name) ? (
                  <video
                    src={file.path}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                    onMouseLeave={(e) => {
                      const v = e.target as HTMLVideoElement;
                      v.pause();
                      v.currentTime = 0;
                    }}
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={file.path}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                )}
                {/* Hover overlay with delete */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => handleDelete(file.name)}
                    className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {/* File info */}
              <div className="p-3">
                <p
                  className="text-sm font-medium text-gray-800 truncate"
                  title={file.name}
                >
                  {file.name}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatSize(file.size)}
                  {isVideo(file.name) && (
                    <span className="ml-2 px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded text-[10px] font-medium">
                      VIDEO
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-400 mt-1 font-mono">
                  {file.path}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
