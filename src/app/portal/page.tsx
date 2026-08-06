"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogOut, BookOpen, FlaskConical, CheckCircle2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { TASK_STATUSES, PUBLICATION_STATUSES, getStatusMeta } from "@/lib/constants";

interface PortalData {
  person: { name: string; email: string | null; role: string };
  tasks: Array<{ id: string; title: string; status: string; dueDate: string | null; project: { title: string } | null }>;
  publications: Array<{ id: string; title: string; status: string; role: string; journal: string | null }>;
  projects: Array<{ id: string; title: string; status: string; role: string; researchPhase: string }>;
}

export default function PortalPage() {
  const router = useRouter();
  const [data, setData] = useState<PortalData | null>(null);

  useEffect(() => {
    fetch("/api/portal/dashboard", { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("unauthorized");
        return r.json();
      })
      .then(setData)
      .catch(() => router.push("/portal/login"));
  }, [router]);

  async function logout() {
    await fetch("/api/auth/portal", { method: "DELETE", credentials: "include" });
    router.push("/portal/login");
  }

  if (!data) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f8f6f2]">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-[#f8f6f2]">
      <header className="border-b border-slate-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3">
            <LogoMark size={36} />
            <div>
              <p className="font-semibold text-slate-900">Hello, {data.person.name}</p>
              <p className="text-xs text-slate-500">Team Portal · {data.person.role.replace(/_/g, " ")}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={logout} className="gap-1">
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-800">
            <CheckCircle2 className="h-5 w-5 text-teal-600" /> Your Tasks
          </h2>
          {data.tasks.length === 0 ? (
            <p className="text-sm text-slate-400">No pending tasks assigned to you.</p>
          ) : (
            <div className="space-y-2">
              {data.tasks.map((t) => {
                const meta = getStatusMeta(TASK_STATUSES, t.status);
                return (
                  <Card key={t.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-medium text-slate-900">{t.title}</p>
                        {t.project && <p className="text-xs text-slate-500">{t.project.title}</p>}
                        {t.dueDate && <p className="text-xs text-slate-400">Due: {formatDate(t.dueDate)}</p>}
                      </div>
                      <Badge className={meta.color}>{meta.label}</Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-800">
            <BookOpen className="h-5 w-5 text-blue-600" /> Publications
          </h2>
          {data.publications.length === 0 ? (
            <p className="text-sm text-slate-400">Not on any publication teams yet.</p>
          ) : (
            <div className="space-y-2">
              {data.publications.map((p) => {
                const meta = getStatusMeta(PUBLICATION_STATUSES, p.status);
                return (
                  <Card key={p.id}>
                    <CardContent className="p-4">
                      <p className="font-medium text-slate-900">{p.title}</p>
                      <p className="text-xs text-slate-500">{p.role.replace(/_/g, " ")} · {p.journal}</p>
                      <Badge className={`mt-2 ${meta.color}`}>{meta.label}</Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-800">
            <FlaskConical className="h-5 w-5 text-violet-600" /> Research Projects
          </h2>
          {data.projects.length === 0 ? (
            <p className="text-sm text-slate-400">Not on any research projects yet.</p>
          ) : (
            <div className="space-y-2">
              {data.projects.map((p) => (
                <Card key={p.id}>
                  <CardContent className="p-4">
                    <p className="font-medium text-slate-900">{p.title}</p>
                    <p className="text-xs text-slate-500">{p.role} · {p.researchPhase.replace(/_/g, " ")}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
