import { NextRequest, NextResponse } from "next/server";
import { getPortalSessionFromRequest, getEmailPrefs } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, taskStatusUpdateEmail, getEmailBranding } from "@/lib/email";
import { TASK_STATUSES, getStatusMeta } from "@/lib/constants";

const ALLOWED_STATUSES = new Set(["TODO", "IN_PROGRESS", "DELAYED", "BLOCKED", "COMPLETED"]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getPortalSessionFromRequest(req);
  if (!session || session.role !== "portal") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const status = body.status as string;

  if (!status || !ALLOWED_STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const existing = await prisma.task.findUnique({
    where: { id },
    include: { project: true, assignee: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (existing.assigneeId !== session.personId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (existing.status === status) {
    return NextResponse.json(existing);
  }

  const task = await prisma.task.update({
    where: { id },
    data: {
      status,
      completedAt: status === "COMPLETED" ? new Date() : null,
    },
    include: { project: true },
  });

  const prefs = await getEmailPrefs();
  if (prefs.emailOnTask) {
    const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });
    const ownerEmail = settings?.email ?? process.env.REPLY_TO_EMAIL;
    if (ownerEmail) {
      const branding = await getEmailBranding();
      const statusLabel = getStatusMeta(TASK_STATUSES, status).label;
      const template = taskStatusUpdateEmail({
        memberName: existing.assignee?.name ?? "Team member",
        taskTitle: task.title,
        projectTitle: task.project?.title,
        statusLabel,
        supervisorName: branding.name,
      });
      await sendEmail({ to: ownerEmail, ...template, category: "task" });
    }
  }

  return NextResponse.json(task);
}
