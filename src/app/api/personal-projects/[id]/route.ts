import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const data: {
    title?: string;
    description?: string | null;
    category?: string | null;
    status?: string;
    priority?: string;
    progress?: number;
    dueDate?: Date | null;
    checklist?: string | null;
    notes?: string | null;
  } = {};
  if (body.title !== undefined) data.title = String(body.title).trim();
  if (body.description !== undefined) data.description = body.description || null;
  if (body.category !== undefined) data.category = body.category || null;
  if (body.status !== undefined) data.status = body.status;
  if (body.priority !== undefined) data.priority = body.priority;
  if (body.progress !== undefined) data.progress = Math.max(0, Math.min(100, Number(body.progress) || 0));
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (body.checklist !== undefined) data.checklist = body.checklist ?? null;
  if (body.notes !== undefined) data.notes = body.notes || null;

  const project = await prisma.personalProject.update({ where: { id }, data });
  return NextResponse.json(project);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.personalProject.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
