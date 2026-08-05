"use client";

import { useState } from "react";
import { Plus, Clock, MapPin } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import {
  DialogRoot,
  DialogTrigger,
  DialogContent,
} from "@/components/ui/dialog";
import { PageTransition } from "@/components/ui/motion";
import { useFetch, apiPost, apiDelete } from "@/lib/hooks";
import { DAYS } from "@/lib/utils";

interface Session {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string | null;
  topic: string | null;
  course: { code: string; name: string };
}

interface Course {
  id: string;
  code: string;
  name: string;
}

export default function TimetablePage() {
  const { data: sessions, loading, refetch } = useFetch<Session[]>("/api/sessions");
  const { data: courses } = useFetch<Course[]>("/api/courses");
  const [showForm, setShowForm] = useState(false);

  async function createSession(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await apiPost("/api/sessions", Object.fromEntries(fd));
    setShowForm(false);
    refetch();
  }

  async function deleteSession(id: string) {
    await apiDelete(`/api/sessions/${id}`);
    refetch();
  }

  const byDay = DAYS.map((day, index) => ({
    day,
    index,
    sessions: sessions?.filter((s) => s.dayOfWeek === index) ?? [],
  }));

  return (
    <PageTransition>
      <PageHeader
        title="Class Timetable"
        description="Your weekly teaching schedule at a glance."
        action={
          <DialogRoot open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> Add Session
              </Button>
            </DialogTrigger>
            <DialogContent title="Add Class Session">
              <form onSubmit={createSession} className="space-y-4">
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
                  <Label>Day</Label>
                  <Select name="dayOfWeek" required className="mt-1">
                    {DAYS.map((d, i) => (
                      <option key={i} value={i}>{d}</option>
                    ))}
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Start Time</Label>
                    <Input name="startTime" type="time" required className="mt-1" />
                  </div>
                  <div>
                    <Label>End Time</Label>
                    <Input name="endTime" type="time" required className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label>Room</Label>
                  <Input name="room" placeholder="Room 204" className="mt-1" />
                </div>
                <div>
                  <Label>Topic</Label>
                  <Input name="topic" className="mt-1" />
                </div>
                <Button type="submit" className="w-full">Add Session</Button>
              </form>
            </DialogContent>
          </DialogRoot>
        }
      />

      {loading ? (
        <div className="skeleton h-96 rounded-2xl" />
      ) : !sessions?.length ? (
        <EmptyState
          title="No classes scheduled"
          description="Add courses first, then schedule your weekly class sessions."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {byDay
            .filter((d) => d.sessions.length > 0 || d.index >= 1 && d.index <= 5)
            .map(({ day, index, sessions: daySessions }) => (
              <Card key={day}>
                <div className="border-b border-slate-100 bg-teal-50/50 px-4 py-3">
                  <h3 className="font-semibold text-teal-900">{day}</h3>
                </div>
                <CardContent className="space-y-2 p-3">
                  {daySessions.length === 0 ? (
                    <p className="py-4 text-center text-xs text-slate-400">No classes</p>
                  ) : (
                    daySessions
                      .sort((a, b) => a.startTime.localeCompare(b.startTime))
                      .map((s) => (
                        <div
                          key={s.id}
                          className="group rounded-xl border border-slate-100 bg-white p-3 transition-shadow hover:shadow-sm"
                        >
                          <p className="text-sm font-medium text-slate-800">
                            {s.course.code}
                          </p>
                          <p className="text-xs text-slate-500">{s.course.name}</p>
                          <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {s.startTime} – {s.endTime}
                            </span>
                            {s.room && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {s.room}
                              </span>
                            )}
                          </div>
                          {s.topic && (
                            <p className="mt-1 text-xs text-teal-600">{s.topic}</p>
                          )}
                          <button
                            onClick={() => deleteSession(s.id)}
                            className="mt-2 text-xs text-red-400 opacity-0 group-hover:opacity-100"
                          >
                            Remove
                          </button>
                        </div>
                      ))
                  )}
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </PageTransition>
  );
}
