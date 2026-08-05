import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    include: { assignee: true },
  });

  if (body.createReminder && body.dueDate && body.assigneeId) {
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

  return NextResponse.json(task, { status: 201 });
}
