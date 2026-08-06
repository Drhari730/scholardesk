"use client";

import { useState } from "react";
import { Plus, Calendar, MapPin, Download, Upload, FileSpreadsheet } from "lucide-react";
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
import { formatDate, formatDateTime } from "@/lib/utils";
import { EXAM_TYPES, EXAM_STATUSES, getStatusMeta } from "@/lib/constants";

interface Exam {
  id: string;
  title: string;
  type: string;
  examDate: string;
  duration: number | null;
  totalMarks: number | null;
  venue: string | null;
  syllabus: string | null;
  status: string;
  marksEntered: boolean;
  notes: string | null;
  _count?: { marks: number };
  course: { code: string; name: string };
  questionPapers: Array<{ id: string; title: string; status: string }>;
}

interface Course {
  id: string;
  code: string;
  name: string;
}

export default function ExamsPage() {
  const { data: exams, loading, refetch } = useFetch<Exam[]>("/api/exams");
  const { data: courses } = useFetch<Course[]>("/api/courses");
  const [showForm, setShowForm] = useState(false);
  const [marksExamId, setMarksExamId] = useState<string | null>(null);

  async function createExam(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await apiPost("/api/exams", {
      ...Object.fromEntries(fd),
      reminderDaysBefore: fd.get("reminderDaysBefore") || "7",
    });
    setShowForm(false);
    refetch();
  }

  async function updateExam(id: string, data: Record<string, unknown>) {
    await apiPatch(`/api/exams/${id}`, data);
    refetch();
  }

  async function deleteExam(id: string) {
    if (!confirm("Delete this exam?")) return;
    await apiDelete(`/api/exams/${id}`);
    refetch();
  }

  const upcoming = exams?.filter((e) => new Date(e.examDate) >= new Date()) ?? [];
  const past = exams?.filter((e) => new Date(e.examDate) < new Date()) ?? [];

  return (
    <PageTransition>
      <PageHeader
        title="Exams & Marks Planner"
        description="Plan exams, track question paper readiness, and manage marks entry."
        action={
          <DialogRoot open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> Schedule Exam
              </Button>
            </DialogTrigger>
            <DialogContent title="Schedule Exam">
              <form onSubmit={createExam} className="space-y-4">
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
                  <Label>Exam Title</Label>
                  <Input name="title" required placeholder="Midterm Examination" className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Type</Label>
                    <Select name="type" className="mt-1">
                      {EXAM_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label>Total Marks</Label>
                    <Input name="totalMarks" type="number" className="mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Exam Date & Time</Label>
                    <Input name="examDate" type="datetime-local" required className="mt-1" />
                  </div>
                  <div>
                    <Label>Duration (mins)</Label>
                    <Input name="duration" type="number" className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label>Venue</Label>
                  <Input name="venue" className="mt-1" />
                </div>
                <div>
                  <Label>Syllabus Coverage</Label>
                  <Textarea name="syllabus" className="mt-1" />
                </div>
                <div>
                  <Label>Reminder (days before)</Label>
                  <Input name="reminderDaysBefore" type="number" defaultValue="7" className="mt-1" />
                </div>
                <Button type="submit" className="w-full">Schedule Exam</Button>
              </form>
            </DialogContent>
          </DialogRoot>
        }
      />

      {loading ? (
        <div className="skeleton h-64 rounded-2xl" />
      ) : !exams?.length ? (
        <EmptyState
          title="No exams scheduled"
          description="Add courses and schedule your examinations with automatic reminders."
        />
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold text-slate-800">Upcoming Exams</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {upcoming.map((exam) => (
                  <ExamCard
                    key={exam.id}
                    exam={exam}
                    onUpdate={updateExam}
                    onDelete={deleteExam}
                    onManageMarks={setMarksExamId}
                  />
                ))}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold text-slate-800">Past Exams</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {past.map((exam) => (
                  <ExamCard
                    key={exam.id}
                    exam={exam}
                    onUpdate={updateExam}
                    onDelete={deleteExam}
                    onManageMarks={setMarksExamId}
                    muted
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {marksExamId && (
        <MarksDialog
          examId={marksExamId}
          examTitle={exams?.find((e) => e.id === marksExamId)?.title ?? "Exam"}
          onClose={() => setMarksExamId(null)}
          onImported={refetch}
        />
      )}
    </PageTransition>
  );
}

function MarksDialog({
  examId,
  examTitle,
  onClose,
  onImported,
}: {
  examId: string;
  examTitle: string;
  onClose: () => void;
  onImported: () => void;
}) {
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  const { data, refetch } = useFetch<{ marks: Array<{ rollNumber: string; studentName: string; marks: number | null; grade: string | null }> }>(
    `/api/exams/${examId}/marks`
  );

  async function downloadCsv() {
    const res = await fetch(`/api/exams/${examId}/marks?format=csv`, { credentials: "include" });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${examTitle.replace(/\s+/g, "-")}-marks.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadTemplate() {
    const csv = "roll_number,student_name,marks,grade,remarks\nUSN001,Student Name,85,A,\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "marks-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setMessage("");
    try {
      const text = await file.text();
      const res = await fetch(`/api/exams/${examId}/marks`, {
        method: "POST",
        headers: { "Content-Type": "text/csv" },
        credentials: "include",
        body: text,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setMessage(`Imported ${result.imported} student records.`);
      refetch();
      onImported();
    } catch {
      setMessage("Import failed. Check CSV format.");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  return (
    <DialogRoot open onOpenChange={onClose}>
      <DialogContent title={`Marks — ${examTitle}`}>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={downloadTemplate} className="gap-1">
              <FileSpreadsheet className="h-3 w-3" /> Template
            </Button>
            <Button size="sm" variant="outline" onClick={downloadCsv} className="gap-1">
              <Download className="h-3 w-3" /> Export CSV
            </Button>
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
              <Upload className="h-3 w-3" />
              {importing ? "Importing…" : "Import CSV"}
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleUpload} disabled={importing} />
            </label>
          </div>
          <p className="text-xs text-slate-500">
            CSV columns: roll_number, student_name, marks, grade, remarks
          </p>
          {message && <p className="text-sm text-teal-700">{message}</p>}
          {data?.marks && data.marks.length > 0 ? (
            <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-100">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Roll No.</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Marks</th>
                    <th className="px-3 py-2">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {data.marks.map((m) => (
                    <tr key={m.rollNumber} className="border-t border-slate-50">
                      <td className="px-3 py-2 font-mono text-xs">{m.rollNumber}</td>
                      <td className="px-3 py-2">{m.studentName}</td>
                      <td className="px-3 py-2">{m.marks ?? "—"}</td>
                      <td className="px-3 py-2">{m.grade ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-400">No marks yet — import a CSV or download the template.</p>
          )}
        </div>
      </DialogContent>
    </DialogRoot>
  );
}

function ExamCard({
  exam,
  onUpdate,
  onDelete,
  onManageMarks,
  muted,
}: {
  exam: Exam;
  onUpdate: (id: string, data: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  onManageMarks: (id: string) => void;
  muted?: boolean;
}) {
  const statusMeta = getStatusMeta(EXAM_STATUSES, exam.status);
  const typeLabel = EXAM_TYPES.find((t) => t.value === exam.type)?.label ?? exam.type;

  return (
    <Card className={muted ? "opacity-75" : ""}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-slate-900">{exam.title}</h3>
              <Badge className="bg-slate-100 text-slate-600">{typeLabel}</Badge>
              <Badge className={statusMeta.color}>{statusMeta.label}</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {exam.course.code} — {exam.course.name}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-teal-600" />
            {formatDateTime(exam.examDate)}
            {exam.duration && <span className="text-slate-400">· {exam.duration} min</span>}
          </div>
          {exam.venue && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-teal-600" />
              {exam.venue}
            </div>
          )}
          {exam.totalMarks && (
            <p className="text-xs text-slate-400">Total marks: {exam.totalMarks}</p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Select
            value={exam.status}
            onChange={(e) => onUpdate(exam.id, { status: e.target.value })}
            className="text-xs"
          >
            {EXAM_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </Select>
          <label className="flex items-center gap-1.5 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={exam.marksEntered}
              onChange={(e) => onUpdate(exam.id, { marksEntered: e.target.checked })}
            />
            Marks entered
          </label>
          <Button size="sm" variant="outline" onClick={() => onManageMarks(exam.id)} className="gap-1">
            <FileSpreadsheet className="h-3 w-3" /> Marks
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto text-red-500"
            onClick={() => onDelete(exam.id)}
          >
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
