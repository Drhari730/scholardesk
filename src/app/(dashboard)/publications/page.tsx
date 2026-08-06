"use client";

import { useState } from "react";
import { Plus, MessageSquare, UserPlus, X, Users, RotateCcw } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { DialogRoot, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { PageTransition, ScrollReveal } from "@/components/ui/motion";
import { useFetch, apiPost, apiPatch, apiDelete } from "@/lib/hooks";
import { formatDate } from "@/lib/utils";
import {
  PUBLICATION_STATUSES,
  PUBLICATION_MEMBER_ROLES,
  REVISION_STATUSES,
  getStatusMeta,
} from "@/lib/constants";

interface PublicationRevision {
  id: string;
  round: number;
  receivedDate: string | null;
  dueDate: string | null;
  submittedDate: string | null;
  comments: string | null;
  status: string;
  notes: string | null;
}

interface PublicationMember {
  id: string;
  role: string;
  person: { id: string; name: string; email: string | null };
}

interface Publication {
  id: string;
  title: string;
  journal: string | null;
  authors: string | null;
  status: string;
  submittedDate: string | null;
  decisionDate: string | null;
  reviewerComments: string | null;
  doi: string | null;
  manuscriptId: string | null;
  notes: string | null;
  currentRevision?: number;
  members: PublicationMember[];
  revisions: PublicationRevision[];
}

interface Person {
  id: string;
  name: string;
  email: string | null;
}

export default function PublicationsPage() {
  const { data: publications, loading, refetch } = useFetch<Publication[]>("/api/publications");
  const { data: people } = useFetch<Person[]>("/api/people");
  const [showForm, setShowForm] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showRevisionForm, setShowRevisionForm] = useState<string | null>(null);
  const [filter, setFilter] = useState("ALL");

  async function createPublication(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const memberIds = people
      ?.filter((p) => fd.get(`member_${p.id}`) === "on")
      .map((p) => ({
        personId: p.id,
        role: (fd.get(`role_${p.id}`) as string) || "CO_AUTHOR",
      }));
    await apiPost("/api/publications", {
      ...Object.fromEntries(fd),
      memberIds,
      sendEmail: fd.get("sendEmail") === "on",
    });
    setShowForm(false);
    refetch();
  }

  async function addMember(e: React.FormEvent<HTMLFormElement>, publicationId: string) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await apiPost("/api/publication-members", {
      publicationId,
      personId: fd.get("personId"),
      role: fd.get("role") || "CO_AUTHOR",
      sendEmail: fd.get("sendEmail") === "on",
    });
    setShowMemberForm(null);
    refetch();
  }

  async function updateStatus(id: string, status: string) {
    await apiPatch(`/api/publications/${id}`, { status, sendEmail: true });
    refetch();
  }

  async function removeMember(memberId: string) {
    await apiDelete(`/api/publication-members?id=${memberId}`);
    refetch();
  }

  async function deletePublication(id: string) {
    if (!confirm("Delete this publication record?")) return;
    await apiDelete(`/api/publications/${id}`);
    refetch();
  }

  async function addRevision(e: React.FormEvent<HTMLFormElement>, publicationId: string) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await apiPost("/api/publication-revisions", {
      publicationId,
      receivedDate: fd.get("receivedDate") || undefined,
      dueDate: fd.get("dueDate") || undefined,
      comments: fd.get("comments"),
      notes: fd.get("notes"),
    });
    setShowRevisionForm(null);
    refetch();
  }

  async function updateRevision(id: string, data: Record<string, unknown>) {
    await apiPatch(`/api/publication-revisions/${id}`, data);
    refetch();
  }

  async function deleteRevision(id: string) {
    if (!confirm("Delete this revision round?")) return;
    await apiDelete(`/api/publication-revisions/${id}`);
    refetch();
  }

  function availablePeople(pub: Publication) {
    const ids = new Set(pub.members.map((m) => m.person.id));
    return people?.filter((p) => !ids.has(p.id)) ?? [];
  }

  const filtered =
    filter === "ALL" ? publications : publications?.filter((p) => p.status === filter);

  const statusCounts = PUBLICATION_STATUSES.map((s) => ({
    ...s,
    count: publications?.filter((p) => p.status === s.value).length ?? 0,
  }));

  return (
    <PageTransition>
      <PageHeader
        title="Publication Tracker"
        description="Track manuscripts, team roles, peer review, and email collaborators on every update."
        action={
          <DialogRoot open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4" /> Add Manuscript</Button>
            </DialogTrigger>
            <DialogContent title="Add Publication">
              <form onSubmit={createPublication} className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
                <div>
                  <Label>Title</Label>
                  <Input name="title" required className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Journal</Label>
                    <Input name="journal" className="mt-1" />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select name="status" className="mt-1">
                      {PUBLICATION_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Authors (display text)</Label>
                  <Input name="authors" placeholder="Comma-separated author list" className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Submitted Date</Label>
                    <Input name="submittedDate" type="date" className="mt-1" />
                  </div>
                  <div>
                    <Label>Manuscript ID</Label>
                    <Input name="manuscriptId" className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label>Reviewer Comments</Label>
                  <Textarea name="reviewerComments" className="mt-1" />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea name="notes" className="mt-1" />
                </div>
                {people && people.length > 0 && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3">
                    <p className="mb-2 text-sm font-medium text-slate-700">Publication team</p>
                    <div className="max-h-40 space-y-2 overflow-y-auto">
                      {people.map((p) => (
                        <div key={p.id} className="flex flex-wrap items-center gap-2 text-sm">
                          <label className="flex items-center gap-2">
                            <input type="checkbox" name={`member_${p.id}`} />
                            {p.name}
                          </label>
                          <Select name={`role_${p.id}`} className="text-xs">
                            {PUBLICATION_MEMBER_ROLES.map((r) => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </Select>
                        </div>
                      ))}
                    </div>
                    <label className="mt-2 flex items-center gap-2 text-sm">
                      <input type="checkbox" name="sendEmail" defaultChecked />
                      Email team about this manuscript
                    </label>
                  </div>
                )}
                <Button type="submit" className="w-full">Save Publication</Button>
              </form>
            </DialogContent>
          </DialogRoot>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("ALL")}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            filter === "ALL" ? "bg-teal-700 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
          }`}
        >
          All ({publications?.length ?? 0})
        </button>
        {statusCounts.filter((s) => s.count > 0).map((s) => (
          <button
            key={s.value}
            onClick={() => setFilter(s.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === s.value ? "bg-teal-700 text-white" : `${s.color} hover:opacity-80`
            }`}
          >
            {s.label} ({s.count})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="skeleton h-64 rounded-2xl" />
      ) : !filtered?.length ? (
        <EmptyState
          title="No publications tracked"
          description="Add manuscripts with team roles — writers, submitters, co-authors — and get email updates on status changes."
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((pub, idx) => {
            const meta = getStatusMeta(PUBLICATION_STATUSES, pub.status);
            const isExpanded = expandedId === pub.id;
            return (
              <ScrollReveal key={pub.id} delay={idx * 0.05}>
                <Card>
                  <CardContent className="p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-slate-900">{pub.title}</h3>
                          <Badge className={meta.color}>{meta.label}</Badge>
                          {(pub.currentRevision ?? pub.revisions?.length) ? (
                            <Badge className="bg-orange-100 text-orange-700">
                              R{pub.currentRevision || pub.revisions.length}
                            </Badge>
                          ) : null}
                        </div>
                        {pub.journal && <p className="mt-1 text-sm text-slate-500">{pub.journal}</p>}
                        {pub.authors && <p className="mt-0.5 text-xs text-slate-400">{pub.authors}</p>}
                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                          {pub.submittedDate && <span>Submitted: {formatDate(pub.submittedDate)}</span>}
                          {pub.manuscriptId && <span>ID: {pub.manuscriptId}</span>}
                          {pub.doi && <span>DOI: {pub.doi}</span>}
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" /> {pub.members.length} team
                          </span>
                        </div>
                        {pub.reviewerComments && (
                          <div className="mt-3 flex gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
                            <MessageSquare className="mt-0.5 h-4 w-4 shrink-0" />
                            <p>{pub.reviewerComments}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <Select
                          value={pub.status}
                          onChange={(e) => updateStatus(pub.id, e.target.value)}
                          className="text-xs"
                        >
                          {PUBLICATION_STATUSES.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </Select>
                        <Button size="sm" variant="outline" onClick={() => setExpandedId(isExpanded ? null : pub.id)}>
                          {isExpanded ? "Hide Details" : "Details & Team"}
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deletePublication(pub.id)}>
                          Delete
                        </Button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 space-y-4">
                        <div className="rounded-xl border border-orange-100 bg-orange-50/30 p-4">
                          <div className="mb-3 flex items-center justify-between">
                            <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                              <RotateCcw className="h-4 w-4 text-orange-600" /> Revision Rounds
                            </p>
                            <Button size="sm" variant="outline" onClick={() => setShowRevisionForm(pub.id)}>
                              Add R{ (pub.revisions?.length ?? 0) + 1 }
                            </Button>
                          </div>
                          {!pub.revisions?.length ? (
                            <p className="text-xs text-slate-400">No revision rounds yet — add R1 when reviewers respond.</p>
                          ) : (
                            <div className="space-y-2">
                              {pub.revisions.map((rev) => {
                                const revMeta = getStatusMeta(REVISION_STATUSES, rev.status);
                                return (
                                  <div key={rev.id} className="rounded-lg bg-white px-3 py-2 shadow-sm">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div>
                                        <p className="text-sm font-medium">Round {rev.round}</p>
                                        <p className="text-xs text-slate-400">
                                          {rev.receivedDate && `Received: ${formatDate(rev.receivedDate)}`}
                                          {rev.dueDate && ` · Due: ${formatDate(rev.dueDate)}`}
                                          {rev.submittedDate && ` · Submitted: ${formatDate(rev.submittedDate)}`}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge className={revMeta.color}>{revMeta.label}</Badge>
                                        <Select
                                          value={rev.status}
                                          onChange={(e) => updateRevision(rev.id, { status: e.target.value })}
                                          className="text-xs"
                                        >
                                          {REVISION_STATUSES.map((s) => (
                                            <option key={s.value} value={s.value}>{s.label}</option>
                                          ))}
                                        </Select>
                                        <button onClick={() => deleteRevision(rev.id)} className="text-slate-400 hover:text-red-500">
                                          <X className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </div>
                                    {rev.comments && (
                                      <p className="mt-2 text-xs text-amber-800">{rev.comments}</p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <div className="rounded-xl border border-blue-100 bg-blue-50/30 p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-800">Publication Team</p>
                          <Button size="sm" variant="outline" onClick={() => setShowMemberForm(pub.id)}>
                            <UserPlus className="h-3 w-3" /> Add Member
                          </Button>
                        </div>
                        {pub.members.length === 0 ? (
                          <p className="text-xs text-slate-400">No team members — add writers, submitters, co-authors.</p>
                        ) : (
                          <div className="space-y-2">
                            {pub.members.map((m) => (
                              <div key={m.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 shadow-sm">
                                <div>
                                  <p className="text-sm font-medium">{m.person.name}</p>
                                  <p className="text-xs text-slate-400">
                                    {PUBLICATION_MEMBER_ROLES.find((r) => r.value === m.role)?.label ?? m.role}
                                    {m.person.email && ` · ${m.person.email}`}
                                  </p>
                                </div>
                                <button onClick={() => removeMember(m.id)} className="text-slate-400 hover:text-red-500">
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </ScrollReveal>
            );
          })}
        </div>
      )}

      {showRevisionForm && (
        <DialogRoot open={!!showRevisionForm} onOpenChange={() => setShowRevisionForm(null)}>
          <DialogContent title="Add Revision Round">
            <form onSubmit={(e) => addRevision(e, showRevisionForm)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Received Date</Label>
                  <Input name="receivedDate" type="date" className="mt-1" />
                </div>
                <div>
                  <Label>Due Date</Label>
                  <Input name="dueDate" type="date" className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Reviewer Comments</Label>
                <Textarea name="comments" className="mt-1" placeholder="Summary of reviewer feedback for this round" />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea name="notes" className="mt-1" />
              </div>
              <Button type="submit" className="w-full">Add Revision Round</Button>
            </form>
          </DialogContent>
        </DialogRoot>
      )}

      {showMemberForm && (
        <DialogRoot open={!!showMemberForm} onOpenChange={() => setShowMemberForm(null)}>
          <DialogContent title="Add Publication Team Member">
            <form onSubmit={(e) => addMember(e, showMemberForm)} className="space-y-4">
              <div>
                <Label>Select Person</Label>
                <Select name="personId" required className="mt-1">
                  <option value="">Choose...</option>
                  {publications?.find((p) => p.id === showMemberForm) &&
                    availablePeople(publications.find((p) => p.id === showMemberForm)!).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.email ? `— ${p.email}` : "(no email)"}
                      </option>
                    ))}
                </Select>
              </div>
              <div>
                <Label>Role on Manuscript</Label>
                <Select name="role" className="mt-1">
                  {PUBLICATION_MEMBER_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="sendEmail" defaultChecked />
                Send publication team email
              </label>
              <Button type="submit" className="w-full">Add to Publication</Button>
            </form>
          </DialogContent>
        </DialogRoot>
      )}
    </PageTransition>
  );
}
