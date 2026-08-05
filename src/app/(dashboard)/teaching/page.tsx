"use client";

import { useState } from "react";
import { Plus, BookOpen } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Textarea } from "@/components/ui/input";
import {
  DialogRoot,
  DialogTrigger,
  DialogContent,
} from "@/components/ui/dialog";
import { PageTransition } from "@/components/ui/motion";
import { useFetch, apiPost, apiDelete } from "@/lib/hooks";

interface Course {
  id: string;
  code: string;
  name: string;
  semester: string | null;
  year: string | null;
  credits: number | null;
  description: string | null;
  sessions: Array<{ id: string; dayOfWeek: number; startTime: string; endTime: string }>;
  exams: Array<{ id: string; title: string; examDate: string }>;
  _count: { questionPapers: number };
}

export default function TeachingPage() {
  const { data: courses, loading, refetch } = useFetch<Course[]>("/api/courses");
  const [showForm, setShowForm] = useState(false);

  async function createCourse(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await apiPost("/api/courses", Object.fromEntries(fd));
    setShowForm(false);
    refetch();
  }

  async function deleteCourse(id: string) {
    if (!confirm("Delete this course and all related data?")) return;
    await apiDelete(`/api/courses/${id}`);
    refetch();
  }

  return (
    <PageTransition>
      <PageHeader
        title="Teaching Planner"
        description="Organize your courses, semesters, and teaching schedule."
        action={
          <DialogRoot open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> Add Course
              </Button>
            </DialogTrigger>
            <DialogContent title="Add Course">
              <form onSubmit={createCourse} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Course Code</Label>
                    <Input name="code" required placeholder="PH101" className="mt-1" />
                  </div>
                  <div>
                    <Label>Credits</Label>
                    <Input name="credits" type="number" className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label>Course Name</Label>
                  <Input name="name" required className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Semester</Label>
                    <Input name="semester" placeholder="Fall 2026" className="mt-1" />
                  </div>
                  <div>
                    <Label>Year</Label>
                    <Input name="year" placeholder="2026" className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea name="description" className="mt-1" />
                </div>
                <Button type="submit" className="w-full">Create Course</Button>
              </form>
            </DialogContent>
          </DialogRoot>
        }
      />

      {loading ? (
        <div className="skeleton h-64 rounded-2xl" />
      ) : !courses?.length ? (
        <EmptyState
          title="No courses added"
          description="Add your teaching courses to plan classes, exams, and question papers."
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Card key={course.id} className="group transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-teal-50 p-2.5 text-teal-700">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{course.code}</CardTitle>
                      <p className="text-sm text-slate-500">{course.name}</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {course.semester && (
                    <Badge className="bg-blue-50 text-blue-700">{course.semester}</Badge>
                  )}
                  {course.credits && (
                    <Badge className="bg-slate-100 text-slate-600">
                      {course.credits} credits
                    </Badge>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-slate-50 py-2">
                    <p className="font-semibold text-slate-800">{course.sessions.length}</p>
                    <p className="text-slate-400">Sessions</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 py-2">
                    <p className="font-semibold text-slate-800">{course.exams.length}</p>
                    <p className="text-slate-400">Exams</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 py-2">
                    <p className="font-semibold text-slate-800">
                      {course._count.questionPapers}
                    </p>
                    <p className="text-slate-400">Q. Papers</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-3 w-full text-red-500 opacity-0 group-hover:opacity-100"
                  onClick={() => deleteCourse(course.id)}
                >
                  Delete Course
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageTransition>
  );
}
