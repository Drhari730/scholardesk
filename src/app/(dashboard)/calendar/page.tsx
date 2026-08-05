"use client";

import { useState } from "react";
import { Calendar, Download, ExternalLink, Copy, Check } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageTransition, FadeIn } from "@/components/ui/motion";
import { useFetch } from "@/lib/hooks";
import { formatDate, formatDateTime } from "@/lib/utils";

interface CalendarEvent {
  type: string;
  title: string;
  date: string;
  endDate?: string;
  location?: string;
  course?: string;
}

export default function CalendarPage() {
  const [copied, setCopied] = useState(false);
  const { data: exams } = useFetch<Array<{ id: string; title: string; examDate: string; venue: string | null; course: { code: string } }>>("/api/exams");
  const { data: reminders } = useFetch<Array<{ id: string; title: string; dueDate: string; message: string | null; isCompleted: boolean }>>("/api/reminders");

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const icalUrl = `${baseUrl}/api/calendar/ical`;
  const googleSubscribeUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(icalUrl.replace("https://", "webcal://").replace("http://", "webcal://"))}`;

  async function copyFeedUrl() {
    await navigator.clipboard.writeText(icalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function googleCalendarLink(title: string, date: string, durationMins = 60, details = "") {
    const start = new Date(date);
    const end = new Date(start.getTime() + durationMins * 60000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: title,
      dates: `${fmt(start)}/${fmt(end)}`,
      details,
    });
    return `https://calendar.google.com/calendar/render?${params}`;
  }

  const upcomingExams = exams?.filter((e) => new Date(e.examDate) >= new Date()).slice(0, 10) ?? [];
  const upcomingReminders = reminders?.filter((r) => !r.isCompleted && new Date(r.dueDate) >= new Date()).slice(0, 10) ?? [];

  return (
    <PageTransition>
      <PageHeader
        title="Google Calendar Integration"
        description="Sync your exams, classes, and reminders with Google Calendar."
      />

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <FadeIn>
          <Card className="border-teal-200 bg-gradient-to-br from-teal-50 to-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-teal-700" />
                Subscribe to ScholarDesk Calendar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                Add all your exams, class sessions, and reminders to Google Calendar automatically.
                Updates sync whenever you change data in ScholarDesk.
              </p>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-medium text-slate-500">Calendar feed URL</p>
                <p className="mt-1 break-all text-sm text-slate-800">{icalUrl || "/api/calendar/ical"}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a href={googleSubscribeUrl} target="_blank" rel="noopener noreferrer">
                  <Button>
                    <ExternalLink className="h-4 w-4" />
                    Add to Google Calendar
                  </Button>
                </a>
                <a href="/api/calendar/ical" download="scholardesk.ics">
                  <Button variant="secondary">
                    <Download className="h-4 w-4" />
                    Download .ics
                  </Button>
                </a>
                <Button variant="outline" onClick={copyFeedUrl}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied!" : "Copy URL"}
                </Button>
              </div>
              <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <strong>How to subscribe:</strong> Click &quot;Add to Google Calendar&quot; or in Google Calendar go to
                Settings → Add calendar → From URL → paste the feed URL above.
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.1}>
          <Card>
            <CardHeader>
              <CardTitle>Manual Setup Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm text-slate-600">
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">1</span>
                  Open <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer" className="text-teal-700 underline">Google Calendar</a>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">2</span>
                  Click the + next to &quot;Other calendars&quot; → &quot;From URL&quot;
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">3</span>
                  Paste the ScholarDesk calendar feed URL
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">4</span>
                  Your exams, classes & reminders appear automatically
                </li>
              </ol>
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <FadeIn delay={0.15}>
          <Card>
            <CardHeader><CardTitle>Upcoming Exams</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {upcomingExams.length === 0 ? (
                <p className="text-sm text-slate-400">No upcoming exams</p>
              ) : (
                upcomingExams.map((exam) => (
                  <div key={exam.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{exam.title}</p>
                      <p className="text-xs text-slate-500">{exam.course.code} · {formatDateTime(exam.examDate)}</p>
                    </div>
                    <a href={googleCalendarLink(exam.title, exam.examDate, 120, exam.venue ?? "")} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="ghost">+ Google</Button>
                    </a>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.2}>
          <Card>
            <CardHeader><CardTitle>Upcoming Reminders</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {upcomingReminders.length === 0 ? (
                <p className="text-sm text-slate-400">No upcoming reminders</p>
              ) : (
                upcomingReminders.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{r.title}</p>
                      <p className="text-xs text-slate-500">{formatDateTime(r.dueDate)}</p>
                    </div>
                    <a href={googleCalendarLink(r.title, r.dueDate, 30, r.message ?? "")} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="ghost">+ Google</Button>
                    </a>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
