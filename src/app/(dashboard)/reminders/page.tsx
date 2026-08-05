"use client";

import { useState } from "react";
import { Plus, Bell, Check, AlertTriangle } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import {
  DialogRoot,
  DialogTrigger,
  DialogContent,
} from "@/components/ui/dialog";
import { PageTransition } from "@/components/ui/motion";
import { useFetch, apiPost, apiPatch, apiDelete } from "@/lib/hooks";
import { formatDateTime } from "@/lib/utils";

interface Reminder {
  id: string;
  title: string;
  message: string | null;
  dueDate: string;
  isCompleted: boolean;
  person: { name: string; email: string | null } | null;
  task: { title: string } | null;
  publication: { title: string } | null;
  exam: { title: string } | null;
}

interface Person {
  id: string;
  name: string;
}

export default function RemindersPage() {
  const { data: reminders, loading, refetch } = useFetch<Reminder[]>("/api/reminders");
  const { data: people } = useFetch<Person[]>("/api/people");
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "overdue" | "done">("pending");

  async function createReminder(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await apiPost("/api/reminders", Object.fromEntries(fd));
    setShowForm(false);
    refetch();
  }

  async function toggleComplete(id: string, isCompleted: boolean) {
    await apiPatch(`/api/reminders/${id}`, { isCompleted: !isCompleted });
    refetch();
  }

  async function deleteReminder(id: string) {
    await apiDelete(`/api/reminders/${id}`);
    refetch();
  }

  const now = new Date();
  const filtered = reminders?.filter((r) => {
    if (filter === "done") return r.isCompleted;
    if (filter === "pending") return !r.isCompleted;
    if (filter === "overdue") return !r.isCompleted && new Date(r.dueDate) < now;
    return true;
  });

  const overdueCount =
    reminders?.filter((r) => !r.isCompleted && new Date(r.dueDate) < now).length ?? 0;

  return (
    <PageTransition>
      <PageHeader
        title="Reminders"
        description="Stay on top of deadlines — task nudges, exam alerts, and follow-ups."
        action={
          <DialogRoot open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> New Reminder
              </Button>
            </DialogTrigger>
            <DialogContent title="Create Reminder">
              <form onSubmit={createReminder} className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input name="title" required className="mt-1" />
                </div>
                <div>
                  <Label>Message</Label>
                  <Textarea name="message" className="mt-1" />
                </div>
                <div>
                  <Label>Due Date & Time</Label>
                  <Input name="dueDate" type="datetime-local" required className="mt-1" />
                </div>
                <div>
                  <Label>Notify Person (optional)</Label>
                  <Select name="personId" className="mt-1">
                    <option value="">Myself only</option>
                    {people?.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </Select>
                </div>
                <Button type="submit" className="w-full">Create Reminder</Button>
              </form>
            </DialogContent>
          </DialogRoot>
        }
      />

      {overdueCount > 0 && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          <AlertTriangle className="h-5 w-5" />
          <p className="text-sm">
            <strong>{overdueCount}</strong> overdue reminder{overdueCount > 1 ? "s" : ""} need attention
          </p>
        </div>
      )}

      <div className="mb-6 flex gap-2">
        {(["pending", "overdue", "done", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
              filter === f ? "bg-teal-700 text-white" : "bg-white text-slate-600"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="skeleton h-64 rounded-2xl" />
      ) : !filtered?.length ? (
        <EmptyState
          title="No reminders"
          description="Create reminders for tasks, exams, and publication deadlines."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const isOverdue = !r.isCompleted && new Date(r.dueDate) < now;
            return (
              <Card
                key={r.id}
                className={`transition-opacity ${r.isCompleted ? "opacity-60" : ""} ${
                  isOverdue ? "border-red-200 bg-red-50/30" : ""
                }`}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <button
                    onClick={() => toggleComplete(r.id, r.isCompleted)}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      r.isCompleted
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-slate-300 hover:border-teal-500"
                    }`}
                  >
                    {r.isCompleted && <Check className="h-4 w-4" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className={`font-medium ${
                          r.isCompleted ? "text-slate-400 line-through" : "text-slate-800"
                        }`}
                      >
                        {r.title}
                      </p>
                      {isOverdue && (
                        <Badge className="bg-red-100 text-red-700">Overdue</Badge>
                      )}
                    </div>
                    {r.message && (
                      <p className="mt-0.5 text-sm text-slate-500">{r.message}</p>
                    )}
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Bell className="h-3 w-3" />
                        {formatDateTime(r.dueDate)}
                      </span>
                      {r.person && <span>→ {r.person.name}</span>}
                      {r.task && <span>Task: {r.task.title}</span>}
                      {r.exam && <span>Exam: {r.exam.title}</span>}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-400 shrink-0"
                    onClick={() => deleteReminder(r.id)}
                  >
                    Delete
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </PageTransition>
  );
}
