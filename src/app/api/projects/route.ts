import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, projectCreatedEmail } from "@/lib/email";
import { RESEARCH_PHASES } from "@/lib/constants";

export async function GET() {
  const projects = await prisma.researchProject.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      members: { include: { person: true } },
      tasks: { include: { assignee: true } },
      _count: { select: { tasks: true } },
    },
  });
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const phaseLabel =
    RESEARCH_PHASES.find((p) => p.value === (body.researchPhase || "PROTOCOL_DEVELOPMENT"))?.label ??
    body.researchPhase;

  const project = await prisma.researchProject.create({
    data: {
      title: body.title,
      description: body.description,
      status: body.status || "PLANNING",
      priority: body.priority || "MEDIUM",
      aims: body.aims,
      objectives: body.objectives,
      methodology: body.methodology,
      studyState: body.studyState,
      researchPhase: body.researchPhase || "PROTOCOL_DEVELOPMENT",
      timeline: body.timeline,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      tags: body.tags,
      notes: body.notes,
    },
    include: { members: { include: { person: true } } },
  });

  const emailsSent: string[] = [];
  if (body.notifyTeam && body.memberIds?.length) {
    for (const personId of body.memberIds as string[]) {
      const person = await prisma.person.findUnique({ where: { id: personId } });
      if (!person?.email) continue;
      const template = projectCreatedEmail({
        memberName: person.name,
        projectTitle: project.title,
        aims: project.aims ?? undefined,
        objectives: project.objectives ?? undefined,
        methodology: project.methodology ?? undefined,
        studyState: project.studyState ?? undefined,
        researchPhase: phaseLabel,
        timeline: project.timeline ?? undefined,
      });
      const result = await sendEmail({ to: person.email, ...template });
      if (result.success) emailsSent.push(person.email);
      await prisma.projectMember.create({
        data: { projectId: project.id, personId, role: "MEMBER" },
      });
    }
  }

  return NextResponse.json({ ...project, emailsSent }, { status: 201 });
}
