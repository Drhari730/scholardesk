"use client";

import { useEffect, useState } from "react";
import { Send, Loader2, Sparkles } from "lucide-react";

// India's Independence Day is 15 August. Show the banner for a short window
// around it (14–16 Aug IST) so it appears now and auto-hides afterwards.
function inWindow(): boolean {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  return month === 8 && day >= 13 && day <= 16;
}

function WavingFlag() {
  const spokes = Array.from({ length: 24 }).map((_, i) => {
    const a = (i * 15 * Math.PI) / 180;
    return (
      <line
        key={i}
        x1={90 + 4 * Math.cos(a)}
        y1={60 + 4 * Math.sin(a)}
        x2={90 + 17 * Math.cos(a)}
        y2={60 + 17 * Math.sin(a)}
        stroke="#000080"
        strokeWidth={1}
      />
    );
  });

  return (
    <div className="idb-flagwrap">
      <div className="idb-pole" />
      <div className="idb-flag">
        <svg viewBox="0 0 180 120" width="150" height="100" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="0" width="180" height="40" fill="#FF9933" />
          <rect x="0" y="40" width="180" height="40" fill="#FFFFFF" />
          <rect x="0" y="80" width="180" height="40" fill="#138808" />
          <g>
            <circle cx="90" cy="60" r="17" fill="none" stroke="#000080" strokeWidth="1.5" />
            <circle cx="90" cy="60" r="3" fill="#000080" />
            {spokes}
          </g>
        </svg>
        <div className="idb-fold" />
      </div>
    </div>
  );
}

export function IndependenceDayBanner({ admin = false }: { admin?: boolean }) {
  const [show, setShow] = useState(false);
  const [sending, setSending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState("");

  useEffect(() => {
    setShow(inWindow());
  }, []);

  if (!show) return null;

  async function sendTest() {
    setTesting(true);
    setResult("");
    try {
      const res = await fetch("/api/independence-greeting", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: true }),
      });
      const data = await res.json();
      setResult(res.ok ? `Test greeting sent to ${data.sentTo}. 🇮🇳` : data.error ?? "Could not send test.");
    } catch {
      setResult("Could not send test — please try again.");
    } finally {
      setTesting(false);
    }
  }

  async function sendGreetings() {
    if (!confirm("Send a Happy Independence Day greeting email to all registered members?")) return;
    setSending(true);
    setResult("");
    try {
      const res = await fetch("/api/independence-greeting", { method: "POST", credentials: "include" });
      const data = await res.json();
      setResult(res.ok ? `Greetings sent to ${data.sent} of ${data.total} members. 🇮🇳` : data.error ?? "Could not send.");
    } catch {
      setResult("Could not send — please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="idb-banner mb-8">
      <style>{`
        .idb-banner {
          position: relative;
          overflow: hidden;
          border-radius: 1.5rem;
          padding: 1.5rem;
          background: linear-gradient(120deg, #fff7ed 0%, #ffffff 45%, #f0fdf4 100%);
          border: 1px solid #fed7aa;
          box-shadow: 0 10px 30px rgba(0,0,0,0.06);
          animation: idb-fade 0.7s ease-out both;
        }
        .idb-banner::before {
          content: "";
          position: absolute; left: 0; right: 0; top: 0; height: 5px;
          background: linear-gradient(90deg, #FF9933 0 33%, #ffffff 33% 66%, #138808 66% 100%);
        }
        @keyframes idb-fade { from { opacity: 0; transform: translateY(10px);} to {opacity:1; transform:none;} }
        .idb-inner { display: flex; align-items: center; gap: 1.25rem; flex-wrap: wrap; }
        .idb-flagwrap { position: relative; display: flex; align-items: flex-start; padding-left: 6px; flex-shrink: 0; }
        .idb-pole {
          width: 6px; height: 120px; border-radius: 6px;
          background: linear-gradient(90deg,#b45309,#f59e0b,#b45309);
          position: relative;
        }
        .idb-pole::before {
          content:""; position:absolute; top:-7px; left:-3px; width:12px; height:12px;
          border-radius:9999px; background: radial-gradient(circle at 30% 30%, #fde68a, #d97706);
        }
        .idb-flag {
          transform-origin: left center;
          animation: idb-wave 3.2s ease-in-out infinite;
          filter: drop-shadow(0 6px 8px rgba(0,0,0,0.12));
          position: relative;
          margin-top: 2px;
          border-radius: 2px;
          overflow: hidden;
        }
        .idb-fold {
          position: absolute; inset: 0;
          background: linear-gradient(105deg, rgba(255,255,255,0) 40%, rgba(255,255,255,0.45) 50%, rgba(255,255,255,0) 60%);
          background-size: 250% 100%;
          animation: idb-shimmer 3.2s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes idb-wave {
          0%,100% { transform: perspective(340px) rotateY(0deg) skewY(0deg); }
          25% { transform: perspective(340px) rotateY(-6deg) skewY(1.4deg); }
          50% { transform: perspective(340px) rotateY(0deg) skewY(0deg); }
          75% { transform: perspective(340px) rotateY(6deg) skewY(-1.4deg); }
        }
        @keyframes idb-shimmer {
          0%,100% { background-position: 120% 0; }
          50% { background-position: -20% 0; }
        }
        .idb-title {
          font-weight: 800; line-height: 1.1;
          background: linear-gradient(90deg,#EA580C,#111827 55%,#15803D);
          -webkit-background-clip: text; background-clip: text; color: transparent;
        }
      `}</style>

      <div className="idb-inner">
        <WavingFlag />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-orange-600">
            <Sparkles className="h-3.5 w-3.5" /> 15 August 2026 · Jai Hind
          </p>
          <h2 className="idb-title mt-1 font-serif text-2xl sm:text-3xl">
            Happy 80th Independence Day! 🇮🇳
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            Eighty years of freedom, unity, and relentless progress. As one of the world&apos;s
            fastest-growing nations, India rises with the courage of its people and the promise of its
            youth. Here&apos;s to knowledge, service, and a brighter tomorrow. <strong>Jai Hind!</strong>
          </p>

          {admin && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={sendGreetings}
                disabled={sending || testing}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 via-slate-700 to-green-600 px-4 py-2 text-sm font-semibold text-white shadow hover:opacity-95 disabled:opacity-60"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send greetings to everyone
              </button>
              <button
                onClick={sendTest}
                disabled={sending || testing}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send test to me
              </button>
              {result && <span className="text-xs font-medium text-slate-600">{result}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
