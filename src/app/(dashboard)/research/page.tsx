"use client";

import { useState } from "react";
import { Plus, Users, CheckCircle2, Circle, UserPlus, X } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { DialogRoot, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { PageTransition } from "@/components/ui/motion";
import { useFetch, apiPost, apiPatch, apiDelete } from "@/lib/hooks";
import { formatDate } from "@/lib/utils";
import { PROJECT_STATUSES, PRIORITIES, PERSON_ROLES, getStatusMeta } from "@/lib/constants";

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  members: Array<{ id: string; role: string; person: { id: string; name: string; email: string | null } }>;
  tasks: Array<{ id: string; title: string; status: string; assignee: { name: string } | null }>;
}

interface Person {
  id: string;
  name: string;
  role: string;
  email: string | null;
}

export default function ResearchPage() {
  const { data: projects, loading, refetch } = useFetch<Project[]>("/api/projects");
  const { data: people, refetch: refetchPeople } = useFetch<Person[]>("/api/people");
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState<string | null>(null);
  const [showMemberForm, setShowMemberForm] = useState<string | null>(null);
  const [showNewPersonForm, setShowNewPersonForm] = useState<string | null>(null);
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
      sendEmail: fd.get("sendEmail") === "on",
    });
    setShowTaskForm(null);
    refetch();
  }

  async function addMember(e: React.FormEvent<HTMLFormElement>, projectId: string) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await apiPost("/api/project-members", {
      projectId,
      personId: fd.get("personId"),
      role: fd.get("role") || "MEMBER",
      sendEmail: fd.get("sendEmail") === "on",
    });
    setShowMemberForm(null);
    refetch();
  }

  async function createPersonAndAdd(e: React.FormEvent<HTMLFormElement>, projectId: string) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const person = await apiPost("/api/people", {
      ...Object.fromEntries(fd),
      sendEmail: fd.get("sendEmail") === "on",
    });
    await apiPost("/api/project-members", {
      projectId,
      personId: person.id,
      role: fd.get("memberRole") || "RESEARCH_ASSISTANT",
      sendEmail: fd.get("sendEmail") === "on",
    });
    setShowNewPersonForm(null);
    refetchPeople();
    refetch();
  }

  async function removeMember(memberId: string) {
    await apiDelete(`/api/project-members?id=${memberId}`);
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

  function availablePeople(project: Project) {
    const memberIds = new Set(project.members.map((m) => m.person.id));
    return people?.filter((p) => !memberIds.has(p.id)) ?? [];
  }

  return (
    <PageTransition>
      <PageHeader
        title="Research Projects"
        description="Track projects, assign tasks, invite team members, and email students automatically."
        action={
          <DialogRoot open={showProjectForm} onOpenChange={setShowProjectForm}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4" /> New Project</Button>
            </DialogTrigger>
            <DialogContent title="Create Research Project">
              <form onSubmit={createProject} className="space-y-4">
                <div><Label>Project Title</Label><Input name="title" required className="mt-1" /></div>
                <div><Label>Description</Label><Textarea name="description" className="mt-1" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Status</Label>
                    <Select name="status" className="mt-1">
                      {PROJECT_STATUSES.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
                    </Select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select name="priority" className="mt-1">
                      {PRIORITIES.map((p) => (<option key={p.value} value={p.value}>{p.label}</option>))}
                    </Select>
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
        <EmptyState title="No research projects yet" description="Create your first project to get started." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {projects.map((project) => {
            const statusMeta = getStatusMeta(PROJECT_STATUSES, project.status);
            const isManaging = selectedProject === project.id;
            const completedTasks = project.tasks.filter((t) => t.status === "COMPLETED").length;

            return (
              <Card key={project.id}>
                <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{project.title}</CardTitle>
                    <Badge className={statusMeta.color}>{statusMeta.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="flex gap-4 text-xs text-slate-500">
                    <span><Users className="inline h-3 w-3" /> {project.members.length} members</span>
                    <span>{completedTasks}/{project.tasks.length} tasks done</span>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setShowTaskForm(project.id)}>
                      <Plus className="h-3 w-3" /> Task
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setSelectedProject(isManaging ? null : project.id)}>
                      {isManaging ? "Hide Team" : "Manage Team"}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteProject(project.id)}>Delete</Button>
                  </div>

                  {isManaging && (
                    <div className="rounded-xl border border-teal-100 bg-teal-50/30 p-4">
                      <div className="mb-3 flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => setShowMemberForm(project.id)}>
                          <UserPlus className="h-3 w-3" /> Add Existing
                        </Button>
                        <Button size="sm" onClick={() => setShowNewPersonForm(project.id)}>
                          <Plus className="h-3 w-3" /> Invite New
                        </Button>
                      </div>
                      {project.members.length === 0 ? (
                        <p className="text-xs text-slate-400">No members — add students or colleagues above (emails will be sent if checked).</p>
                      ) : (
                        <div className="space-y-2">
                          {project.members.map((m) => (
                            <div key={m.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
                              <div>
                                <p className="text-sm font-medium">{m.person.name}</p>
                                <p className="text-xs text-slate-400">{m.person.email ?? "No email"}</p>
                              </div>
                              <button onClick={() => removeMember(m.id)} className="text-slate-400 hover:text-red-500">
                                <X className="h-4 w-4" />
                              </button>
                            </div>
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
            <form onSubmit={(e) => createTask(e, showTaskForm)} className="space-y-4">
              <div><Label>Task Title</Label><Input name="title" required className="mt-1" /></div>
              <div><Label>Description</Label><Textarea name="description" className="mt-1" /></div>
              <div><Label>Due Date</Label><Input name="dueDate" type="date" className="mt-1" /></div>
              <div>
                <Label>Assign To</Label>
                <Select name="assigneeId" className="mt-1">
                  <option value="">Unassigned</option>
                  {people?.map((p) => (<option key={p.id} value={p.id}>{p.name} {p.email ? `(${p.email})` : ""}</option>))}
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="createReminder" defaultChecked /> In-app reminder</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="sendEmail" defaultChecked /> Email assignee now</label>
              <Button type="submit" className="w-full">Add Task</Button>
            </form>
          </DialogContent>
        </DialogRoot>
      )}

      {showMemberForm && (
        <DialogRoot open={!!showMemberForm} onOpenChange={() => setShowMemberForm(null)}>
          <DialogContent title="Add Team Member">
            <form onSubmit={(e) => addMember(e, showMemberForm)} className="space-y-4">
              <div>
                <Label>Select Person</Label>
                <Select name="personId" required className="mt-1">
                  <option value="">Choose...</option>
                  {projects?.find((p) => p.id === showMemberForm) &&
                    availablePeople(projects.find((p) => p.id === showMemberForm)!).map((p) => (
                      <option key={p.id} value={p.id}>{p.name} {p.email ? `— ${p.email}` : "(no email)"}</option>
                    ))}
                </Select>
              </div>
              <div>
                <Label>Project Role</Label>
                <Select name="role" className="mt-1">
                  <option value="RESEARCH_ASSISTANT">Research Assistant</option>
                  <option value="STUDENT">Student</option>
                  <option value="CO_INVESTIGATOR">Co-Investigator</option>
                  <option value="MEMBER">Team Member</option>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="sendEmail" defaultChecked /> Send project invitation email</label>
              <Button type="submit" className="w-full">Add to Project</Button>
            </form>
          </DialogContent>
        </DialogRoot>
      )}

      {showNewPersonForm && (
        <DialogRoot open={!!showNewPersonForm} onOpenChange={() => setShowNewPersonForm(null)}>
          <DialogContent title="Invite New Team Member">
            <form onSubmit={(e) => createPersonAndAdd(e, showNewPersonForm)} className="space-y-4">
              <div><Label>Name</Label><Input name="name" required className="mt-1" /></div>
              <div><Label>Email (required for notifications)</Label><Input name="email" type="email" required className="mt-1" /></div>
              <div><Label>Phone</Label><Input name="phone" className="mt-1" /></div>
              <div>
                <Label>Role</Label>
                <Select name="role" className="mt-1">
                  {PERSON_ROLES.map((r) => (<option key={r.value} value={r.value}>{r.label}</option>))}
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="sendEmail" defaultChecked /> Send welcome & project invite email</label>
              <Button type="submit" className="w-full">Invite & Add</Button>
            </form>
          </DialogContent>
        </DialogRoot>
      )}
    </PageTransition>
  );
}
