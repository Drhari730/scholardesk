import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, reminderEmail, isEmailConfigured } from "@/lib/email";
import { formatDateTime } from "@/lib/utils";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const reminder = await prisma.reminder.findUnique({
    where: { id },
    include: { person: true },
  });
  if (!reminder) {
    return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
  }
  if (!reminder.person?.email) {
    return NextResponse.json({ error: "This reminder has no person with an email." }, { status: 400 });
  }
  if (!isEmailConfigured()) {
    return NextResponse.json({ error: "Email is not configured on the server." }, { status: 400 });
  }

  const template = reminderEmail({
    recipientName: reminder.person.name,
    title: reminder.title,
    message: reminder.message ?? undefined,
    dueDate: formatDateTime(reminder.dueDate),
  });
  const result = await sendEmail({ to: reminder.person.email, ...template, category: "reminder" });
  if (!result.success) {
    return NextResponse.json({ error: "Email failed to send." }, { status: 502 });
  }

  await prisma.reminder.update({ where: { id }, data: { isSent: true } });
  return NextResponse.json({ ok: true, sentTo: reminder.person.email });
}
