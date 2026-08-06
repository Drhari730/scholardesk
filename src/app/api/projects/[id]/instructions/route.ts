import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwner, getEmailPrefs } from "@/lib/auth";
import { sendEmail, teamInstructionEmail, getEmailBranding } from "@/lib/email";
import { formatDate } from "@/lib/utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireOwner(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;
  const body = await req.json();
  const message = String(body.message ?? "").trim();
  const sendToAll = body.sendToAll === true;
  const personId = body.personId as string | undefined;
  const createTask = body.createTask === true;
  const dueDate = body.dueDate as string | undefined;

  if (!message) {
    return NextResponse.json({ error: "Instruction message is required" }, { status: 400 });
  }

  const project = await prisma.researchProject.findUnique({
    where: { id: projectId },
    include: { members: { include: { person: true } } },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  let recipients = project.members
    .map((m) => m.person)
    .filter((p) => p.email);

  if (!sendToAll && personId) {
    recipients = recipients.filter((p) => p.id === personId);
  }

  if (!recipients.length) {
    return NextResponse.json(
      { error: "No team members with email addresses found. Add members with email first." },
      { status: 400 }
    );
  }

  const prefs = await getEmailPrefs();
  if (!prefs.emailOnProject && !prefs.emailOnTask) {
    return NextResponse.json({ error: "Team emails are disabled in Settings" }, { status: 400 });
  }

  const branding = await getEmailBranding();
  const dueLabel = dueDate ? formatDate(dueDate) : undefined;
  const emailsSent: string[] = [];
  const tasksCreated: string[] = [];

  for (const person of recipients) {
    if (!person.email) continue;

    if (createTask) {
      const task = await prisma.task.create({
        data: {
          title: body.taskTitle?.trim() || `Instructions: ${project.title}`,
          description: message,
          status: "TODO",
          priority: body.priority || "MEDIUM",
          dueDate: dueDate ? new Date(dueDate) : null,
          projectId: project.id,
          assigneeId: person.id,
        },
      });
      tasksCreated.push(task.id);

      if (dueDate) {
        await prisma.reminder.create({
          data: {
            title: `Task: ${task.title}`,
            message,
            dueDate: new Date(dueDate),
            personId: person.id,
            taskId: task.id,
          },
        });
      }
    }

    const template = teamInstructionEmail({
      memberName: person.name,
      projectTitle: project.title,
      instructions: message,
      supervisorName: branding.name,
      dueDate: dueLabel,
    });
    const result = await sendEmail({
      to: person.email,
      ...template,
      category: "team",
    });
    if (result.success) emailsSent.push(person.email);
  }

  return NextResponse.json({
    success: true,
    emailsSent: emailsSent.length,
    recipients: emailsSent,
    tasksCreated: tasksCreated.length,
    message:
      emailsSent.length > 0
        ? `Instructions sent to ${emailsSent.length} team member${emailsSent.length === 1 ? "" : "s"}`
        : "Could not send emails. Check email settings.",
  });
}
