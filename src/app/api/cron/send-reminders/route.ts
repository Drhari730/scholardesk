import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, reminderEmail, isEmailConfigured } from "@/lib/email";
import { formatDateTime } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && secret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isEmailConfigured()) {
    return NextResponse.json({ error: "Email not configured", sent: 0 });
  }

  const now = new Date();
  const dueReminders = await prisma.reminder.findMany({
    where: {
      isCompleted: false,
      isSent: false,
      dueDate: { lte: now },
      personId: { not: null },
    },
    include: { person: true },
  });

  const results = [];

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

    const result = await sendEmail({
      to: reminder.person.email,
      ...template,
    });

    if (result.success) {
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { isSent: true },
      });
      results.push({ id: reminder.id, status: "sent", to: reminder.person.email });
    } else {
      results.push({ id: reminder.id, status: "failed", reason: result.reason });
    }
  }

  return NextResponse.json({
    processed: dueReminders.length,
    sent: results.filter((r) => r.status === "sent").length,
    results,
  });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
