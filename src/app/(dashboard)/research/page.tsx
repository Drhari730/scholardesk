"use client";

import { useState } from "react";
import { Plus, Users, CheckCircle2, Circle } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import {
  DialogRoot,
  DialogTrigger,
  DialogContent,
} from "@/components/ui/dialog";
import { PageTransition } from "@/components/ui/motion";
import { useFetch, apiPost, apiPatch, apiDelete } from "@/lib/hooks";
import { formatDate } from "@/lib/utils";
import {
  PROJECT_STATUSES,
  TASK_STATUSES,
  PRIORITIES,
  getStatusMeta,
} from "@/lib/constants";

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  startDate: string | null;
  endDate: string | null;
  tags: string | null;
  members: Array<{ id: string; person: { id: string; name: string; role: string } }>;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    dueDate: string | null;
    assignee: { name: string } | null;
  }>;
  _count: { tasks: number };
}

interface Person {
  id: string;
  name: string;
  role: string;
}

export default function ResearchPage() {
  const { data: projects, loading, refetch } = useFetch<Project[]>("/api/projects");
  const { data: people } = useFetch<Person[]>("/api/people");
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  async function createProject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await apiPost("/api/projects", Object.fromEntries(fd));
    setShowProjectForm(false);
    refetch();
  }

  async function createTask(e: React.FormEvent<HTMLFormElement>, projectId: string) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await apiPost("/api/tasks", {
      ...Object.fromEntries(fd),
      projectId,
      createReminder: fd.get("createReminder") === "on",
    });
    setShowTaskForm(null);
    refetch();
  }

  async function toggleTask(taskId: string, currentStatus: string) {
    await apiPatch(`/api/tasks/${taskId}`, {
      status: currentStatus === "COMPLETED" ? "TODO" : "COMPLETED",
    });
    refetch();
  }

  async function deleteProject(id: string) {
    if (!confirm("Delete this project?")) return;
    await apiDelete(`/api/projects/${id}`);
    refetch();
  }

  return (
    <PageTransition>
      <PageHeader
        title="Research Projects"
        description="Track your research ideas, active studies, and team collaborations."
        action={
          <DialogRoot open={showProjectForm} onOpenChange={setShowProjectForm}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> New Project
              </Button>
            </DialogTrigger>
            <DialogContent title="Create Research Project">
              <form onSubmit={createProject} className="space-y-4">
                <div>
                  <Label htmlFor="title">Project Title</Label>
                  <Input id="title" name="title" required className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select id="status" name="status" className="mt-1">
                      {PROJECT_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select id="priority" name="priority" className="mt-1">
                      {PRIORITIES.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input id="startDate" name="startDate" type="date" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <Input id="endDate" name="endDate" type="date" className="mt-1" />
                  </div>
                </div>
                <Button type="submit" className="w-full">Create Project</Button>
              </form>
            </DialogContent>
          </DialogRoot>
        }
      />

      {loading ? (
        <div className="skeleton h-64 rounded-2xl" />
      ) : !projects?.length ? (
        <EmptyState
          title="No research projects yet"
          description="Start by creating your first research project to track ideas and team progress."
          action={
            <Button onClick={() => setShowProjectForm(true)}>
              <Plus className="h-4 w-4" /> Create Project
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {projects.map((project) => {
            const statusMeta = getStatusMeta(PROJECT_STATUSES, project.status);
            const priorityMeta = getStatusMeta(PRIORITIES, project.priority);
            const completedTasks = project.tasks.filter((t) => t.status === "COMPLETED").length;

            return (
              <Card key={project.id} className="overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{project.title}</CardTitle>
                      {project.description && (
                        <p className="mt-1 text-sm text-slate-500 line-clamp-2">
                          {project.description}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={statusMeta.color}>{statusMeta.label}</Badge>
                      <Badge className={priorityMeta.color}>{priorityMeta.label}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    {project.startDate && <span>Start: {formatDate(project.startDate)}</span>}
                    {project.endDate && <span>End: {formatDate(project.endDate)}</span>}
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {project.members.length} members
                    </span>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-700">
                        Tasks ({completedTasks}/{project.tasks.length})
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowTaskForm(project.id)}
                      >
                        <Plus className="h-3 w-3" /> Add Task
                      </Button>
                    </div>
                    <div className="space-y-1.5">
                      {project.tasks.slice(0, 4).map((task) => {
                        const taskMeta = getStatusMeta(TASK_STATUSES, task.status);
                        return (
                          <div
                            key={task.id}
                            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50"
                          >
                            <button
                              onClick={() => toggleTask(task.id, task.status)}
                              className="text-slate-400 hover:text-teal-600"
                            >
                              {task.status === "COMPLETED" ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <Circle className="h-4 w-4" />
                              )}
                            </button>
                            <span
                              className={`flex-1 text-sm ${
                                task.status === "COMPLETED"
                                  ? "text-slate-400 line-through"
                                  : "text-slate-700"
                              }`}
                            >
                              {task.title}
                            </span>
                            {task.assignee && (
                              <span className="text-xs text-slate-400">
                                {task.assignee.name}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setSelectedProject(
                          selectedProject === project.id ? null : project.id
                        )
                      }
                    >
                      {selectedProject === project.id ? "Hide" : "Manage"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => deleteProject(project.id)}
                    >
                      Delete
                    </Button>
                  </div>

                  {selectedProject === project.id && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="mb-2 text-sm font-medium">Team Members</p>
                      {project.members.length === 0 ? (
                        <p className="text-xs text-slate-400">No members added</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {project.members.map((m) => (
                            <Badge key={m.id} className="bg-white text-slate-600">
                              {m.person.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {showTaskForm && (
        <DialogRoot open={!!showTaskForm} onOpenChange={() => setShowTaskForm(null)}>
          <DialogContent title="Add Task">
            <form
              onSubmit={(e) => createTask(e, showTaskForm)}
              className="space-y-4"
            >
              <div>
                <Label>Task Title</Label>
                <Input name="title" required className="mt-1" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea name="description" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Priority</Label>
                  <Select name="priority" className="mt-1">
                    {PRIORITIES.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Due Date</Label>
                  <Input name="dueDate" type="date" className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Assign To</Label>
                <Select name="assigneeId" className="mt-1">
                  <option value="">Unassigned</option>
                  {people?.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" name="createReminder" />
                Create reminder for assignee
              </label>
              <Button type="submit" className="w-full">Add Task</Button>
            </form>
          </DialogContent>
        </DialogRoot>
      )}
    </PageTransition>
  );
}
