"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Textarea } from "@/components/ui/input";
import { LogOut, BookOpen, FlaskConical, CheckCircle2, Paperclip, Download, Loader2, Sparkles, Clock, CalendarDays, Send, MessageSquare, CheckCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { getTeamPortalQuote, formatPortalDateTime, getTeamGreeting } from "@/lib/quotes";
import { PortalPersonalProjects } from "@/components/portal/personal-projects";
import { IndependenceDayBanner } from "@/components/independence-day-banner";
import { ThesisView } from "@/components/portal/thesis-view";
import { TASK_STATUSES, PUBLICATION_STATUSES, PORTAL_TASK_STATUSES, getStatusMeta } from "@/lib/constants";

type PortalAttachment = { id: string; filename: string; size: number; mimeType: string };

type PortalTask = {
  id: string;
  title: string;
  status: string;
  dueDate: string | null;
  project: { title: string } | null;
};

interface PortalThesis {
  id: string;
  title: string;
  studentName: string;
  degree: string;
  status: string;
  supervisor: string | null;
  startDate: string | null;
  expectedEndDate: string | null;
  milestones: string | null;
  instructions: string | null;
}

interface PortalData {
  person: { id: string; name: string; email: string | null; role: string; personalProjectMember?: boolean };
  thesis?: PortalThesis | null;
  tasks: PortalTask[];
  publications: Array<{ id: string; title: string; status: string; role: string; journal: string | null; attachments: PortalAttachment[] }>;
  projects: Array<{ id: string; title: string; status: string; role: string; researchPhase: string; attachments: PortalAttachment[] }>;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PortalPage() {
  const router = useRouter();
  const [data, setData] = useState<PortalData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [taskMessage, setTaskMessage] = useState("");
  const [now, setNow] = useState(() => new Date());
  const [msgSubject, setMsgSubject] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [msgStatus, setMsgStatus] = useState<"idle" | "sent" | "error">("idle");

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  async function loadDashboard() {
    const r = await fetch("/api/portal/dashboard", { credentials: "include" });
    if (!r.ok) throw new Error("unauthorized");
    return r.json() as Promise<PortalData>;
  }

  useEffect(() => {
    loadDashboard()
      .then(setData)
      .catch(() => {
        setLoadError("Could not load your portal. Try signing in again from the email link.");
      });
  }, []);

  async function updateTaskStatus(taskId: string, status: string) {
    setUpdatingTaskId(taskId);
    setTaskMessage("");
    try {
      const res = await fetch(`/api/portal/tasks/${taskId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const updated = await res.json();
      if (!res.ok) {
        setTaskMessage(updated.error ?? "Could not update task");
        return;
      }

      if (status === "COMPLETED") {
        setData((prev) =>
          prev ? { ...prev, tasks: prev.tasks.filter((t) => t.id !== taskId) } : prev
        );
        setTaskMessage("Task marked as finished — your supervisor can see this on their dashboard.");
      } else {
        setData((prev) =>
          prev
            ? {
                ...prev,
                tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, status: updated.status } : t)),
              }
            : prev
        );
        setTaskMessage("Status updated — your supervisor can see this on their dashboard.");
      }
    } catch {
      setTaskMessage("Could not update task — please try again.");
    } finally {
      setUpdatingTaskId(null);
    }
  }

  async function sendMessage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!msgBody.trim() || sendingMsg) return;
    setSendingMsg(true);
    setMsgStatus("idle");
    try {
      const res = await fetch("/api/portal/message", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: msgSubject, body: msgBody }),
      });
      if (!res.ok) throw new Error("failed");
      setMsgStatus("sent");
      setMsgSubject("");
      setMsgBody("");
    } catch {
      setMsgStatus("error");
    } finally {
      setSendingMsg(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/portal", { method: "DELETE", credentials: "include" });
    router.push("/portal/login");
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f8f6f2] px-4">
        <p className="text-center text-sm text-slate-600">{loadError}</p>
        <Button onClick={() => router.push("/portal/login")}>Go to Login</Button>
      </div>
    );
  }

  if (!data) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f8f6f2]">Loading…</div>;
  }

  const quote = getTeamPortalQuote(now, data.person.id);
  const { date: todayDate, time: todayTime } = formatPortalDateTime(now);
  const pendingTasks = data.tasks.length;

  return (
    <div className="min-h-screen bg-[#f8f6f2]">
      <header className="border-b border-slate-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3">
            <LogoMark size={36} />
            <div>
              <p className="font-semibold text-slate-900">{getTeamGreeting(data.person.name, now)}</p>
              <p className="text-xs text-slate-500">Team Portal · {data.person.role.replace(/_/g, " ")}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={logout} className="gap-1">
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <IndependenceDayBanner />
        <div className="overflow-hidden rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-800 via-teal-700 to-slate-800 p-5 text-white shadow-lg sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-teal-200/90">
                <CalendarDays className="h-3.5 w-3.5" /> {todayDate}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-amber-200">
                <Clock className="h-3.5 w-3.5" /> {todayTime} IST
              </p>
              {pendingTasks > 0 ? (
                <p className="mt-3 text-sm text-teal-100">
                  You have <strong className="text-white">{pendingTasks}</strong> task{pendingTasks === 1 ? "" : "s"} waiting — update your status when you make progress.
                </p>
              ) : (
                <p className="mt-3 text-sm text-teal-100">No pending tasks right now. Check your projects below.</p>
              )}
            </div>
            <blockquote className="max-w-sm rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <Sparkles className="mb-2 h-4 w-4 text-amber-300" />
              <p className="text-sm italic leading-relaxed text-teal-50">&ldquo;{quote.text}&rdquo;</p>
              <footer className="mt-2 text-xs text-amber-200/80">— {quote.author}</footer>
            </blockquote>
          </div>
        </div>
        {(data.tasks.length === 0 && data.publications.length === 0 && data.projects.length === 0) && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="p-5 text-sm text-amber-900">
              <p className="font-medium">Nothing assigned to you yet</p>
              <p className="mt-2 text-amber-800/90">
                Your supervisor needs to add you to a research project or publication, or assign you a task in ScholarDesk.
                If you just received portal access, ask Dr. Hari Prakash to link you to your work — then refresh this page.
              </p>
            </CardContent>
          </Card>
        )}

        <section>
          <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-slate-800">
            <CheckCircle2 className="h-5 w-5 text-teal-600" /> Your Tasks
          </h2>
          <p className="mb-3 text-xs text-slate-500">
            Tap a status below — no need to call or email. Your supervisor sees updates on their dashboard.
          </p>
          {taskMessage && (
            <p className="mb-3 rounded-lg bg-teal-50 px-3 py-2 text-xs text-teal-800">{taskMessage}</p>
          )}
          {data.tasks.length === 0 ? (
            <p className="text-sm text-slate-400">No pending tasks assigned to you.</p>
          ) : (
            <div className="space-y-3">
              {data.tasks.map((t) => {
                const meta = getStatusMeta(TASK_STATUSES, t.status);
                const isUpdating = updatingTaskId === t.id;
                return (
                  <Card key={t.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-900">{t.title}</p>
                          {t.project && <p className="text-xs text-slate-500">{t.project.title}</p>}
                          {t.dueDate && <p className="text-xs text-slate-400">Due: {formatDate(t.dueDate)}</p>}
                        </div>
                        <Badge className={`shrink-0 ${meta.color}`}>{meta.label}</Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                        {PORTAL_TASK_STATUSES.map((s) => {
                          const active = t.status === s.value;
                          return (
                            <button
                              key={s.value}
                              type="button"
                              disabled={isUpdating}
                              onClick={() => updateTaskStatus(t.id, s.value)}
                              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                                active
                                  ? `${s.color} ring-2 ring-teal-500/30`
                                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                              } disabled:opacity-50`}
                            >
                              {isUpdating && active ? (
                                <span className="flex items-center gap-1">
                                  <Loader2 className="h-3 w-3 animate-spin" /> Saving…
                                </span>
                              ) : (
                                s.label
                              )}
                            </button>
                          );
                        })}
                      </div>
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
                      {p.attachments?.length > 0 && (
                        <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                          <p className="flex items-center gap-1 text-xs font-medium text-slate-500">
                            <Paperclip className="h-3 w-3" /> Shared files
                          </p>
                          {p.attachments.map((a) => (
                            <a
                              key={a.id}
                              href={`/api/attachments/${a.id}`}
                              className="flex items-center gap-2 text-sm text-teal-700 hover:underline"
                            >
                              <Download className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{a.filename}</span>
                              <span className="shrink-0 text-xs text-slate-400">({formatFileSize(a.size)})</span>
                            </a>
                          ))}
                        </div>
                      )}
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
                    {p.attachments?.length > 0 && (
                      <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                        <p className="flex items-center gap-1 text-xs font-medium text-slate-500">
                          <Paperclip className="h-3 w-3" /> Shared files
                        </p>
                        {p.attachments.map((a) => (
                          <a
                            key={a.id}
                            href={`/api/attachments/${a.id}`}
                            className="flex items-center gap-2 text-sm text-teal-700 hover:underline"
                          >
                            <Download className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{a.filename}</span>
                            <span className="shrink-0 text-xs text-slate-400">({formatFileSize(a.size)})</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {data.thesis && <ThesisView thesis={data.thesis} />}

        {data.person.personalProjectMember && <PortalPersonalProjects />}

        <section>
          <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-slate-800">
            <MessageSquare className="h-5 w-5 text-teal-600" /> Message Dr. Hari Prakash
          </h2>
          <p className="mb-3 text-xs text-slate-500">
            Have a question, an update, or a request? Type it below — it goes straight to Dr. Hari&apos;s
            dashboard and email.
          </p>
          <Card>
            <CardContent className="p-4">
              {msgStatus === "sent" ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                    <CheckCircle className="h-6 w-6 text-emerald-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-800">Message sent to Dr. Hari Prakash</p>
                  <p className="text-xs text-slate-500">He will see it on his dashboard and by email.</p>
                  <Button variant="outline" size="sm" onClick={() => setMsgStatus("idle")}>
                    Send another message
                  </Button>
                </div>
              ) : (
                <form onSubmit={sendMessage} className="space-y-3">
                  <div>
                    <Label>Subject (optional)</Label>
                    <Input
                      value={msgSubject}
                      onChange={(e) => setMsgSubject(e.target.value)}
                      placeholder="e.g. Update on my data collection"
                      className="mt-1"
                      maxLength={200}
                    />
                  </div>
                  <div>
                    <Label>Your message</Label>
                    <Textarea
                      value={msgBody}
                      onChange={(e) => setMsgBody(e.target.value)}
                      required
                      rows={4}
                      placeholder="Type your message to Dr. Hari Prakash…"
                      className="mt-1"
                      maxLength={5000}
                    />
                  </div>
                  {msgStatus === "error" && (
                    <p className="text-xs text-red-600">Could not send — please try again.</p>
                  )}
                  <Button type="submit" disabled={sendingMsg || !msgBody.trim()} className="gap-2">
                    {sendingMsg ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Sending…
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" /> Send Message
                      </>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
