import { NextRequest, NextResponse } from "next/server";
import { getPortalSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { manuscriptProgress } from "@/lib/constants";

async function requireMember(req: NextRequest) {
  const session = await getPortalSessionFromRequest(req);
  if (!session || session.role !== "portal") return null;
  const person = await prisma.person.findUnique({
    where: { id: session.personId },
    select: { id: true, name: true, personalProjectMember: true },
  });
  if (!person || !person.personalProjectMember) return null;
  return person;
}

// A portal member's own personal projects
export async function GET(req: NextRequest) {
  const person = await requireMember(req);
  if (!person) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await prisma.personalProject.findMany({
    where: { createdById: person.id },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });
  return NextResponse.json(projects);
}

// Create + auto-share into the admin's folder
export async function POST(req: NextRequest) {
  const person = await requireMember(req);
  if (!person) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (!body.title || !String(body.title).trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const kind = body.kind === "MANUSCRIPT" ? "MANUSCRIPT" : "GENERAL";
  const stage = kind === "MANUSCRIPT" ? String(body.stage || "IDEA") : null;
  const progress =
    kind === "MANUSCRIPT"
      ? manuscriptProgress(stage)
      : Math.max(0, Math.min(100, Number(body.progress) || 0));

  const project = await prisma.personalProject.create({
    data: {
      title: String(body.title).trim(),
      description: body.description || null,
      category: body.category || null,
      status: body.status || "ACTIVE",
      priority: body.priority || "MEDIUM",
      kind,
      stage,
      journal: kind === "MANUSCRIPT" ? body.journal || null : null,
      progress,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      checklist: body.checklist ?? null,
      notes: body.notes || null,
      createdById: person.id,
      createdByName: person.name,
    },
  });
  return NextResponse.json(project, { status: 201 });
}
