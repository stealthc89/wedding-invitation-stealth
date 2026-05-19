"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface SeatingRow {
  guest_name: string;
  table_number: string;
  table_name: string;
}

interface TableInfo {
  table_number: string;
  table_name: string;
}

interface TablePos {
  table_number: string;
  table_name: string;
  x_pct: number;
  y_pct: number;
}

export default function ManageSeatingPage() {
  const router = useRouter();
  const [count, setCount] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [replace, setReplace] = useState(true);
  const [preview, setPreview] = useState<SeatingRow[]>([]);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [tablePositions, setTablePositions] = useState<Record<string, TablePos>>({});
  const [pinningTable, setPinningTable] = useState<TableInfo | null>(null);
  const [qrUrl, setQrUrl] = useState("");
  const imgRef = useRef<HTMLImageElement>(null);

  function loadData() {
    fetch("/api/admin/seating")
      .then((r) => r.json())
      .then((d) => {
        setCount(d.count);
        setPreview(d.rows.slice(0, 20));
        setTables(d.tables ?? []);
      });
    fetch("/api/admin/seating/map")
      .then((r) => r.json())
      .then((rows: TablePos[]) => {
        const map: Record<string, TablePos> = {};
        rows.forEach((r) => { map[r.table_number] = r; });
        setTablePositions(map);
      });
  }

  useEffect(() => {
    loadData();
    setQrUrl(`${window.location.origin}/seating`);
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage("");
    const form = new FormData();
    form.append("file", file);
    form.append("replace", String(replace));
    const res = await fetch("/api/admin/seating", { method: "POST", body: form });
    const data = await res.json();
    if (res.ok) {
      setMessage(`✅ Imported ${data.imported} guests`);
      loadData();
    } else {
      setMessage(`❌ ${data.error}`);
    }
    setUploading(false);
    e.target.value = "";
  }

  async function handleClear() {
    if (!confirm("Clear all seating data?")) return;
    await fetch("/api/admin/seating", { method: "DELETE" });
    setCount(0);
    setPreview([]);
    setTables([]);
    setMessage("✅ Seating data cleared");
  }

  async function handleMapClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!pinningTable || !imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x_pct = ((e.clientX - rect.left) / rect.width) * 100;
    const y_pct = ((e.clientY - rect.top) / rect.height) * 100;
    await fetch("/api/admin/seating/map", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table_number: pinningTable.table_number, table_name: pinningTable.table_name, x_pct, y_pct }),
    });
    setTablePositions((prev) => ({ ...prev, [pinningTable.table_number]: { table_number: pinningTable.table_number, table_name: pinningTable.table_name, x_pct, y_pct } }));
    setPinningTable(null);
  }

  async function removePin(tableNumber: string) {
    await fetch(`/api/admin/seating/map?table=${encodeURIComponent(tableNumber)}`, { method: "DELETE" });
    setTablePositions((prev) => { const n = { ...prev }; delete n[tableNumber]; return n; });
  }

  async function copyQr() {
    await navigator.clipboard.writeText(qrUrl);
    setMessage("✅ Seating page URL copied");
  }

  const pinnedCount = Object.keys(tablePositions).length;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.push("/manage")} className="text-gray-500 hover:text-gray-700 text-sm">← Back</button>
          <h1 className="text-2xl font-bold text-gray-800">Seating Plan</h1>
        </div>

        {message && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">{message}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Upload + QR */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="font-semibold text-gray-800 mb-1">Upload Guest List</h2>
              <p className="text-xs text-gray-500 mb-3">Accepts .xlsx or .csv with columns: Guest Name, Table Number, Table Name</p>
              <label className="flex items-center gap-2 mb-3 cursor-pointer">
                <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                <span className="text-sm text-gray-700">Replace existing data</span>
              </label>
              <input type="file" accept=".xlsx,.csv" onChange={handleUpload} disabled={uploading}
                className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
              {uploading && <p className="text-xs text-gray-500 mt-2">Uploading...</p>}
              {count !== null && <p className="text-xs text-gray-500 mt-2">{count} guests loaded · {tables.length} tables · {pinnedCount} pinned</p>}
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="font-semibold text-gray-800 mb-1">Guest QR Code</h2>
              <div className="flex justify-center my-3">
                {qrUrl && <img src={`/api/qr?url=${encodeURIComponent(qrUrl)}&size=160`} alt="QR" className="rounded border border-gray-200" />}
              </div>
              <div className="flex gap-2">
                <button onClick={copyQr} className="flex-1 text-xs py-1.5 bg-gray-100 hover:bg-gray-200 rounded transition-colors">Copy URL</button>
                <a href={qrUrl} target="_blank" rel="noopener noreferrer" className="flex-1 text-xs py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors text-center">Preview</a>
              </div>
            </div>

            {/* Table list */}
            {tables.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-5">
                <h2 className="font-semibold text-gray-800 mb-3">Pin Tables on Floor Plan</h2>
                {pinningTable && (
                  <div className="mb-3 p-2 bg-yellow-50 border border-yellow-300 rounded text-xs text-yellow-800">
                    Click on the floor plan to pin <strong>Table {pinningTable.table_number} – {pinningTable.table_name}</strong>
                    <button onClick={() => setPinningTable(null)} className="ml-2 underline">cancel</button>
                  </div>
                )}
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {tables.map((t) => {
                    const pinned = !!tablePositions[t.table_number];
                    return (
                      <div key={t.table_number} className="flex items-center justify-between text-xs py-1 border-b border-gray-50">
                        <span className={`flex-1 ${pinned ? "text-gray-800" : "text-gray-400"}`}>
                          {pinned ? "📍" : "○"} {t.table_number} – {t.table_name}
                        </span>
                        <div className="flex gap-1">
                          <button onClick={() => setPinningTable(t)} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors">
                            {pinned ? "Move" : "Pin"}
                          </button>
                          {pinned && (
                            <button onClick={() => removePin(t.table_number)} className="px-2 py-0.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors">✕</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Floor plan editor */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-800">Floor Plan</h2>
              {pinningTable && (
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full animate-pulse">
                  Click to pin Table {pinningTable.table_number}
                </span>
              )}
            </div>
            <div
              className={`relative rounded-lg overflow-hidden border-2 ${pinningTable ? "border-yellow-400 cursor-crosshair" : "border-gray-200"}`}
              onClick={handleMapClick}
            >
              <img
                ref={imgRef}
                src="/floor-plan.jpg"
                alt="Floor plan"
                className="w-full h-auto block"
                draggable={false}
              />
              {/* Table pins */}
              {Object.values(tablePositions).map((pos) => (
                <div
                  key={pos.table_number}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ left: `${pos.x_pct}%`, top: `${pos.y_pct}%` }}
                >
                  <div className="bg-rose-500 text-white text-[10px] font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg border-2 border-white">
                    {pos.table_number === "HT" ? "HT" : pos.table_number}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">Select a table from the list, then click its location on the floor plan.</p>
          </div>
        </div>

        {/* Data preview + clear */}
        {preview.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-800">Loaded Data <span className="text-gray-400 font-normal text-sm">({count} guests)</span></h2>
              <button onClick={handleClear} className="text-xs px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded transition-colors">Clear All</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b text-xs uppercase tracking-wide">
                    <th className="pb-2 pr-4">Name</th>
                    <th className="pb-2 pr-4">Table #</th>
                    <th className="pb-2">Table Name</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-1.5 pr-4 text-gray-800">{r.guest_name}</td>
                      <td className="py-1.5 pr-4 text-gray-600">{r.table_number}</td>
                      <td className="py-1.5 text-gray-600">{r.table_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(count ?? 0) > 20 && <p className="text-xs text-gray-400 mt-2 text-center">Showing first 20 of {count} guests</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
