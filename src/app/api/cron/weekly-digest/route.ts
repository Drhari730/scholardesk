import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, weeklyDigestEmail, isEmailConfigured } from "@/lib/email";
import { getEmailPrefs } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  EVENT_TYPES,
  PUBLICATION_STATUSES,
} from "@/lib/constants";

function getWeekBounds(now: Date) {
  const start = new Date(now);
  const day = start.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  start.setDate(start.getDate() + 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && secret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isEmailConfigured()) {
    return NextResponse.json({ error: "Email not configured" }, { status: 400 });
  }

  const prefs = await getEmailPrefs();
  if (!prefs.emailOnDigest || !prefs.ownerEmail) {
    return NextResponse.json({ skipped: true, reason: "digest_disabled_or_no_email" });
  }

  const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });
  const now = new Date();

  if (settings?.lastDigestSentAt) {
    const daysSince = (now.getTime() - settings.lastDigestSentAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 6) {
      return NextResponse.json({ skipped: true, reason: "already_sent_this_week" });
    }
  }

  const { start, end } = getWeekBounds(now);
  const weekRange = `${formatDate(start)} – ${formatDate(end)}`;

  const [exams, events, tasks, publications, reminders] = await Promise.all([
    prisma.exam.findMany({
      where: { examDate: { gte: start, lte: end } },
      include: { course: true },
      orderBy: { examDate: "asc" },
      take: 10,
    }),
    prisma.academicEvent.findMany({
      where: {
        startDate: { gte: start, lte: end },
        status: { notIn: ["COMPLETED", "CANCELLED"] },
      },
      orderBy: { startDate: "asc" },
      take: 10,
    }),
    prisma.task.findMany({
      where: { status: { notIn: ["COMPLETED"] } },
      include: { project: true },
      orderBy: { dueDate: "asc" },
      take: 10,
    }),
    prisma.publication.findMany({
      where: { status: { notIn: ["PUBLISHED", "REJECTED"] } },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    prisma.reminder.findMany({
      where: { isCompleted: false, dueDate: { lt: now } },
      orderBy: { dueDate: "asc" },
      take: 10,
    }),
  ]);

  const template = weeklyDigestEmail({
    userName: settings?.userName ?? "Dr. Hari Prakash",
    weekRange,
    upcomingExams: exams.map((e) => ({
      title: e.title,
      course: `${e.course.code} — ${e.course.name}`,
      date: formatDateTime(e.examDate),
    })),
    planningEvents: events.map((e) => ({
      title: e.title,
      type: EVENT_TYPES.find((t) => t.value === e.type)?.label ?? e.type,
      date: formatDate(e.startDate),
    })),
    pendingTasks: tasks.map((t) => ({
      title: t.title,
      project: t.project?.title,
      dueDate: t.dueDate ? formatDate(t.dueDate) : undefined,
    })),
    activePublications: publications.map((p) => ({
      title: p.title,
      status: PUBLICATION_STATUSES.find((s) => s.value === p.status)?.label ?? p.status,
      revision: p.currentRevision > 0 ? `R${p.currentRevision}` : undefined,
    })),
    overdueReminders: reminders.map((r) => ({
      title: r.title,
      dueDate: formatDateTime(r.dueDate),
    })),
  });

  const result = await sendEmail({ to: prefs.ownerEmail, ...template });

  if (result.success) {
    await prisma.appSettings.upsert({
      where: { id: "default" },
      update: { lastDigestSentAt: now },
      create: { id: "default", lastDigestSentAt: now },
    });
  }

  return NextResponse.json({
    sent: result.success,
    to: prefs.ownerEmail,
    weekRange,
    counts: {
      exams: exams.length,
      events: events.length,
      tasks: tasks.length,
      publications: publications.length,
      reminders: reminders.length,
    },
    reason: result.success ? undefined : result.reason,
  });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
