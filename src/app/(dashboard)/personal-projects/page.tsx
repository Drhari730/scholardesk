"use client";

import { useState } from "react";
import { Plus, Trash2, Calendar, Check, X, Users, UserCheck } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { DialogRoot, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { PageTransition } from "@/components/ui/motion";
import { useFetch, apiPost, apiPatch, apiDelete } from "@/lib/hooks";
import { formatDate } from "@/lib/utils";
import { MANUSCRIPT_STAGES } from "@/lib/constants";

const STATUSES = [
  { value: "ACTIVE", label: "Active", color: "bg-emerald-100 text-emerald-700" },
  { value: "ON_HOLD", label: "On Hold", color: "bg-amber-100 text-amber-700" },
  { value: "COMPLETED", label: "Completed", color: "bg-slate-100 text-slate-700" },
  { value: "ARCHIVED", label: "Archived", color: "bg-gray-100 text-gray-600" },
] as const;

const PRIORITIES = [
  { value: "LOW", label: "Low", color: "bg-slate-100 text-slate-600" },
  { value: "MEDIUM", label: "Medium", color: "bg-blue-100 text-blue-600" },
  { value: "HIGH", label: "High", color: "bg-orange-100 text-orange-600" },
  { value: "URGENT", label: "Urgent", color: "bg-red-100 text-red-600" },
] as const;

type ChecklistItem = { text: string; done: boolean };

interface PersonalProject {
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
  notes: string | null;
  createdById: string | null;
  createdByName: string | null;
  createdBy: { id: string; name: string } | null;
}

interface TeamPerson {
  id: string;
  name: string;
  email: string | null;
  role: string;
  portalEnabled: boolean;
  personalProjectMember: boolean;
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

export default function PersonalProjectsPage() {
  const { data: projects, loading, refetch } = useFetch<PersonalProject[]>("/api/personal-projects");
  const { data: team, refetch: refetchTeam } = useFetch<TeamPerson[]>("/api/personal-projects/team");
  const [showForm, setShowForm] = useState(false);
  const [showTeam, setShowTeam] = useState(false);
  const [filter, setFilter] = useState<"all" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED">("all");
  const [author, setAuthor] = useState<"all" | "mine" | "team">("all");
  const [newKind, setNewKind] = useState<"MANUSCRIPT" | "GENERAL">("MANUSCRIPT");
  const [newItem, setNewItem] = useState<Record<string, string>>({});

  async function toggleMember(personId: string, member: boolean) {
    await apiPatch("/api/personal-projects/team", { personId, member });
    refetchTeam();
  }

  async function createProject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await apiPost("/api/personal-projects", Object.fromEntries(fd));
    setShowForm(false);
    refetch();
  }

  async function patch(id: string, body: Record<string, unknown>) {
    await apiPatch(`/api/personal-projects/${id}`, body);
    refetch();
  }

  async function remove(id: string) {
    if (!confirm("Delete this personal project?")) return;
    await apiDelete(`/api/personal-projects/${id}`);
    refetch();
  }

  async function updateChecklist(p: PersonalProject, items: ChecklistItem[]) {
    const body: Record<string, unknown> = { checklist: JSON.stringify(items) };
    // Manuscript progress is driven by stage, not the checklist
    if (p.kind !== "MANUSCRIPT") {
      const done = items.filter((i) => i.done).length;
      body.progress = items.length ? Math.round((done / items.length) * 100) : p.progress;
    }
    await patch(p.id, body);
  }

  function toggleItem(p: PersonalProject, idx: number) {
    const items = parseChecklist(p.checklist);
    if (!items[idx]) return;
    items[idx].done = !items[idx].done;
    updateChecklist(p, items);
  }

  function removeItem(p: PersonalProject, idx: number) {
    const items = parseChecklist(p.checklist);
    items.splice(idx, 1);
    updateChecklist(p, items);
  }

  function addItem(p: PersonalProject) {
    const text = (newItem[p.id] ?? "").trim();
    if (!text) return;
    const items = parseChecklist(p.checklist);
    items.push({ text, done: false });
    setNewItem((prev) => ({ ...prev, [p.id]: "" }));
    updateChecklist(p, items);
  }

  const filtered = projects?.filter((p) => {
    if (filter !== "all" && p.status !== filter) return false;
    if (author === "mine" && p.createdById) return false;
    if (author === "team" && !p.createdById) return false;
    return true;
  });
  const activeCount = projects?.filter((p) => p.status === "ACTIVE").length ?? 0;
  const teamCount = team?.filter((t) => t.personalProjectMember).length ?? 0;
  const sharedCount = projects?.filter((p) => p.createdById).length ?? 0;

  return (
    <PageTransition>
      <PageHeader
        title="Personal Projects"
        description="Your private workspace — personal goals and projects, separate from research and teaching."
        action={
          <div className="flex gap-2">
          <DialogRoot open={showTeam} onOpenChange={setShowTeam}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Users className="h-4 w-4" /> Team{teamCount > 0 ? ` (${teamCount})` : ""}
              </Button>
            </DialogTrigger>
            <DialogContent title="Personal Projects Team">
              <p className="mb-3 text-sm text-slate-500">
                Members you enable can create &amp; share their own personal projects from their portal — those
                appear here automatically. They need portal access (People → enable portal) to sign in.
              </p>
              <div className="max-h-96 space-y-2 overflow-y-auto">
                {!team?.length ? (
                  <p className="text-sm text-slate-400">No people yet. Add people in the People section first.</p>
                ) : (
                  team.map((person) => (
                    <div
                      key={person.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">{person.name}</p>
                        <p className="text-xs text-slate-400">
                          {person.role.replace(/_/g, " ")}
                          {person.portalEnabled ? "" : " · no portal access yet"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleMember(person.id, !person.personalProjectMember)}
                        className={`flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                          person.personalProjectMember
                            ? "bg-teal-600 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {person.personalProjectMember ? (
                          <>
                            <UserCheck className="h-3.5 w-3.5" /> Member
                          </>
                        ) : (
                          "Add as member"
                        )}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </DialogRoot>
          <DialogRoot open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> New Project
              </Button>
            </DialogTrigger>
            <DialogContent title="New Personal Project">
              <form onSubmit={createProject} className="space-y-4">
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
                    placeholder={newKind === "MANUSCRIPT" ? "Manuscript title" : "e.g. Learn Spanish"}
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
                    <Input name="category" className="mt-1" placeholder={newKind === "MANUSCRIPT" ? "e.g. Epidemiology" : "Health, Finance…"} />
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
                <div>
                  <Label>Notes</Label>
                  <Textarea name="notes" className="mt-1" rows={2} />
                </div>
                <Button type="submit" className="w-full">Create Project</Button>
              </form>
            </DialogContent>
          </DialogRoot>
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {(["all", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              filter === f ? "bg-teal-700 text-white" : "bg-white text-slate-600"
            }`}
          >
            {f === "all" ? "All" : meta(STATUSES, f).label}
            {f === "ACTIVE" && activeCount > 0 ? ` (${activeCount})` : ""}
          </button>
        ))}
      </div>

      {(sharedCount > 0 || teamCount > 0) && (
        <div className="mb-6 flex flex-wrap gap-2">
          {(["all", "mine", "team"] as const).map((a) => (
            <button
              key={a}
              onClick={() => setAuthor(a)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                author === a ? "bg-slate-800 text-white" : "bg-white text-slate-600"
              }`}
            >
              {a === "all" ? "Everyone" : a === "mine" ? "Only mine" : `Team${sharedCount > 0 ? ` (${sharedCount})` : ""}`}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="skeleton h-64 rounded-2xl" />
      ) : !filtered?.length ? (
        <EmptyState
          title="No personal projects"
          description="Track your own goals and personal projects here — nobody else can see them."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => {
            const statusMeta = meta(STATUSES, p.status);
            const prioMeta = meta(PRIORITIES, p.priority);
            const items = parseChecklist(p.checklist);
            const overdue = p.dueDate && p.status !== "COMPLETED" && new Date(p.dueDate) < new Date();
            return (
              <Card key={p.id} className="flex flex-col">
                <CardContent className="flex flex-1 flex-col gap-3 p-4">
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
                    {p.createdById ? (
                      <Badge className="bg-indigo-100 text-indigo-700">
                        by {p.createdBy?.name ?? p.createdByName ?? "team member"}
                      </Badge>
                    ) : (
                      <Badge className="bg-slate-100 text-slate-500">You</Badge>
                    )}
                    {p.kind === "MANUSCRIPT" && p.stage && (
                      <Badge className={meta(MANUSCRIPT_STAGES, p.stage).color}>
                        {meta(MANUSCRIPT_STAGES, p.stage).label}
                      </Badge>
                    )}
                    {p.dueDate && (
                      <span
                        className={`flex items-center gap-1 text-xs ${
                          overdue ? "font-medium text-red-600" : "text-slate-400"
                        }`}
                      >
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
                          <span
                            className={`flex-1 text-sm ${
                              it.done ? "text-slate-400 line-through" : "text-slate-700"
                            }`}
                          >
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
                    <Button size="sm" variant="outline" onClick={() => addItem(p)} type="button">
                      Add
                    </Button>
                  </div>

                  <div className="mt-auto flex items-center gap-2 border-t border-slate-100 pt-3">
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
    </PageTransition>
  );
}
