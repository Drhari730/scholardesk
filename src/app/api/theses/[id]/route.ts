import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const data: {
    title?: string;
    studentName?: string;
    personId?: string | null;
    degree?: string;
    status?: string;
    supervisor?: string | null;
    startDate?: Date | null;
    expectedEndDate?: Date | null;
    milestones?: string | null;
    notes?: string | null;
  } = {};
  if (body.title !== undefined) data.title = String(body.title).trim();
  if (body.studentName !== undefined) data.studentName = String(body.studentName).trim();
  if (body.personId !== undefined) {
    const pid = body.personId ? String(body.personId) : null;
    data.personId = pid;
    if (pid) {
      const person = await prisma.person.findUnique({ where: { id: pid } });
      if (person) data.studentName = person.name;
    }
  }
  if (body.degree !== undefined) data.degree = body.degree === "PHD" ? "PHD" : "MASTERS";
  if (body.status !== undefined) data.status = body.status;
  if (body.supervisor !== undefined) data.supervisor = body.supervisor || null;
  if (body.startDate !== undefined) data.startDate = body.startDate ? new Date(body.startDate) : null;
  if (body.expectedEndDate !== undefined) data.expectedEndDate = body.expectedEndDate ? new Date(body.expectedEndDate) : null;
  if (body.milestones !== undefined) data.milestones = body.milestones ?? null;
  if (body.notes !== undefined) data.notes = body.notes || null;

  const thesis = await prisma.thesis.update({ where: { id }, data });
  return NextResponse.json(thesis);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.thesis.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
