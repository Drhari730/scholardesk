import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, taskAssignedEmail } from "@/lib/email";
import { formatDate } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  const tasks = await prisma.task.findMany({
    where: projectId ? { projectId } : undefined,
    orderBy: { dueDate: "asc" },
    include: { assignee: true, project: true },
  });
  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const task = await prisma.task.create({
    data: {
      title: body.title,
      description: body.description,
      status: body.status || "TODO",
      priority: body.priority || "MEDIUM",
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      projectId: body.projectId || null,
      assigneeId: body.assigneeId || null,
    },
    include: { assignee: true, project: true },
  });

  const shouldRemind = body.createReminder && body.dueDate && body.assigneeId;
  const shouldEmail = body.sendEmail !== false && body.assigneeId;

  if (shouldRemind) {
    await prisma.reminder.create({
      data: {
        title: `Task reminder: ${body.title}`,
        message: body.description,
        dueDate: new Date(body.dueDate),
        personId: body.assigneeId,
        taskId: task.id,
      },
    });
  }

  let emailResult = null;
  if (shouldEmail && task.assignee?.email) {
    const template = taskAssignedEmail({
      assigneeName: task.assignee.name,
      taskTitle: task.title,
      projectTitle: task.project?.title,
      dueDate: task.dueDate ? formatDate(task.dueDate) : undefined,
      description: task.description ?? undefined,
    });
    emailResult = await sendEmail({ to: task.assignee.email, ...template });
  }

  return NextResponse.json({ ...task, emailSent: emailResult?.success ?? false }, { status: 201 });
}
