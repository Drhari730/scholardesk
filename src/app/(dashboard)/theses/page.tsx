"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, Pencil, X, GraduationCap } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { DialogRoot, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { PageTransition } from "@/components/ui/motion";
import { useFetch, apiPost, apiPatch, apiDelete } from "@/lib/hooks";
import { formatDate } from "@/lib/utils";
import { DEGREES, THESIS_STATUSES, MILESTONE_STATUSES } from "@/lib/constants";

interface Milestone {
  id: string;
  title: string;
  start: string;
  end: string;
  status: string;
}

interface Thesis {
  id: string;
  title: string;
  studentName: string;
  personId: string | null;
  degree: string;
  status: string;
  supervisor: string | null;
  startDate: string | null;
  expectedEndDate: string | null;
  milestones: string | null;
  notes: string | null;
  person?: { id: string; name: string; portalEnabled?: boolean } | null;
}

interface PersonLite {
  id: string;
  name: string;
  portalEnabled?: boolean;
}

function meta<T extends { value: string; label: string; color: string }>(list: readonly T[], v: string) {
  return list.find((x) => x.value === v) ?? list[0];
}

function parseMs(raw: string | null): Milestone[] {
  if (!raw) return [];
  try {
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p.filter((m) => m && m.title && m.start && m.end) : [];
  } catch {
    return [];
  }
}

function d(s: string | null | undefined) {
  if (!s) return null;
  const x = new Date(s);
  return isNaN(x.getTime()) ? null : x;
}

function monthKey(dt: Date) {
  return dt.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}

/** Gantt chart for one thesis's milestones. */
function Gantt({ thesis }: { thesis: Thesis }) {
  const ms = parseMs(thesis.milestones);
  const dates: Date[] = [];
  ms.forEach((m) => {
    const a = d(m.start);
    const b = d(m.end);
    if (a) dates.push(a);
    if (b) dates.push(b);
  });
  const ts = d(thesis.startDate);
  const te = d(thesis.expectedEndDate);
  if (ts) dates.push(ts);
  if (te) dates.push(te);

  if (ms.length === 0 || dates.length === 0) {
    return <p className="py-4 text-sm text-slate-400">No timeline yet. Use “Edit” to add milestones.</p>;
  }

  let min = new Date(Math.min(...dates.map((x) => x.getTime())));
  let max = new Date(Math.max(...dates.map((x) => x.getTime())));
  if (min.getTime() === max.getTime()) max = new Date(min.getTime() + 30 * 864e5);
  const span = max.getTime() - min.getTime();
  const pct = (t: number) => ((t - min.getTime()) / span) * 100;

  // month gridlines
  const months: { left: number; label: string }[] = [];
  const cur = new Date(min.getFullYear(), min.getMonth(), 1);
  while (cur <= max) {
    months.push({ left: pct(cur.getTime()), label: monthKey(cur) });
    cur.setMonth(cur.getMonth() + 1);
  }
  const labelEvery = months.length > 14 ? 3 : months.length > 7 ? 2 : 1;

  const now = new Date();
  const todayLeft = now >= min && now <= max ? pct(now.getTime()) : null;

  return (
    <div className="mt-2">
      <div className="min-w-[520px]">
        {/* month axis */}
        <div className="relative mb-1 ml-[150px] h-4 border-b border-slate-100">
          {months.map((mo, i) => (
            <div key={i} className="absolute top-0 h-4" style={{ left: `${mo.left}%` }}>
              <div className="h-full w-px bg-slate-100" />
              {i % labelEvery === 0 && (
                <span className="absolute -left-3 top-0 text-[9px] text-slate-400">{mo.label}</span>
              )}
            </div>
          ))}
        </div>

        <div className="relative">
          {/* today line spanning all rows */}
          {todayLeft !== null && (
            <div
              className="pointer-events-none absolute bottom-0 top-0 z-10 ml-[150px] w-px bg-rose-400"
              style={{ left: `calc(${todayLeft}% )` }}
            >
              <span className="absolute -top-3 -translate-x-1/2 rounded bg-rose-400 px-1 text-[8px] text-white">
                today
              </span>
            </div>
          )}
          {ms.map((m) => {
            const a = d(m.start);
            const b = d(m.end);
            if (!a || !b) return null;
            const left = pct(a.getTime());
            const width = Math.max(pct(b.getTime()) - left, 1.5);
            const mm = meta(MILESTONE_STATUSES, m.status);
            return (
              <div key={m.id} className="flex items-center gap-2 py-1">
                <div className="w-[142px] shrink-0 truncate text-xs text-slate-600" title={m.title}>
                  {m.title}
                </div>
                <div className="relative h-5 flex-1 rounded bg-slate-50">
                  <div
                    className="absolute top-0 flex h-5 items-center rounded px-1.5 text-[9px] font-medium text-white"
                    style={{ left: `${left}%`, width: `${width}%`, backgroundColor: mm.bar }}
                    title={`${m.title} · ${formatDate(m.start)} → ${formatDate(m.end)} · ${mm.label}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ThesesPage() {
  const { data: theses, loading, refetch } = useFetch<Thesis[]>("/api/theses");
  const { data: people } = useFetch<PersonLite[]>("/api/people");
  const [showAdd, setShowAdd] = useState(false);
  const [addDegree, setAddDegree] = useState<"MASTERS" | "PHD">("MASTERS");
  const [filter, setFilter] = useState<"ALL" | "MASTERS" | "PHD">("ALL");

  const [editing, setEditing] = useState<Thesis | null>(null);
  const [msEdit, setMsEdit] = useState<Milestone[]>([]);
  const [editFields, setEditFields] = useState({ title: "", studentName: "", personId: "", status: "", startDate: "", expectedEndDate: "" });

  async function createThesis(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await apiPost("/api/theses", Object.fromEntries(fd));
    setShowAdd(false);
    refetch();
  }

  function openEdit(t: Thesis) {
    setEditing(t);
    setMsEdit(parseMs(t.milestones));
    setEditFields({
      title: t.title,
      studentName: t.studentName,
      personId: t.personId ?? "",
      status: t.status,
      startDate: t.startDate ? t.startDate.slice(0, 10) : "",
      expectedEndDate: t.expectedEndDate ? t.expectedEndDate.slice(0, 10) : "",
    });
  }

  async function saveEdit() {
    if (!editing) return;
    await apiPatch(`/api/theses/${editing.id}`, {
      ...editFields,
      milestones: JSON.stringify(msEdit),
    });
    setEditing(null);
    refetch();
  }

  async function quickPatch(id: string, body: Record<string, unknown>) {
    await apiPatch(`/api/theses/${id}`, body);
    refetch();
  }

  async function remove(id: string) {
    if (!confirm("Delete this thesis and its timeline?")) return;
    await apiDelete(`/api/theses/${id}`);
    refetch();
  }

  function addMilestone() {
    setMsEdit((p) => [
      ...p,
      {
        id: Math.random().toString(36).slice(2, 10),
        title: "New milestone",
        start: new Date().toISOString().slice(0, 10),
        end: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
        status: "PLANNED",
      },
    ]);
  }

  function updateMs(idx: number, patch: Partial<Milestone>) {
    setMsEdit((p) => p.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
  }

  const counts = useMemo(() => {
    const m = theses?.filter((t) => t.degree === "MASTERS").length ?? 0;
    const p = theses?.filter((t) => t.degree === "PHD").length ?? 0;
    return { m, p };
  }, [theses]);

  const filtered = theses?.filter((t) => (filter === "ALL" ? true : t.degree === filter));

  return (
    <PageTransition>
      <PageHeader
        title="Thesis Tracker"
        description="Track Masters & PhD student theses with a milestone timeline (Gantt) for each."
        action={
          <DialogRoot open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> New Thesis
              </Button>
            </DialogTrigger>
            <DialogContent title="New Thesis">
              <form onSubmit={createThesis} className="space-y-4">
                <div>
                  <Label>Degree</Label>
                  <Select name="degree" value={addDegree} onChange={(e) => setAddDegree(e.target.value as "MASTERS" | "PHD")} className="mt-1">
                    {DEGREES.map((x) => (
                      <option key={x.value} value={x.value}>{x.label}</option>
                    ))}
                  </Select>
                  <p className="mt-1 text-xs text-slate-400">
                    A default {addDegree === "PHD" ? "PhD" : "Masters"} milestone timeline will be created automatically — you can edit it after.
                  </p>
                </div>
                <div>
                  <Label>Portal student (optional)</Label>
                  <Select name="personId" className="mt-1" defaultValue="">
                    <option value="">Not linked — type a name below</option>
                    {people?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.portalEnabled ? "" : " (portal not enabled)"}
                      </option>
                    ))}
                  </Select>
                  <p className="mt-1 text-xs text-slate-400">
                    Link a person so they see this thesis & timeline in their Team Portal.
                  </p>
                </div>
                <div>
                  <Label>Student name (if not linked)</Label>
                  <Input name="studentName" className="mt-1" />
                </div>
                <div>
                  <Label>Thesis title</Label>
                  <Textarea name="title" required rows={2} className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Start date</Label>
                    <Input name="startDate" type="date" className="mt-1" />
                  </div>
                  <div>
                    <Label>Expected end</Label>
                    <Input name="expectedEndDate" type="date" className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select name="status" defaultValue="ONGOING" className="mt-1">
                    {THESIS_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </Select>
                </div>
                <Button type="submit" className="w-full">Create Thesis</Button>
              </form>
            </DialogContent>
          </DialogRoot>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {([
          { v: "ALL", label: `All (${theses?.length ?? 0})` },
          { v: "MASTERS", label: `Masters (${counts.m})` },
          { v: "PHD", label: `PhD (${counts.p})` },
        ] as const).map((f) => (
          <button
            key={f.v}
            onClick={() => setFilter(f.v as "ALL" | "MASTERS" | "PHD")}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              filter === f.v ? "bg-teal-700 text-white" : "bg-white text-slate-600"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="skeleton h-64 rounded-2xl" />
      ) : !filtered?.length ? (
        <EmptyState
          title="No theses yet"
          description="Add a Masters or PhD student thesis to start tracking its milestones on a timeline."
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((t) => {
            const deg = meta(DEGREES, t.degree);
            const st = meta(THESIS_STATUSES, t.status);
            return (
              <Card key={t.id}>
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-teal-600" />
                        <span className="font-semibold text-slate-900">{t.studentName}</span>
                        <Badge className={deg.color}>{deg.label}</Badge>
                        <Badge className={st.color}>{st.label}</Badge>
                        {t.personId && <Badge className="bg-teal-50 text-teal-700">Portal linked</Badge>}
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{t.title}</p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {t.startDate ? formatDate(t.startDate) : "—"} → {t.expectedEndDate ? formatDate(t.expectedEndDate) : "—"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Select
                        value={t.status}
                        onChange={(e) => quickPatch(t.id, { status: e.target.value })}
                        className="h-8 text-xs"
                      >
                        {THESIS_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </Select>
                      <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => openEdit(t)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <button onClick={() => remove(t.id)} className="rounded-lg p-1.5 text-red-400 hover:bg-red-50" aria-label="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 overflow-x-auto border-t border-slate-100 pt-3">
                    <Gantt thesis={t} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit dialog */}
      <DialogRoot open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent title={editing ? `Edit — ${editing.studentName}` : "Edit thesis"}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Student name</Label>
                <Input value={editFields.studentName} onChange={(e) => setEditFields((f) => ({ ...f, studentName: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={editFields.status} onChange={(e) => setEditFields((f) => ({ ...f, status: e.target.value }))} className="mt-1">
                  {THESIS_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div>
              <Label>Portal student</Label>
              <Select
                value={editFields.personId}
                onChange={(e) => setEditFields((f) => ({ ...f, personId: e.target.value }))}
                className="mt-1"
              >
                <option value="">Not linked</option>
                {people?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.portalEnabled ? "" : " (portal not enabled)"}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-xs text-slate-400">
                Linking shows this thesis & timeline in the student&apos;s portal (and syncs the name).
              </p>
            </div>
            <div>
              <Label>Thesis title</Label>
              <Textarea value={editFields.title} onChange={(e) => setEditFields((f) => ({ ...f, title: e.target.value }))} rows={2} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start date</Label>
                <Input type="date" value={editFields.startDate} onChange={(e) => setEditFields((f) => ({ ...f, startDate: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Expected end</Label>
                <Input type="date" value={editFields.expectedEndDate} onChange={(e) => setEditFields((f) => ({ ...f, expectedEndDate: e.target.value }))} className="mt-1" />
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <Label>Milestones</Label>
                <Button size="sm" variant="outline" type="button" onClick={addMilestone} className="h-7 gap-1 text-xs">
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </div>
              <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-2">
                {msEdit.length === 0 ? (
                  <p className="p-2 text-xs text-slate-400">No milestones. Add one above.</p>
                ) : (
                  msEdit.map((m, i) => (
                    <div key={m.id} className="rounded-lg border border-slate-100 p-2">
                      <div className="flex items-center gap-2">
                        <Input value={m.title} onChange={(e) => updateMs(i, { title: e.target.value })} className="h-8 flex-1 text-sm" />
                        <button onClick={() => setMsEdit((p) => p.filter((_, j) => j !== i))} className="text-slate-300 hover:text-red-400" aria-label="Remove">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        <Input type="date" value={m.start} onChange={(e) => updateMs(i, { start: e.target.value })} className="h-8 text-xs" />
                        <Input type="date" value={m.end} onChange={(e) => updateMs(i, { end: e.target.value })} className="h-8 text-xs" />
                        <Select value={m.status} onChange={(e) => updateMs(i, { status: e.target.value })} className="h-8 text-xs">
                          {MILESTONE_STATUSES.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </Select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <Button onClick={saveEdit} className="w-full">Save changes</Button>
          </div>
        </DialogContent>
      </DialogRoot>
    </PageTransition>
  );
}
