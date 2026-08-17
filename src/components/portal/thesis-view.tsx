"use client";

import { useState } from "react";
import { GraduationCap, CalendarDays, Download, Save, Loader2, Plus, X, Info, SlidersHorizontal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { DEGREES, THESIS_STATUSES, MILESTONE_STATUSES } from "@/lib/constants";
import { openGanttPrint } from "@/lib/print-gantt";

type Milestone = { id: string; title: string; start: string; end: string; status: string };

interface Thesis {
  id?: string;
  title: string;
  studentName?: string;
  degree: string;
  status: string;
  supervisor?: string | null;
  startDate: string | null;
  expectedEndDate: string | null;
  milestones: string | null;
  instructions?: string | null;
}

function pick<T extends { value: string }>(list: readonly T[], v: string): T {
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

export function ThesisView({ thesis }: { thesis: Thesis }) {
  const [ms, setMs] = useState<Milestone[]>(() => parseMs(thesis.milestones).sort((a, b) => (a.start < b.start ? -1 : 1)));
  const [status, setStatus] = useState(thesis.status);
  const [dirty, setDirty] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState("");

  const done = ms.filter((m) => m.status === "DONE").length;
  const progress = ms.length ? Math.round((done / ms.length) * 100) : 0;
  const deg = pick(DEGREES, thesis.degree);
  const st = pick(THESIS_STATUSES, status);

  function update(i: number, patch: Partial<Milestone>) {
    setMs((p) => p.map((m, j) => (j === i ? { ...m, ...patch } : m)));
    setDirty(true);
    setSaved("");
  }
  function addMs() {
    setMs((p) => [
      ...p,
      {
        id: Math.random().toString(36).slice(2, 10),
        title: "New milestone",
        start: new Date().toISOString().slice(0, 10),
        end: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
        status: "PLANNED",
      },
    ]);
    setDirty(true);
    setEditMode(true);
  }
  function removeMs(i: number) {
    setMs((p) => p.filter((_, j) => j !== i));
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    setSaved("");
    try {
      const res = await fetch("/api/portal/thesis", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestones: JSON.stringify(ms), status }),
      });
      if (res.ok) {
        setDirty(false);
        setSaved("Saved — your supervisor has been notified.");
      } else {
        setSaved("Could not save. Please try again.");
      }
    } catch {
      setSaved("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <div className="mb-1 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
          <GraduationCap className="h-5 w-5 text-teal-600" /> My Thesis
        </h2>
        <Button
          size="sm"
          variant="outline"
          className="gap-1"
          onClick={() => openGanttPrint({ ...thesis, studentName: thesis.studentName ?? "", milestones: JSON.stringify(ms) })}
        >
          <Download className="h-3.5 w-3.5" /> Download timeline
        </Button>
      </div>
      <p className="mb-3 text-xs text-slate-500">Track your progress, update milestones, and download your Gantt chart (e.g. for IEC).</p>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={deg.color}>{deg.label}</Badge>
            <Select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setDirty(true); setSaved(""); }}
              className="h-7 w-auto text-xs"
            >
              {THESIS_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>
            <Badge className={st.color}>{st.label}</Badge>
          </div>
          <p className="mt-2 font-medium text-slate-900">{thesis.title}</p>
          {(thesis.startDate || thesis.expectedEndDate) && (
            <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
              <CalendarDays className="h-3.5 w-3.5" />
              {thesis.startDate ? formatDate(thesis.startDate) : "—"} → {thesis.expectedEndDate ? formatDate(thesis.expectedEndDate) : "—"}
            </p>
          )}

          {thesis.instructions && (
            <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-blue-800">
                <Info className="h-3.5 w-3.5" /> Instructions from your supervisor
              </p>
              <p className="mt-1 whitespace-pre-line text-sm text-blue-900">{thesis.instructions}</p>
            </div>
          )}

          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
              <span>Overall progress</span>
              <span>{progress}% · {done}/{ms.length} milestones</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
            <p className="text-xs font-medium text-slate-600">Milestones</p>
            <div className="flex gap-2">
              <button onClick={() => setEditMode((v) => !v)} className="flex items-center gap-1 text-xs text-teal-700 hover:underline">
                <SlidersHorizontal className="h-3.5 w-3.5" /> {editMode ? "Done editing" : "Edit dates"}
              </button>
              <button onClick={addMs} className="flex items-center gap-1 text-xs text-teal-700 hover:underline">
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
          </div>

          <div className="mt-2 space-y-2">
            {ms.map((m, i) => {
              const mm = pick(MILESTONE_STATUSES, m.status);
              return (
                <div key={m.id} className="rounded-xl border border-slate-100 p-2.5">
                  <div className="flex items-center gap-2">
                    {editMode ? (
                      <Input value={m.title} onChange={(e) => update(i, { title: e.target.value })} className="h-8 flex-1 text-sm" />
                    ) : (
                      <p className={`flex-1 text-sm ${m.status === "DONE" ? "text-slate-400 line-through" : "text-slate-700"}`}>{m.title}</p>
                    )}
                    <Select value={m.status} onChange={(e) => update(i, { status: e.target.value })} className={`h-8 w-auto text-xs ${mm.color}`}>
                      {MILESTONE_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </Select>
                    {editMode && (
                      <button onClick={() => removeMs(i)} className="text-slate-300 hover:text-red-400" aria-label="Remove">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {editMode ? (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <Input type="date" value={m.start} onChange={(e) => update(i, { start: e.target.value })} className="h-8 text-xs" />
                      <Input type="date" value={m.end} onChange={(e) => update(i, { end: e.target.value })} className="h-8 text-xs" />
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-slate-400">{formatDate(m.start)} → {formatDate(m.end)}</p>
                  )}
                </div>
              );
            })}
          </div>

          {(dirty || saved) && (
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-xs text-teal-700">{saved}</span>
              {dirty && (
                <Button size="sm" onClick={save} disabled={saving} className="gap-1">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save changes
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
