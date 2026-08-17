import { NextRequest, NextResponse } from "next/server";
import { getPortalSessionFromRequest, getOwnerEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, thesisUpdateEmail, getEmailBranding, isEmailConfigured } from "@/lib/email";

// A portal student updates their own thesis timeline (milestones) and/or status.
export async function PATCH(req: NextRequest) {
  const session = await getPortalSessionFromRequest(req);
  if (!session || session.role !== "portal") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const person = await prisma.person.findUnique({ where: { id: session.personId } });
  if (!person) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));

  // Resolve the student's thesis (by id if given, else their most recent one)
  const thesis = body.thesisId
    ? await prisma.thesis.findUnique({ where: { id: String(body.thesisId) } })
    : await prisma.thesis.findFirst({ where: { personId: person.id }, orderBy: { createdAt: "desc" } });

  if (!thesis || thesis.personId !== person.id) {
    return NextResponse.json({ error: "No thesis linked to you" }, { status: 404 });
  }

  const data: { milestones?: string | null; status?: string } = {};
  if (body.milestones !== undefined) data.milestones = body.milestones ?? null;
  if (body.status !== undefined) data.status = String(body.status);

  const updated = await prisma.thesis.update({ where: { id: thesis.id }, data });

  // Notify the supervisor
  const ownerEmail = await getOwnerEmail();
  if (ownerEmail && isEmailConfigured()) {
    const branding = await getEmailBranding();
    const template = thesisUpdateEmail({
      recipientName: branding.name,
      actorName: person.name,
      thesisTitle: updated.title,
      studentName: updated.studentName,
      summary: `${person.name} updated their thesis timeline from the Team Portal.`,
    });
    await sendEmail({ to: ownerEmail, ...template, category: "team" });
  }

  return NextResponse.json({ ok: true, thesis: updated });
}
