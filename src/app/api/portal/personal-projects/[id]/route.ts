import { NextRequest, NextResponse } from "next/server";
import { getPortalSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { manuscriptProgress } from "@/lib/constants";

async function ownedProject(req: NextRequest, id: string) {
  const session = await getPortalSessionFromRequest(req);
  if (!session || session.role !== "portal") return null;
  const person = await prisma.person.findUnique({
    where: { id: session.personId },
    select: { id: true, personalProjectMember: true },
  });
  if (!person || !person.personalProjectMember) return null;
  const project = await prisma.personalProject.findUnique({ where: { id } });
  if (!project || project.createdById !== person.id) return null;
  return person;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owner = await ownedProject(req, id);
  if (!owner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const data: {
    title?: string;
    description?: string | null;
    category?: string | null;
    status?: string;
    priority?: string;
    progress?: number;
    kind?: string;
    stage?: string | null;
    journal?: string | null;
    dueDate?: Date | null;
    checklist?: string | null;
    notes?: string | null;
  } = {};
  if (body.title !== undefined) data.title = String(body.title).trim();
  if (body.description !== undefined) data.description = body.description || null;
  if (body.category !== undefined) data.category = body.category || null;
  if (body.status !== undefined) data.status = body.status;
  if (body.priority !== undefined) data.priority = body.priority;
  if (body.kind !== undefined) data.kind = body.kind === "MANUSCRIPT" ? "MANUSCRIPT" : "GENERAL";
  if (body.journal !== undefined) data.journal = body.journal || null;
  if (body.stage !== undefined) {
    data.stage = body.stage || null;
    data.progress = manuscriptProgress(body.stage);
  }
  if (body.progress !== undefined && body.stage === undefined) {
    data.progress = Math.max(0, Math.min(100, Number(body.progress) || 0));
  }
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (body.checklist !== undefined) data.checklist = body.checklist ?? null;
  if (body.notes !== undefined) data.notes = body.notes || null;

  const project = await prisma.personalProject.update({ where: { id }, data });
  return NextResponse.json(project);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owner = await ownedProject(req, id);
  if (!owner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.personalProject.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
