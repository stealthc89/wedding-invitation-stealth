"use client";

import { useState, useEffect } from "react";

interface Backup {
  name: string;
  size: number;
  created: string;
  type: string;
}

export default function SettingsPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchBackups();
  }, []);

  async function fetchBackups() {
    try {
      const res = await fetch("/api/admin/db-backup");
      const data = await res.json();
      setBackups(data.backups || []);
    } catch (error) {
      console.error("Failed to fetch backups:", error);
    }
  }

  async function createBackup() {
    setLoading(true);
    setMessage("Creating database backup...");

    try {
      const res = await fetch("/api/admin/db-backup", { method: "POST" });
      const data = await res.json();

      if (data.success) {
        setMessage(`✅ Backup created: ${data.backup} (${(data.size / 1024).toFixed(2)} KB)`);
        fetchBackups();
      } else {
        setMessage(`❌ Backup failed: ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Backup failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }

  async function restoreBackup(backupName: string) {
    if (!confirm(`⚠️ WARNING: This will REPLACE your current database with the backup from:\n\n${new Date(backupName.replace("wedding-db-", "").replace(".db", "").replace(/-/g, ":")).toLocaleString()}\n\nA backup of your current database will be created automatically before restoring.\n\nThis action cannot be undone. Continue?`)) {
      return;
    }

    setLoading(true);
    setMessage("Restoring database...");

    try {
      const res = await fetch("/api/admin/db-backup", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backupName }),
      });
      const data = await res.json();

      if (data.success) {
        setMessage(`✅ Database restored from ${backupName}. Pre-restore backup saved as ${data.preRestoreBackup}`);
        // Reload the page to refresh all data
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setMessage(`❌ Restore failed: ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Restore failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString();
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
        <p className="text-sm text-gray-600 mt-1">Manage database backups and system settings</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.startsWith("✅") ? "bg-green-50 text-green-800" : message.startsWith("❌") ? "bg-red-50 text-red-800" : "bg-blue-50 text-blue-800"}`}>
          {message}
        </div>
      )}

      {/* Database Backups Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Database Backups</h2>
            <p className="text-sm text-gray-600 mt-1">
              Automated daily backups are enabled and kept for 7 days. Manual backups are kept indefinitely.
            </p>
          </div>
          <button
            onClick={createBackup}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Create Backup Now"}
          </button>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Available Backups</h3>
          {backups.length === 0 ? (
            <p className="text-sm text-gray-500">No backups available</p>
          ) : (
            <div className="space-y-2">
              {backups.map((backup) => (
                <div
                  key={backup.name}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800">
                        {formatDate(backup.created)}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        backup.type === "automated" ? "bg-green-100 text-green-700" :
                        backup.type === "pre-restore" ? "bg-orange-100 text-orange-700" :
                        "bg-blue-100 text-blue-700"
                      }`}>
                        {backup.type}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Size: {formatSize(backup.size)} • {backup.name}
                    </p>
                  </div>
                  <button
                    onClick={() => restoreBackup(backup.name)}
                    disabled={loading}
                    className="px-3 py-1.5 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* System Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">System Information</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Environment:</span>
            <span className="font-medium">{process.env.NODE_ENV || "development"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Base URL:</span>
            <span className="font-medium">{typeof window !== "undefined" ? window.location.origin : "N/A"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Backup Retention:</span>
            <span className="font-medium">7 days (automated backups)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
