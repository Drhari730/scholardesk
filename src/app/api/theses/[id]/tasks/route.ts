import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, taskAssignedEmail } from "@/lib/email";
import { getEmailPrefs } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tasks = await prisma.task.findMany({
    where: { thesisId: id },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    include: { assignee: { select: { name: true } } },
  });
  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (!body.title || !String(body.title).trim()) {
    return NextResponse.json({ error: "Task title is required." }, { status: 400 });
  }

  const thesis = await prisma.thesis.findUnique({ where: { id } });
  if (!thesis) return NextResponse.json({ error: "Thesis not found" }, { status: 404 });

  const task = await prisma.task.create({
    data: {
      title: String(body.title).trim(),
      description: body.description || null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      thesisId: id,
      assigneeId: thesis.personId ?? null,
      status: "TODO",
      priority: body.priority || "MEDIUM",
    },
    include: { assignee: true },
  });

  let emailSent = false;
  if (body.sendEmail !== false && task.assignee?.email) {
    const prefs = await getEmailPrefs();
    if (prefs.emailOnTask) {
      const template = taskAssignedEmail({
        assigneeName: task.assignee.name,
        taskTitle: task.title,
        projectTitle: thesis.title,
        dueDate: task.dueDate ? formatDate(task.dueDate) : undefined,
        description: task.description ?? undefined,
      });
      const result = await sendEmail({ to: task.assignee.email, ...template, category: "task" });
      emailSent = result.success;
    }
  }

  return NextResponse.json({ ...task, emailSent }, { status: 201 });
}
