"use client";

import { useState } from "react";
import { Plus, MessageSquare } from "lucide-react";
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
import { formatDate } from "@/lib/utils";
import { PUBLICATION_STATUSES, getStatusMeta } from "@/lib/constants";

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
}

export default function PublicationsPage() {
  const { data: publications, loading, refetch } = useFetch<Publication[]>("/api/publications");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState("ALL");

  async function createPublication(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await apiPost("/api/publications", Object.fromEntries(fd));
    setShowForm(false);
    refetch();
  }

  async function updateStatus(id: string, status: string) {
    await apiPatch(`/api/publications/${id}`, { status });
    refetch();
  }

  async function deletePublication(id: string) {
    if (!confirm("Delete this publication record?")) return;
    await apiDelete(`/api/publications/${id}`);
    refetch();
  }

  const filtered =
    filter === "ALL"
      ? publications
      : publications?.filter((p) => p.status === filter);

  const statusCounts = PUBLICATION_STATUSES.map((s) => ({
    ...s,
    count: publications?.filter((p) => p.status === s.value).length ?? 0,
  }));

  return (
    <PageTransition>
      <PageHeader
        title="Publication Tracker"
        description="Monitor manuscript submissions, peer review status, and reviewer comments."
        action={
          <DialogRoot open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> Add Manuscript
              </Button>
            </DialogTrigger>
            <DialogContent title="Add Publication">
              <form onSubmit={createPublication} className="space-y-4">
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
                  <Label>Authors</Label>
                  <Input name="authors" placeholder="Comma-separated" className="mt-1" />
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
            filter === "ALL"
              ? "bg-teal-700 text-white"
              : "bg-white text-slate-600 hover:bg-slate-100"
          }`}
        >
          All ({publications?.length ?? 0})
        </button>
        {statusCounts
          .filter((s) => s.count > 0)
          .map((s) => (
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
          description="Add your manuscripts to track submission status and reviewer feedback."
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((pub) => {
            const meta = getStatusMeta(PUBLICATION_STATUSES, pub.status);
            return (
              <Card key={pub.id}>
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{pub.title}</h3>
                        <Badge className={meta.color}>{meta.label}</Badge>
                      </div>
                      {pub.journal && (
                        <p className="mt-1 text-sm text-slate-500">{pub.journal}</p>
                      )}
                      {pub.authors && (
                        <p className="mt-0.5 text-xs text-slate-400">{pub.authors}</p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                        {pub.submittedDate && (
                          <span>Submitted: {formatDate(pub.submittedDate)}</span>
                        )}
                        {pub.manuscriptId && <span>ID: {pub.manuscriptId}</span>}
                        {pub.doi && <span>DOI: {pub.doi}</span>}
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
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500"
                        onClick={() => deletePublication(pub.id)}
                      >
                        Delete
                      </Button>
                    </div>
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
