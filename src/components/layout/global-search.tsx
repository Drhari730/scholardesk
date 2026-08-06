"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}`, { credentials: "include" })
        .then((r) => r.json())
        .then(setResults)
        .catch(() => setResults([]));
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-3 flex w-full items-center gap-2 rounded-xl border border-teal-800/40 bg-teal-950/40 px-3 py-2 text-xs text-teal-200/60 transition-colors hover:bg-white/5 hover:text-teal-100"
      >
        <Search className="h-3.5 w-3.5" />
        Search… <span className="ml-auto opacity-50">⌘K</span>
      </button>
    );
  }

  return (
    <div className="relative mb-3">
      <div className="flex items-center gap-2 rounded-xl border border-teal-700 bg-teal-950 px-3 py-2">
        <Search className="h-3.5 w-3.5 text-teal-300" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search projects, people, events…"
          className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-teal-300/50"
          autoFocus
        />
        <button onClick={() => { setOpen(false); setQuery(""); }} className="text-teal-300 hover:text-white">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
          {results.map((r) => (
            <button
              key={`${r.type}-${r.id}`}
              onClick={() => { router.push(r.href); setOpen(false); setQuery(""); }}
              className="flex w-full flex-col px-3 py-2 text-left hover:bg-slate-50"
            >
              <span className="text-xs font-medium text-teal-700">{r.type}</span>
              <span className="text-sm text-slate-800">{r.title}</span>
              {r.subtitle && <span className="text-xs text-slate-400">{r.subtitle}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
