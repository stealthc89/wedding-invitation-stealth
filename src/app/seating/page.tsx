"use client";

import { useState, useEffect, useRef } from "react";
import PhotoSlideshow from "@/components/PhotoSlideshow";
import BrandLogo from "@/components/BrandLogo";

interface SeatingResult {
  guest_name: string;
  table_number: string;
  table_name: string;
  x_pct: number | null;
  y_pct: number | null;
}

export default function SeatingPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SeatingResult[]>([]);
  const [selected, setSelected] = useState<SeatingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSelected(null);

    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/seating?q=${encodeURIComponent(query)}`);
        setResults(await res.json());
      } finally {
        setLoading(false);
      }
    }, 250);
  }, [query]);

  const isHeadTable = (t: string) => t === "HT";

  return (
    <PhotoSlideshow overlay="dark">
      <div className="w-full max-w-lg mx-4 my-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <BrandLogo className="w-28 h-20 sm:w-36 sm:h-24 text-white" />
          </div>
          <p className="text-sm uppercase tracking-[0.3em] text-white/60 mb-2">
            Together with their families
          </p>
          <h1 className="text-4xl text-white mb-1">Chris & Candice</h1>
          <p className="text-sm text-white/70 italic">Find your seat</p>
          <div className="w-12 h-px bg-white/40 mx-auto my-4" />
        </div>

        <div className="glass-card rounded-2xl p-6">
          {!selected ? (
            <>
              <label className="block text-sm font-semibold text-white mb-2">
                Enter your name
              </label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Start typing your name..."
                autoFocus
                className="w-full px-4 py-3 rounded-lg border-2 border-white/30 focus:border-[var(--color-accent)] focus:outline-none text-base transition-colors bg-white/10 text-white placeholder:text-white/50"
              />

              {query.trim().length >= 2 && (
                <div className="mt-3">
                  {loading && <p className="text-white/50 text-sm text-center py-2">Searching...</p>}
                  {!loading && results.length === 0 && (
                    <p className="text-white/50 text-sm text-center py-2">
                      No match found — check your spelling or ask a member of staff
                    </p>
                  )}
                  {!loading && results.length > 0 && (
                    <ul className="space-y-2">
                      {results.map((r, i) => (
                        <li key={i}>
                          <button
                            onClick={() => setSelected(r)}
                            className="w-full text-left px-4 py-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 hover:border-[var(--color-accent)] transition-all"
                          >
                            <span className="text-white font-medium">{r.guest_name}</span>
                            <span className="text-white/50 text-sm ml-2">— Table {r.table_number}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="animate-fade-in">
              {/* Table result */}
              <div className="text-center mb-5">
                <div className="text-4xl mb-2">🎉</div>
                <p className="text-white/70 text-sm mb-1">Welcome, {selected.guest_name}!</p>
                <p className="text-white/60 text-xs mb-4">You are seated at:</p>

                {isHeadTable(selected.table_number) ? (
                  <div className="bg-yellow-500/20 border-2 border-yellow-400/60 rounded-xl p-5 mb-4">
                    <p className="text-yellow-300 text-xs font-semibold uppercase tracking-widest mb-1">Head Table</p>
                    <p className="text-white text-3xl font-bold">{selected.table_name}</p>
                  </div>
                ) : (
                  <div className="bg-white/10 border-2 border-[var(--color-accent)]/60 rounded-xl p-5 mb-4">
                    <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">Table {selected.table_number}</p>
                    <p className="text-white text-3xl font-bold">{selected.table_name}</p>
                  </div>
                )}
              </div>

              {/* Floor plan */}
              <div className="mb-4">
                <p className="text-white/60 text-xs text-center mb-2 uppercase tracking-wide">Your table on the floor plan</p>
                <div className="relative rounded-xl overflow-hidden border border-white/20">
                  <img
                    src="/floor-plan.jpg"
                    alt="Floor plan"
                    className="w-full h-auto block"
                    draggable={false}
                  />
                  {selected.x_pct != null && selected.y_pct != null ? (
                    <div
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ left: `${selected.x_pct}%`, top: `${selected.y_pct}%` }}
                    >
                      {/* Pulsing ring */}
                      <div className="absolute inset-0 rounded-full bg-rose-500 opacity-40 animate-ping scale-150" />
                      <div className="relative bg-rose-500 text-white text-xs font-bold rounded-full w-8 h-8 flex items-center justify-center shadow-xl border-2 border-white z-10">
                        {selected.table_number === "HT" ? "HT" : selected.table_number}
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-end justify-center pb-3">
                      <p className="text-white/60 text-xs bg-black/40 px-3 py-1 rounded-full">
                        Table position not yet mapped — ask a member of staff
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => { setSelected(null); setQuery(""); }}
                className="w-full text-sm text-white/50 hover:text-white underline transition-colors text-center"
              >
                Search again
              </button>
            </div>
          )}
        </div>
      </div>
    </PhotoSlideshow>
  );
}
