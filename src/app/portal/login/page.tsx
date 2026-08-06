"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export default function PortalLoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("error=expired")) {
      setError("That login link has expired. Ask Dr. Hari to resend your portal email.");
    }
  }, []);

  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: fd.get("email"), pin: fd.get("pin") }),
      credentials: "include",
    });
    if (!res.ok) {
      setError("Invalid email or PIN. Ask Dr. Hari for portal access.");
      setLoading(false);
      return;
    }
    router.push("/portal");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-900 via-teal-800 to-slate-900 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <LogoMark size={48} />
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Team Portal</h1>
            <p className="text-sm text-slate-500">ScholarDesk — read-only access</p>
          </div>
        </div>
        <form onSubmit={login} className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input name="email" type="email" required className="mt-1" placeholder="your@email.com" />
          </div>
          <div>
            <Label>PIN</Label>
            <Input name="pin" type="password" required minLength={4} className="mt-1" placeholder="PIN from Dr. Hari" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-slate-400">
          Portal access is enabled by Dr. Hari Prakash from the People page.
        </p>
      </div>
    </div>
  );
}
