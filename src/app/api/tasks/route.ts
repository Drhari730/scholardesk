import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, taskAssignedEmail } from "@/lib/email";
import { getEmailPrefs } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

async function createTaskForAssignee(
  body: {
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    dueDate?: string;
    projectId?: string;
    assigneeId: string;
    createReminder?: boolean;
    sendEmail?: boolean;
  },
  prefs: Awaited<ReturnType<typeof getEmailPrefs>>
) {
  const task = await prisma.task.create({
    data: {
      title: body.title,
      description: body.description,
      status: body.status || "TODO",
      priority: body.priority || "MEDIUM",
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      projectId: body.projectId || null,
      assigneeId: body.assigneeId,
    },
    include: { assignee: true, project: true },
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

  let emailSent = false;
  if (body.sendEmail !== false && task.assignee?.email && prefs.emailOnTask) {
    const template = taskAssignedEmail({
      assigneeName: task.assignee.name,
      taskTitle: task.title,
      projectTitle: task.project?.title,
      dueDate: task.dueDate ? formatDate(task.dueDate) : undefined,
      description: task.description ?? undefined,
    });
    const result = await sendEmail({ to: task.assignee.email, ...template, category: "task" });
    emailSent = result.success;
  }

  return { task, emailSent };
}

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
  const prefs = await getEmailPrefs();

  if (body.assignToAll && body.projectId) {
    const project = await prisma.researchProject.findUnique({
      where: { id: body.projectId },
      include: { members: { include: { person: true } } },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const members = project.members.map((m) => m.person).filter((p) => p);
    if (!members.length) {
      return NextResponse.json(
        { error: "No team members on this project. Add members first." },
        { status: 400 }
      );
    }

    const tasksCreated = [];
    let emailsSent = 0;

    for (const person of members) {
      const { task, emailSent } = await createTaskForAssignee(
        {
          title: body.title,
          description: body.description,
          status: body.status,
          priority: body.priority,
          dueDate: body.dueDate,
          projectId: body.projectId,
          assigneeId: person.id,
          createReminder: body.createReminder,
          sendEmail: body.sendEmail,
        },
        prefs
      );
      tasksCreated.push(task);
      if (emailSent) emailsSent++;
    }

    return NextResponse.json(
      {
        tasksCreated: tasksCreated.length,
        emailsSent,
        message: `Task assigned to ${tasksCreated.length} team member${tasksCreated.length === 1 ? "" : "s"}`,
      },
      { status: 201 }
    );
  }

  if (!body.assigneeId) {
    return NextResponse.json({ error: "Select an assignee or choose 'All team members'" }, { status: 400 });
  }

  const { task, emailSent } = await createTaskForAssignee(
    {
      title: body.title,
      description: body.description,
      status: body.status,
      priority: body.priority,
      dueDate: body.dueDate,
      projectId: body.projectId,
      assigneeId: body.assigneeId,
      createReminder: body.createReminder,
      sendEmail: body.sendEmail,
    },
    prefs
  );

  return NextResponse.json({ ...task, emailSent }, { status: 201 });
}
