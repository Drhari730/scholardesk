"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Target, Trash2, Calendar, Check, X, Loader2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import { MANUSCRIPT_STAGES } from "@/lib/constants";

const STATUSES = [
  { value: "ACTIVE", label: "Active", color: "bg-emerald-100 text-emerald-700" },
  { value: "ON_HOLD", label: "On Hold", color: "bg-amber-100 text-amber-700" },
  { value: "COMPLETED", label: "Completed", color: "bg-slate-100 text-slate-700" },
] as const;

const PRIORITIES = [
  { value: "LOW", label: "Low", color: "bg-slate-100 text-slate-600" },
  { value: "MEDIUM", label: "Medium", color: "bg-blue-100 text-blue-600" },
  { value: "HIGH", label: "High", color: "bg-orange-100 text-orange-600" },
  { value: "URGENT", label: "Urgent", color: "bg-red-100 text-red-600" },
] as const;

type ChecklistItem = { text: string; done: boolean };

interface Project {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  priority: string;
  progress: number;
  kind: string;
  stage: string | null;
  journal: string | null;
  dueDate: string | null;
  checklist: string | null;
}

function meta<T extends { value: string; label: string; color: string }>(list: readonly T[], value: string) {
  return list.find((s) => s.value === value) ?? list[0];
}

function parseChecklist(raw: string | null): ChecklistItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((i) => typeof i?.text === "string") : [];
  } catch {
    return [];
  }
}

export function PortalPersonalProjects() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newKind, setNewKind] = useState<"MANUSCRIPT" | "GENERAL">("MANUSCRIPT");
  const [newItem, setNewItem] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/portal/personal-projects", { credentials: "include" });
      if (r.ok) setProjects(await r.json());
      else setProjects([]);
    } catch {
      setProjects([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    try {
      const r = await fetch("/api/portal/personal-projects", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(fd)),
      });
      if (r.ok) {
        (e.target as HTMLFormElement).reset();
        setShowForm(false);
        load();
      }
    } finally {
      setSaving(false);
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    await fetch(`/api/portal/personal-projects/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this project?")) return;
    await fetch(`/api/portal/personal-projects/${id}`, { method: "DELETE", credentials: "include" });
    load();
  }

  async function updateChecklist(p: Project, items: ChecklistItem[]) {
    const body: Record<string, unknown> = { checklist: JSON.stringify(items) };
    if (p.kind !== "MANUSCRIPT") {
      const done = items.filter((i) => i.done).length;
      body.progress = items.length ? Math.round((done / items.length) * 100) : p.progress;
    }
    await patch(p.id, body);
  }

  function toggleItem(p: Project, idx: number) {
    const items = parseChecklist(p.checklist);
    if (!items[idx]) return;
    items[idx].done = !items[idx].done;
    updateChecklist(p, items);
  }

  function removeItem(p: Project, idx: number) {
    const items = parseChecklist(p.checklist);
    items.splice(idx, 1);
    updateChecklist(p, items);
  }

  function addItem(p: Project) {
    const text = (newItem[p.id] ?? "").trim();
    if (!text) return;
    const items = parseChecklist(p.checklist);
    items.push({ text, done: false });
    setNewItem((prev) => ({ ...prev, [p.id]: "" }));
    updateChecklist(p, items);
  }

  return (
    <section>
      <div className="mb-1 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
          <Target className="h-5 w-5 text-teal-600" /> My Personal Projects
        </h2>
        <Button size="sm" variant="outline" onClick={() => setShowForm((s) => !s)} className="gap-1">
          <Plus className="h-3.5 w-3.5" /> New
        </Button>
      </div>
      <p className="mb-3 flex items-center gap-1.5 text-xs text-slate-500">
        <Share2 className="h-3.5 w-3.5" /> Projects you create here are automatically shared with Dr. Hari Prakash.
      </p>

      {showForm && (
        <Card className="mb-3">
          <CardContent className="p-4">
            <form onSubmit={create} className="space-y-3">
              <div>
                <Label>Type</Label>
                <Select
                  name="kind"
                  value={newKind}
                  onChange={(e) => setNewKind(e.target.value as "MANUSCRIPT" | "GENERAL")}
                  className="mt-1"
                >
                  <option value="MANUSCRIPT">Manuscript / Paper</option>
                  <option value="GENERAL">General project</option>
                </Select>
              </div>
              <div>
                <Label>Title</Label>
                <Input
                  name="title"
                  required
                  className="mt-1"
                  placeholder={newKind === "MANUSCRIPT" ? "Manuscript title" : "Project title"}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea name="description" className="mt-1" rows={2} />
              </div>
              {newKind === "MANUSCRIPT" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Target journal</Label>
                    <Input name="journal" className="mt-1" placeholder="e.g. BMJ Global Health" />
                  </div>
                  <div>
                    <Label>Stage</Label>
                    <Select name="stage" className="mt-1" defaultValue="IDEA">
                      {MANUSCRIPT_STAGES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </Select>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{newKind === "MANUSCRIPT" ? "Field / area" : "Category"}</Label>
                  <Input name="category" className="mt-1" />
                </div>
                <div>
                  <Label>Due date</Label>
                  <Input name="dueDate" type="date" className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Status</Label>
                  <Select name="status" className="mt-1" defaultValue="ACTIVE">
                    {STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select name="priority" className="mt-1" defaultValue="MEDIUM">
                    {PRIORITIES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </Select>
                </div>
              </div>
              <Button type="submit" disabled={saving} className="w-full gap-2">
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Create & Share"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {projects === null ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : projects.length === 0 ? (
        <p className="text-sm text-slate-400">
          No personal projects yet. Tap <strong>New</strong> to create one — it will be shared with Dr. Hari.
        </p>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => {
            const statusMeta = meta(STATUSES, p.status);
            const prioMeta = meta(PRIORITIES, p.priority);
            const items = parseChecklist(p.checklist);
            return (
              <Card key={p.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{p.title}</p>
                      {p.category && <p className="text-xs text-teal-600">{p.category}</p>}
                      {p.kind === "MANUSCRIPT" && p.journal && (
                        <p className="truncate text-xs text-slate-500">Journal: {p.journal}</p>
                      )}
                    </div>
                    <button
                      onClick={() => remove(p.id)}
                      className="shrink-0 rounded-lg p-1 text-red-400 hover:bg-red-50"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {p.description && <p className="text-sm text-slate-600">{p.description}</p>}
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={statusMeta.color}>{statusMeta.label}</Badge>
                    <Badge className={prioMeta.color}>{prioMeta.label}</Badge>
                    {p.kind === "MANUSCRIPT" && p.stage && (
                      <Badge className={meta(MANUSCRIPT_STAGES, p.stage).color}>
                        {meta(MANUSCRIPT_STAGES, p.stage).label}
                      </Badge>
                    )}
                    {p.dueDate && (
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Calendar className="h-3 w-3" /> {formatDate(p.dueDate)}
                      </span>
                    )}
                  </div>
                  {p.kind === "MANUSCRIPT" ? (
                    <div className="space-y-2">
                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                          <span>Manuscript progress</span>
                          <span>{p.progress}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-teal-600 transition-all"
                            style={{ width: `${p.progress}%` }}
                          />
                        </div>
                      </div>
                      <Select
                        value={p.stage ?? "IDEA"}
                        onChange={(e) => patch(p.id, { stage: e.target.value })}
                        className="h-8 text-xs"
                      >
                        {MANUSCRIPT_STAGES.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </Select>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                        <span>Progress</span>
                        <span>{p.progress}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={p.progress}
                        onChange={(e) => patch(p.id, { progress: Number(e.target.value) })}
                        className="h-2 w-full cursor-pointer accent-teal-600"
                      />
                    </div>
                  )}
                  {items.length > 0 && (
                    <div className="space-y-1.5">
                      {items.map((it, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <button
                            onClick={() => toggleItem(p, idx)}
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                              it.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300"
                            }`}
                          >
                            {it.done && <Check className="h-3 w-3" />}
                          </button>
                          <span className={`flex-1 text-sm ${it.done ? "text-slate-400 line-through" : "text-slate-700"}`}>
                            {it.text}
                          </span>
                          <button
                            onClick={() => removeItem(p, idx)}
                            className="text-slate-300 hover:text-red-400"
                            aria-label="Remove item"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Input
                      value={newItem[p.id] ?? ""}
                      onChange={(e) => setNewItem((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addItem(p);
                        }
                      }}
                      placeholder="Add a checklist item…"
                      className="h-8 text-sm"
                    />
                    <Button size="sm" variant="outline" type="button" onClick={() => addItem(p)}>
                      Add
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
                    <Select
                      value={p.status}
                      onChange={(e) => patch(p.id, { status: e.target.value })}
                      className="h-8 flex-1 text-xs"
                    >
                      {STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </Select>
                    <Select
                      value={p.priority}
                      onChange={(e) => patch(p.id, { priority: e.target.value })}
                      className="h-8 flex-1 text-xs"
                    >
                      {PRIORITIES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </Select>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
