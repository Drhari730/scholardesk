"use client";

import { Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useFetch, apiPost, apiPatch, apiDelete } from "@/lib/hooks";
import { formatDate } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  status: string;
  dueDate: string | null;
  assignee: { name: string } | null;
}

export function ThesisTasks({ thesisId, linked }: { thesisId: string; linked: boolean }) {
  const { data: tasks, refetch } = useFetch<Task[]>(`/api/theses/${thesisId}/tasks`);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await apiPost(`/api/theses/${thesisId}/tasks`, Object.fromEntries(fd));
    (e.target as HTMLFormElement).reset();
    refetch();
  }

  async function toggle(t: Task) {
    await apiPatch(`/api/tasks/${t.id}`, { status: t.status === "COMPLETED" ? "TODO" : "COMPLETED" });
    refetch();
  }

  async function remove(id: string) {
    await apiDelete(`/api/tasks/${id}`);
    refetch();
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        {linked
          ? "Tasks are assigned to the linked student and appear in their portal (they get an email)."
          : "This thesis isn't linked to a portal student, so tasks are tracked here only. Link a student in Edit to assign & notify them."}
      </p>

      <form onSubmit={create} className="space-y-3 rounded-xl border border-slate-100 p-3">
        <div>
          <Label>New task</Label>
          <Input name="title" required className="mt-1" placeholder="e.g. Submit ethics application draft" />
        </div>
        <div>
          <Label>Due date (optional)</Label>
          <Input name="dueDate" type="date" className="mt-1" />
        </div>
        <Button type="submit" size="sm" className="w-full">Add Task</Button>
      </form>

      <div className="space-y-2">
        {!tasks?.length ? (
          <p className="text-sm text-slate-400">No tasks yet.</p>
        ) : (
          tasks.map((t) => (
            <div key={t.id} className="flex items-center gap-2 rounded-lg border border-slate-100 p-2.5">
              <button
                onClick={() => toggle(t)}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  t.status === "COMPLETED" ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300"
                }`}
              >
                {t.status === "COMPLETED" && <Check className="h-3 w-3" />}
              </button>
              <div className="min-w-0 flex-1">
                <p className={`text-sm ${t.status === "COMPLETED" ? "text-slate-400 line-through" : "text-slate-700"}`}>
                  {t.title}
                </p>
                <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                  {t.dueDate && <span>Due {formatDate(t.dueDate)}</span>}
                  {t.assignee && <Badge className="bg-teal-50 text-teal-700">{t.assignee.name}</Badge>}
                </div>
              </div>
              <button onClick={() => remove(t.id)} className="text-red-300 hover:text-red-500" aria-label="Delete">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
