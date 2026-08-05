import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, reminderEmail } from "@/lib/email";
import { formatDateTime } from "@/lib/utils";

export async function GET() {
  const reminders = await prisma.reminder.findMany({
    orderBy: { dueDate: "asc" },
    include: { person: true, task: true, publication: true, exam: true },
  });
  return NextResponse.json(reminders);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const reminder = await prisma.reminder.create({
    data: {
      title: body.title,
      message: body.message,
      dueDate: new Date(body.dueDate),
      personId: body.personId || null,
      taskId: body.taskId || null,
      publicationId: body.publicationId || null,
      examId: body.examId || null,
    },
    include: { person: true },
  });

  let emailSent = false;
  if (body.sendEmail && reminder.person?.email) {
    const template = reminderEmail({
      recipientName: reminder.person.name,
      title: reminder.title,
      message: reminder.message ?? undefined,
      dueDate: formatDateTime(reminder.dueDate),
    });
    const result = await sendEmail({ to: reminder.person.email, ...template });
    if (result.success) {
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { isSent: true },
      });
      emailSent = true;
    }
  }

  return NextResponse.json({ ...reminder, emailSent }, { status: 201 });
}
