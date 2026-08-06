"use client";

import { useState } from "react";
import { Plus, Users, CheckCircle2, Circle, UserPlus, X, Pencil } from "lucide-react";
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
import { ResearchGantt } from "@/components/charts/research-gantt";
import { FileAttachments } from "@/components/ui/file-attachments";
import { PageTransition, ScrollReveal } from "@/components/ui/motion";
import { useFetch, apiPost, apiPatch, apiDelete } from "@/lib/hooks";
import { formatDate } from "@/lib/utils";
import {
  PROJECT_STATUSES,
  PRIORITIES,
  PERSON_ROLES,
  RESEARCH_PHASES,
  INDIAN_STATES,
  getStatusMeta,
} from "@/lib/constants";

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  aims: string | null;
  objectives: string | null;
  methodology: string | null;
  studyState: string | null;
  researchPhase: string;
  timeline: string | null;
  startDate: string | null;
  endDate: string | null;
  members: Array<{ id: string; role: string; person: { id: string; name: string; role: string; email: string | null } }>;
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
  email: string | null;
}

export default function ResearchPage() {
  const { data: projects, loading, refetch } = useFetch<Project[]>("/api/projects");
  const { data: people, refetch: refetchPeople } = useFetch<Person[]>("/api/people");
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showTaskForm, setShowTaskForm] = useState<string | null>(null);
  const [showMemberForm, setShowMemberForm] = useState<string | null>(null);
  const [showNewPersonForm, setShowNewPersonForm] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  async function createProject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const memberIds = people
      ?.filter((p) => fd.get(`member_${p.id}`) === "on")
      .map((p) => p.id);
    await apiPost("/api/projects", {
      ...Object.fromEntries(fd),
      notifyTeam: fd.get("notifyTeam") === "on",
      memberIds,
    });
    setShowProjectForm(false);
    refetch();
  }

  function toDateInputValue(date: string | null) {
    if (!date) return "";
    return date.split("T")[0];
  }

  async function updateProject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingProject) return;
    const fd = new FormData(e.currentTarget);
    await apiPatch(`/api/projects/${editingProject.id}`, {
      title: fd.get("title"),
      description: fd.get("description") || null,
      aims: fd.get("aims") || null,
      objectives: fd.get("objectives") || null,
      methodology: fd.get("methodology") || null,
      studyState: fd.get("studyState") || null,
      researchPhase: fd.get("researchPhase"),
      timeline: fd.get("timeline") || null,
      startDate: fd.get("startDate") || null,
      endDate: fd.get("endDate") || null,
      status: fd.get("status"),
      priority: fd.get("priority"),
      sendEmail: false,
    });
    setEditingProject(null);
    refetch();
  }

  async function updatePhase(projectId: string, researchPhase: string) {
    await apiPatch(`/api/projects/${projectId}`, { researchPhase, sendEmail: true });
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
              <form onSubmit={createProject} className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
                <div>
                  <Label>Project Title</Label>
                  <Input name="title" required className="mt-1" placeholder="e.g. Community Health Screening Study" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea name="description" className="mt-1" placeholder="Brief overview of the study" />
                </div>
                <div>
                  <Label>Aims</Label>
                  <Textarea name="aims" className="mt-1" placeholder="Primary aims of the research" />
                </div>
                <div>
                  <Label>Objectives</Label>
                  <Textarea name="objectives" className="mt-1" placeholder="Specific measurable objectives" />
                </div>
                <div>
                  <Label>Methodology</Label>
                  <Textarea name="methodology" className="mt-1" placeholder="Study design, sampling, tools, analysis plan" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Study State / Region</Label>
                    <Select name="studyState" className="mt-1">
                      <option value="">Select state</option>
                      {INDIAN_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label>Research Phase</Label>
                    <Select name="researchPhase" className="mt-1" defaultValue="PROTOCOL_DEVELOPMENT">
                      {RESEARCH_PHASES.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Timeline & Milestones</Label>
                  <Textarea name="timeline" className="mt-1" placeholder="e.g. Month 1-3: Protocol | Month 4-8: Data collection..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Start Date</Label>
                    <Input name="startDate" type="date" className="mt-1" />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input name="endDate" type="date" className="mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Status</Label>
                    <Select name="status" className="mt-1" defaultValue="PLANNING">
                      {PROJECT_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select name="priority" className="mt-1">
                      {PRIORITIES.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </Select>
                  </div>
                </div>
                {people && people.length > 0 && (
                  <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-3">
                    <p className="mb-2 text-sm font-medium text-slate-700">Initial team (optional)</p>
                    <div className="max-h-32 space-y-1 overflow-y-auto">
                      {people.map((p) => (
                        <label key={p.id} className="flex items-center gap-2 text-sm">
                          <input type="checkbox" name={`member_${p.id}`} />
                          {p.name} {p.email ? `(${p.email})` : ""}
                        </label>
                      ))}
                    </div>
                    <label className="mt-2 flex items-center gap-2 text-sm">
                      <input type="checkbox" name="notifyTeam" defaultChecked />
                      Email selected team about new project
                    </label>
                  </div>
                )}
                <Button type="submit" className="w-full">Create Project</Button>
              </form>
            </DialogContent>
          </DialogRoot>
        }
      />

      {projects && projects.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-base">Research Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ResearchGantt projects={projects} />
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="skeleton h-64 rounded-2xl" />
      ) : !projects?.length ? (
        <EmptyState title="No research projects yet" description="Start by creating your first research project." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {projects.map((project, idx) => {
            const statusMeta = getStatusMeta(PROJECT_STATUSES, project.status);
            const priorityMeta = getStatusMeta(PRIORITIES, project.priority);
            const phaseMeta = getStatusMeta(RESEARCH_PHASES, project.researchPhase ?? "PROTOCOL_DEVELOPMENT");
            const completedTasks = project.tasks.filter((t) => t.status === "COMPLETED").length;
            const isManaging = selectedProject === project.id;

            return (
              <ScrollReveal key={project.id} delay={idx * 0.05}>
              <Card className="overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{project.title}</CardTitle>
                      {project.description && (
                        <p className="mt-1 text-sm text-slate-500 line-clamp-2">{project.description}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={statusMeta.color}>{statusMeta.label}</Badge>
                      <Badge className={phaseMeta.color}>{phaseMeta.label}</Badge>
                      <Badge className={priorityMeta.color}>{priorityMeta.label}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {(project.studyState || project.aims) && (
                    <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      {project.studyState && <p><strong>State:</strong> {project.studyState}</p>}
                      {project.aims && <p className="mt-1 line-clamp-2"><strong>Aims:</strong> {project.aims}</p>}
                    </div>
                  )}
                  <div>
                    <Label className="text-xs text-slate-500">Update research phase</Label>
                    <Select
                      value={project.researchPhase ?? "PROTOCOL_DEVELOPMENT"}
                      onChange={(e) => updatePhase(project.id, e.target.value)}
                      className="mt-1 text-xs"
                    >
                      {RESEARCH_PHASES.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {project.members.length} members
                    </span>
                    <span>{completedTasks}/{project.tasks.length} tasks done</span>
                  </div>
                  <FileAttachments entityType="project" entityId={project.id} />

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-700">Tasks</p>
                      <Button size="sm" variant="ghost" onClick={() => setShowTaskForm(project.id)}>
                        <Plus className="h-3 w-3" /> Add Task
                      </Button>
                    </div>
                    <div className="space-y-1.5">
                      {project.tasks.slice(0, 4).map((task) => (
                        <div key={task.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                          <button onClick={() => toggleTask(task.id, task.status)} className="text-slate-400 hover:text-teal-600">
                            {task.status === "COMPLETED" ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <Circle className="h-4 w-4" />
                            )}
                          </button>
                          <span className={`flex-1 text-sm ${task.status === "COMPLETED" ? "text-slate-400 line-through" : "text-slate-700"}`}>
                            {task.title}
                          </span>
                          {task.assignee && <span className="text-xs text-slate-400">{task.assignee.name}</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => setEditingProject(project)}>
                      <Pencil className="h-3 w-3" /> Edit Project
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setSelectedProject(isManaging ? null : project.id)}>
                      {isManaging ? "Hide Team" : "Manage Team"}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteProject(project.id)}>
                      Delete
                    </Button>
                  </div>

                  {isManaging && (
                    <div className="rounded-xl border border-teal-100 bg-gradient-to-br from-teal-50/50 to-white p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-800">Team Members</p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setShowMemberForm(project.id)}>
                            <UserPlus className="h-3 w-3" /> Add Existing
                          </Button>
                          <Button size="sm" onClick={() => { setShowNewPersonForm(project.id); setSelectedProject(project.id); }}>
                            <Plus className="h-3 w-3" /> Invite New
                          </Button>
                        </div>
                      </div>

                      {project.members.length === 0 ? (
                        <p className="text-xs text-slate-400">No team members yet. Add students or colleagues above.</p>
                      ) : (
                        <div className="space-y-2">
                          {project.members.map((m) => (
                            <div key={m.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 shadow-sm">
                              <div>
                                <p className="text-sm font-medium text-slate-800">{m.person.name}</p>
                                <p className="text-xs text-slate-400">
                                  {PERSON_ROLES.find((r) => r.value === m.role)?.label ?? m.role}
                                  {m.person.email && ` · ${m.person.email}`}
                                </p>
                              </div>
                              <button onClick={() => removeMember(m.id)} className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-500">
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
              </ScrollReveal>
            );
          })}
        </div>
      )}

      {editingProject && (
        <DialogRoot open={!!editingProject} onOpenChange={(open) => !open && setEditingProject(null)}>
          <DialogContent title="Edit Research Project">
            <form onSubmit={updateProject} className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
              <div>
                <Label>Project Title</Label>
                <Input name="title" required className="mt-1" defaultValue={editingProject.title} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea name="description" className="mt-1" defaultValue={editingProject.description ?? ""} />
              </div>
              <div>
                <Label>Aims</Label>
                <Textarea name="aims" className="mt-1" defaultValue={editingProject.aims ?? ""} />
              </div>
              <div>
                <Label>Objectives</Label>
                <Textarea name="objectives" className="mt-1" defaultValue={editingProject.objectives ?? ""} />
              </div>
              <div>
                <Label>Methodology</Label>
                <Textarea name="methodology" className="mt-1" defaultValue={editingProject.methodology ?? ""} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Study State / Region</Label>
                  <Select name="studyState" className="mt-1" defaultValue={editingProject.studyState ?? ""}>
                    <option value="">Select state</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Research Phase</Label>
                  <Select name="researchPhase" className="mt-1" defaultValue={editingProject.researchPhase ?? "PROTOCOL_DEVELOPMENT"}>
                    {RESEARCH_PHASES.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </Select>
                </div>
              </div>
              <div>
                <Label>Timeline & Milestones</Label>
                <Textarea name="timeline" className="mt-1" defaultValue={editingProject.timeline ?? ""} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start Date</Label>
                  <Input name="startDate" type="date" className="mt-1" defaultValue={toDateInputValue(editingProject.startDate)} />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input name="endDate" type="date" className="mt-1" defaultValue={toDateInputValue(editingProject.endDate)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Status</Label>
                  <Select name="status" className="mt-1" defaultValue={editingProject.status}>
                    {PROJECT_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select name="priority" className="mt-1" defaultValue={editingProject.priority}>
                    {PRIORITIES.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full">Save Changes</Button>
            </form>
          </DialogContent>
        </DialogRoot>
      )}

      {showTaskForm && (
        <DialogRoot open={!!showTaskForm} onOpenChange={() => setShowTaskForm(null)}>
          <DialogContent title="Add Task">
            <form onSubmit={(e) => createTask(e, showTaskForm)} className="space-y-4">
              <div><Label>Task Title</Label><Input name="title" required className="mt-1" /></div>
              <div><Label>Description</Label><Textarea name="description" className="mt-1" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Priority</Label>
                  <Select name="priority" className="mt-1">
                    {PRIORITIES.map((p) => (<option key={p.value} value={p.value}>{p.label}</option>))}
                  </Select>
                </div>
                <div><Label>Due Date</Label><Input name="dueDate" type="date" className="mt-1" /></div>
              </div>
              <div>
                <Label>Assign To</Label>
                <Select name="assigneeId" className="mt-1">
                  <option value="">Unassigned</option>
                  {people?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.email ? ` (${p.email})` : ""}
                    </option>
                  ))}
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" name="createReminder" defaultChecked /> In-app reminder
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" name="sendEmail" defaultChecked /> Email assignee now
              </label>
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
                  <option value="">Choose from your contacts</option>
                  {projects?.find((p) => p.id === showMemberForm) &&
                    availablePeople(projects.find((p) => p.id === showMemberForm)!).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.email ? `— ${p.email}` : "(no email)"}
                      </option>
                    ))}
                </Select>
                <p className="mt-1 text-xs text-slate-400">
                  Add people first in the <a href="/people" className="text-teal-700 underline">People</a> page if not listed.
                </p>
              </div>
              <div>
                <Label>Project Role</Label>
                <Select name="role" className="mt-1">
                  <option value="MEMBER">Team Member</option>
                  <option value="RESEARCH_ASSISTANT">Research Assistant</option>
                  <option value="CO_INVESTIGATOR">Co-Investigator</option>
                  <option value="STUDENT">Student</option>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" name="sendEmail" defaultChecked /> Send project invitation email
              </label>
              <Button type="submit" className="w-full">Add to Project</Button>
            </form>
          </DialogContent>
        </DialogRoot>
      )}

      {showNewPersonForm && (
        <DialogRoot open={!!showNewPersonForm} onOpenChange={() => setShowNewPersonForm(null)}>
          <DialogContent title="Invite New Team Member">
            <form onSubmit={(e) => createPersonAndAdd(e, showNewPersonForm)} className="space-y-4">
              <p className="text-sm text-slate-500">Add a new person and assign them to this project.</p>
              <div><Label>Name</Label><Input name="name" required className="mt-1" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Email (for notifications)</Label>
                  <Input name="email" type="email" required className="mt-1" />
                </div>
                <div><Label>Phone</Label><Input name="phone" className="mt-1" /></div>
              </div>
              <div>
                <Label>Role</Label>
                <Select name="role" className="mt-1">
                  {PERSON_ROLES.map((r) => (<option key={r.value} value={r.value}>{r.label}</option>))}
                </Select>
              </div>
              <div>
                <Label>Project Role</Label>
                <Select name="memberRole" className="mt-1">
                  <option value="RESEARCH_ASSISTANT">Research Assistant</option>
                  <option value="STUDENT">Student</option>
                  <option value="CO_INVESTIGATOR">Co-Investigator</option>
                  <option value="MEMBER">Team Member</option>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" name="sendEmail" defaultChecked /> Send welcome & project invite email
              </label>
              <Button type="submit" className="w-full">Invite & Add to Project</Button>
            </form>
          </DialogContent>
        </DialogRoot>
      )}
    </PageTransition>
  );
}
