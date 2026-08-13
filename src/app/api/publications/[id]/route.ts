import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, publicationStatusEmail, getEmailBranding } from "@/lib/email";
import { getOwnerEmail } from "@/lib/auth";
import { PUBLICATION_STATUSES } from "@/lib/constants";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.publication.findUnique({
    where: { id },
    include: { members: { include: { person: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const publication = await prisma.publication.update({
    where: { id },
    data: {
      title: body.title,
      journal: body.journal,
      authors: body.authors,
      status: body.status,
      submittedDate: body.submittedDate ? new Date(body.submittedDate) : undefined,
      decisionDate: body.decisionDate ? new Date(body.decisionDate) : undefined,
      reviewerComments: body.reviewerComments,
      doi: body.doi,
      manuscriptId: body.manuscriptId,
      notes: body.notes,
    },
    include: { members: { include: { person: true } } },
  });

  const emailsSent: string[] = [];
  if (body.status && body.status !== existing.status && body.sendEmail !== false) {
    const oldLabel =
      PUBLICATION_STATUSES.find((s) => s.value === existing.status)?.label ?? existing.status;
    const newLabel =
      PUBLICATION_STATUSES.find((s) => s.value === body.status)?.label ?? body.status;

    const buildTemplate = (name: string) =>
      publicationStatusEmail({
        memberName: name,
        publicationTitle: publication.title,
        oldStatus: oldLabel,
        newStatus: newLabel,
        newStatusValue: body.status,
        journal: publication.journal ?? undefined,
        reviewerComments: publication.reviewerComments ?? undefined,
      });

    for (const m of existing.members) {
      if (!m.person.email) continue;
      const result = await sendEmail({ to: m.person.email, ...buildTemplate(m.person.name), category: "publication" });
      if (result.success) emailsSent.push(m.person.email);
    }

    // Also notify the owner (so you get the update even with no team members)
    const ownerEmail = await getOwnerEmail();
    if (ownerEmail && !emailsSent.includes(ownerEmail)) {
      const branding = await getEmailBranding();
      const result = await sendEmail({ to: ownerEmail, ...buildTemplate(branding.name), category: "publication" });
      if (result.success) emailsSent.push(ownerEmail);
    }
  }

  return NextResponse.json({ ...publication, emailsSent });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.publication.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
