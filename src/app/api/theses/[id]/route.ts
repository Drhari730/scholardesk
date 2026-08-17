import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, thesisUpdateEmail, getEmailBranding, isEmailConfigured } from "@/lib/email";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const existing = await prisma.thesis.findUnique({ where: { id }, include: { person: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
    instructions?: string | null;
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
  if (body.instructions !== undefined) data.instructions = body.instructions || null;
  if (body.notes !== undefined) data.notes = body.notes || null;

  const thesis = await prisma.thesis.update({ where: { id }, data, include: { person: true } });

  // Notify the linked student when meaningful things change (and requested)
  const changedStatus = data.status !== undefined && data.status !== existing.status;
  const changedTimeline = data.milestones !== undefined && data.milestones !== existing.milestones;
  const changedInstructions = data.instructions !== undefined && data.instructions !== existing.instructions;
  const notify = body.notifyStudent !== false && (changedStatus || changedTimeline || changedInstructions);

  if (notify && thesis.person?.email && isEmailConfigured()) {
    const branding = await getEmailBranding();
    const parts: string[] = [];
    if (changedStatus) parts.push(`status is now “${thesis.status}”`);
    if (changedTimeline) parts.push("the milestone timeline was updated");
    if (changedInstructions) parts.push("new instructions were added");
    const template = thesisUpdateEmail({
      recipientName: thesis.person.name,
      actorName: branding.name,
      thesisTitle: thesis.title,
      studentName: thesis.studentName,
      summary: `Your supervisor updated your thesis: ${parts.join(", ")}.`,
      instructions: changedInstructions ? thesis.instructions : null,
    });
    await sendEmail({ to: thesis.person.email, ...template, category: "team" });
  }

  return NextResponse.json(thesis);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.thesis.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
