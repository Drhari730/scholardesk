"use client";

import { useState } from "react";
import { Plus, FileQuestion } from "lucide-react";
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
import { QP_STATUSES, getStatusMeta } from "@/lib/constants";

interface QuestionPaper {
  id: string;
  title: string;
  status: string;
  dueDate: string | null;
  totalMarks: number | null;
  sections: string | null;
  notes: string | null;
  course: { code: string; name: string };
  exam: { title: string } | null;
}

interface Course {
  id: string;
  code: string;
  name: string;
}

interface Exam {
  id: string;
  title: string;
  courseId: string;
}

export default function QuestionPapersPage() {
  const { data: papers, loading, refetch } = useFetch<QuestionPaper[]>("/api/question-papers");
  const { data: courses } = useFetch<Course[]>("/api/courses");
  const { data: exams } = useFetch<Exam[]>("/api/exams");
  const [showForm, setShowForm] = useState(false);

  async function createPaper(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await apiPost("/api/question-papers", Object.fromEntries(fd));
    setShowForm(false);
    refetch();
  }

  async function updateStatus(id: string, status: string) {
    await apiPatch(`/api/question-papers/${id}`, { status });
    refetch();
  }

  async function deletePaper(id: string) {
    if (!confirm("Delete this question paper?")) return;
    await apiDelete(`/api/question-papers/${id}`);
    refetch();
  }

  return (
    <PageTransition>
      <PageHeader
        title="Question Paper Preparation"
        description="Track question paper drafting, review, and finalization deadlines."
        action={
          <DialogRoot open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> New Question Paper
              </Button>
            </DialogTrigger>
            <DialogContent title="Create Question Paper">
              <form onSubmit={createPaper} className="space-y-4">
                <div>
                  <Label>Course</Label>
                  <Select name="courseId" required className="mt-1">
                    <option value="">Select course</option>
                    {courses?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} — {c.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Linked Exam (optional)</Label>
                  <Select name="examId" className="mt-1">
                    <option value="">None</option>
                    {exams?.map((e) => (
                      <option key={e.id} value={e.id}>{e.title}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Title</Label>
                  <Input name="title" required className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Due Date</Label>
                    <Input name="dueDate" type="date" className="mt-1" />
                  </div>
                  <div>
                    <Label>Total Marks</Label>
                    <Input name="totalMarks" type="number" className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label>Sections (e.g. A: 10 MCQs, B: 5 Short)</Label>
                  <Textarea name="sections" className="mt-1" />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea name="notes" className="mt-1" />
                </div>
                <Button type="submit" className="w-full">Create</Button>
              </form>
            </DialogContent>
          </DialogRoot>
        }
      />

      {loading ? (
        <div className="skeleton h-64 rounded-2xl" />
      ) : !papers?.length ? (
        <EmptyState
          title="No question papers"
          description="Create question papers linked to your courses and exams."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {papers.map((paper) => {
            const meta = getStatusMeta(QP_STATUSES, paper.status);
            const isOverdue =
              paper.dueDate &&
              new Date(paper.dueDate) < new Date() &&
              paper.status !== "FINALIZED";

            return (
              <Card key={paper.id} className={isOverdue ? "border-amber-200" : ""}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-amber-50 p-2.5 text-amber-700">
                      <FileQuestion className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{paper.title}</h3>
                        <Badge className={meta.color}>{meta.label}</Badge>
                        {isOverdue && (
                          <Badge className="bg-red-100 text-red-700">Overdue</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {paper.course.code} — {paper.course.name}
                      </p>
                      {paper.exam && (
                        <p className="text-xs text-slate-400">Exam: {paper.exam.title}</p>
                      )}
                      <div className="mt-2 flex gap-3 text-xs text-slate-400">
                        {paper.dueDate && <span>Due: {formatDate(paper.dueDate)}</span>}
                        {paper.totalMarks && <span>{paper.totalMarks} marks</span>}
                      </div>
                      {paper.sections && (
                        <p className="mt-2 text-xs text-slate-500">{paper.sections}</p>
                      )}
                      <div className="mt-3 flex gap-2">
                        <Select
                          value={paper.status}
                          onChange={(e) => updateStatus(paper.id, e.target.value)}
                          className="text-xs"
                        >
                          {QP_STATUSES.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </Select>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500"
                          onClick={() => deletePaper(paper.id)}
                        >
                          Delete
                        </Button>
                      </div>
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
