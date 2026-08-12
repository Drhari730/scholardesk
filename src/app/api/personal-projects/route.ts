import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const projects = await prisma.personalProject.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (!body.title || !String(body.title).trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  const project = await prisma.personalProject.create({
    data: {
      title: String(body.title).trim(),
      description: body.description || null,
      category: body.category || null,
      status: body.status || "ACTIVE",
      priority: body.priority || "MEDIUM",
      progress: Math.max(0, Math.min(100, Number(body.progress) || 0)),
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      checklist: body.checklist ?? null,
      notes: body.notes || null,
    },
  });
  return NextResponse.json(project, { status: 201 });
}
