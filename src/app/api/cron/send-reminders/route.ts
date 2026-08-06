import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, reminderEmail, planningEventEmail, isEmailConfigured } from "@/lib/email";
import { getEmailPrefs } from "@/lib/auth";
import { formatDateTime, formatDate } from "@/lib/utils";
import { EVENT_TYPES } from "@/lib/constants";

function dayWindow(now: Date, daysAhead: number) {
  const target = new Date(now);
  target.setDate(target.getDate() + daysAhead);
  const start = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const end = new Date(start);
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
    return NextResponse.json({ error: "Email not configured", sent: 0 });
  }

  const prefs = await getEmailPrefs();
  const now = new Date();
  const results: Array<{ id: string; status: string; reason?: string; to?: string }> = [];

  const dueReminders = await prisma.reminder.findMany({
    where: {
      isCompleted: false,
      isSent: false,
      dueDate: { lte: now },
      personId: { not: null },
    },
    include: { person: true },
  });

  for (const reminder of dueReminders) {
    if (!reminder.person?.email) {
      results.push({ id: reminder.id, status: "skipped", reason: "no_email" });
      continue;
    }
    const template = reminderEmail({
      recipientName: reminder.person.name,
      title: reminder.title,
      message: reminder.message ?? undefined,
      dueDate: formatDateTime(reminder.dueDate),
    });
    const result = await sendEmail({ to: reminder.person.email, ...template });
    if (result.success) {
      await prisma.reminder.update({ where: { id: reminder.id }, data: { isSent: true } });
      results.push({ id: reminder.id, status: "sent", to: reminder.person.email });
    } else {
      results.push({ id: reminder.id, status: "failed", reason: result.reason });
    }
  }

  if (prefs.emailOnPlanning && prefs.ownerEmail) {
    const reminderWindows = [
      { days: 7, sentField: "reminder7DaySent" as const },
      { days: 1, sentField: "reminder1DaySent" as const },
    ];

    for (const { days, sentField } of reminderWindows) {
      const { start, end } = dayWindow(now, days);

      const upcomingEvents = await prisma.academicEvent.findMany({
        where: {
          remindEmail: true,
          [sentField]: false,
          startDate: { gte: start, lte: end },
          status: { notIn: ["COMPLETED", "CANCELLED"] },
        },
      });

      for (const ev of upcomingEvents) {
        const typeLabel = EVENT_TYPES.find((t) => t.value === ev.type)?.label ?? ev.type;
        const template = planningEventEmail({
          title: ev.title,
          type: typeLabel,
          startDate: formatDate(ev.startDate),
          endDate: ev.endDate ? formatDate(ev.endDate) : undefined,
          location: ev.location ?? undefined,
          isReminder: true,
          daysUntil: days,
        });
        const result = await sendEmail({ to: prefs.ownerEmail, ...template });
        if (result.success) {
          await prisma.academicEvent.update({
            where: { id: ev.id },
            data: { [sentField]: true },
          });
          results.push({ id: ev.id, status: `planning_${days}d_sent`, to: prefs.ownerEmail });
        }
      }
    }
  }

  return NextResponse.json({
    processed: results.length,
    sent: results.filter((r) => r.status === "sent" || r.status.startsWith("planning_")).length,
    results,
  });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
