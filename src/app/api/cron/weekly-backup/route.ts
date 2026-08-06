import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, weeklyBackupEmail, isEmailConfigured } from "@/lib/email";
import { getEmailPrefs } from "@/lib/auth";
import { gatherExportData, exportToJson } from "@/lib/export-data";
import { exportToExcelBuffer } from "@/lib/export-excel";

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
  if (!prefs.emailOnBackup || !prefs.ownerEmail) {
    return NextResponse.json({ skipped: true, reason: "backup_disabled_or_no_email" });
  }

  const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });
  const now = new Date();

  if (settings?.lastBackupSentAt) {
    const daysSince = (now.getTime() - settings.lastBackupSentAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 6) {
      return NextResponse.json({ skipped: true, reason: "already_sent_this_week" });
    }
  }

  const data = await gatherExportData();
  const date = now.toISOString().split("T")[0];
  const jsonContent = exportToJson(data);
  const excelBuffer = exportToExcelBuffer(data);

  const recordCounts = {
    People: data.people.length,
    Projects: data.projects.length,
    Publications: data.publications.length,
    "Planning events": data.academicEvents.length,
    Exams: data.exams.length,
    Tasks: data.tasks.length,
    Reminders: data.reminders.length,
  };

  const template = weeklyBackupEmail({
    userName: settings?.userName ?? "Dr. Hari Prakash",
    date,
    recordCounts,
  });

  const result = await sendEmail({
    to: prefs.ownerEmail,
    ...template,
    attachments: [
      {
        filename: `scholardesk-backup-${date}.json`,
        content: Buffer.from(jsonContent).toString("base64"),
      },
      {
        filename: `scholardesk-backup-${date}.xlsx`,
        content: excelBuffer.toString("base64"),
      },
    ],
  });

  if (result.success) {
    await prisma.appSettings.upsert({
      where: { id: "default" },
      update: { lastBackupSentAt: now },
      create: { id: "default", lastBackupSentAt: now },
    });
  }

  return NextResponse.json({
    sent: result.success,
    to: prefs.ownerEmail,
    date,
    recordCounts,
    reason: result.success ? undefined : result.reason,
  });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
