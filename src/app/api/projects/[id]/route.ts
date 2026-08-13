import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, projectPhaseUpdateEmail, getEmailBranding } from "@/lib/email";
import { getOwnerEmail } from "@/lib/auth";
import { RESEARCH_PHASES } from "@/lib/constants";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = await prisma.researchProject.findUnique({
    where: { id },
    include: {
      members: { include: { person: true } },
      tasks: { include: { assignee: true } },
    },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(project);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const existing = await prisma.researchProject.findUnique({
    where: { id },
    include: { members: { include: { person: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const project = await prisma.researchProject.update({
    where: { id },
    data: {
      title: body.title,
      description: body.description,
      status: body.status,
      priority: body.priority,
      aims: body.aims,
      objectives: body.objectives,
      methodology: body.methodology,
      studyState: body.studyState,
      researchPhase: body.researchPhase,
      timeline: body.timeline,
      startDate: body.startDate ? new Date(body.startDate) : body.startDate === null ? null : undefined,
      endDate: body.endDate ? new Date(body.endDate) : body.endDate === null ? null : undefined,
      tags: body.tags,
      notes: body.notes,
    },
    include: { members: { include: { person: true } } },
  });

  const emailsSent: string[] = [];
  if (
    body.sendEmail !== false &&
    body.researchPhase &&
    body.researchPhase !== existing.researchPhase
  ) {
    const oldLabel =
      RESEARCH_PHASES.find((p) => p.value === existing.researchPhase)?.label ??
      existing.researchPhase;
    const newLabel =
      RESEARCH_PHASES.find((p) => p.value === body.researchPhase)?.label ?? body.researchPhase;

    const buildTemplate = (name: string) =>
      projectPhaseUpdateEmail({
        memberName: name,
        projectTitle: project.title,
        oldPhase: oldLabel,
        newPhase: newLabel,
        studyState: project.studyState ?? undefined,
      });

    for (const m of existing.members) {
      if (!m.person.email) continue;
      const result = await sendEmail({ to: m.person.email, ...buildTemplate(m.person.name), category: "project" });
      if (result.success) emailsSent.push(m.person.email);
    }

    const ownerEmail = await getOwnerEmail();
    if (ownerEmail && !emailsSent.includes(ownerEmail)) {
      const branding = await getEmailBranding();
      const result = await sendEmail({ to: ownerEmail, ...buildTemplate(branding.name), category: "project" });
      if (result.success) emailsSent.push(ownerEmail);
    }
  }

  return NextResponse.json({ ...project, emailsSent });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.researchProject.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
