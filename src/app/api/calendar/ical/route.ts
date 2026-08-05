import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeIcs(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export async function GET() {
  const [exams, reminders, sessions, courses] = await Promise.all([
    prisma.exam.findMany({ include: { course: true }, orderBy: { examDate: "asc" } }),
    prisma.reminder.findMany({
      where: { isCompleted: false },
      include: { person: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.classSession.findMany({ include: { course: true } }),
    prisma.course.findMany(),
  ]);

  const now = new Date();
  const events: string[] = [];

  for (const exam of exams) {
    const start = new Date(exam.examDate);
    const end = new Date(start.getTime() + (exam.duration ?? 120) * 60000);
    events.push([
      "BEGIN:VEVENT",
      `UID:exam-${exam.id}@scholardesk`,
      `DTSTAMP:${formatIcsDate(now)}`,
      `DTSTART:${formatIcsDate(start)}`,
      `DTEND:${formatIcsDate(end)}`,
      `SUMMARY:${escapeIcs(`Exam: ${exam.title} (${exam.course.code})`)}`,
      exam.venue ? `LOCATION:${escapeIcs(exam.venue)}` : "",
      `DESCRIPTION:${escapeIcs(exam.syllabus ?? exam.title)}`,
      "END:VEVENT",
    ].filter(Boolean).join("\r\n"));
  }

  for (const reminder of reminders) {
    const start = new Date(reminder.dueDate);
    const end = new Date(start.getTime() + 30 * 60000);
    events.push([
      "BEGIN:VEVENT",
      `UID:reminder-${reminder.id}@scholardesk`,
      `DTSTAMP:${formatIcsDate(now)}`,
      `DTSTART:${formatIcsDate(start)}`,
      `DTEND:${formatIcsDate(end)}`,
      `SUMMARY:${escapeIcs(reminder.title)}`,
      reminder.message ? `DESCRIPTION:${escapeIcs(reminder.message)}` : "",
      "END:VEVENT",
    ].filter(Boolean).join("\r\n"));
  }

  const dayMap = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
  for (const session of sessions) {
    const course = session.course;
    events.push([
      "BEGIN:VEVENT",
      `UID:session-${session.id}@scholardesk`,
      `DTSTAMP:${formatIcsDate(now)}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${dayMap[session.dayOfWeek]}`,
      `DTSTART;TZID=Asia/Kolkata:${session.startTime.replace(":", "")}00`,
      `DTEND;TZID=Asia/Kolkata:${session.endTime.replace(":", "")}00`,
      `SUMMARY:${escapeIcs(`${course.code}: ${session.topic ?? course.name}`)}`,
      session.room ? `LOCATION:${escapeIcs(session.room)}` : "",
      "END:VEVENT",
    ].filter(Boolean).join("\r\n"));
  }

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ScholarDesk//Dr Hari Prakash//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:ScholarDesk",
    "X-WR-TIMEZONE:Asia/Kolkata",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="scholardesk.ics"',
    },
  });
}
