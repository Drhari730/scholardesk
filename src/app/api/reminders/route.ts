import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
  return NextResponse.json(reminder, { status: 201 });
}
