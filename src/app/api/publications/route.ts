import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, publicationTeamEmail } from "@/lib/email";
import { PUBLICATION_MEMBER_ROLES, PUBLICATION_STATUSES } from "@/lib/constants";

export async function GET() {
  const publications = await prisma.publication.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      members: { include: { person: true } },
      revisions: { orderBy: { round: "asc" } },
    },
  });
  return NextResponse.json(publications);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const publication = await prisma.publication.create({
    data: {
      title: body.title,
      journal: body.journal,
      authors: body.authors,
      status: body.status || "DRAFT",
      submittedDate: body.submittedDate ? new Date(body.submittedDate) : null,
      decisionDate: body.decisionDate ? new Date(body.decisionDate) : null,
      reviewerComments: body.reviewerComments,
      doi: body.doi,
      manuscriptId: body.manuscriptId,
      notes: body.notes,
    },
    include: { members: { include: { person: true } } },
  });

  const emailsSent: string[] = [];
  if (body.memberIds?.length) {
    const statusLabel =
      PUBLICATION_STATUSES.find((s) => s.value === publication.status)?.label ??
      publication.status;
    for (const entry of body.memberIds as Array<{ personId: string; role?: string }>) {
      const member = await prisma.publicationMember.create({
        data: {
          publicationId: publication.id,
          personId: entry.personId,
          role: entry.role || "CO_AUTHOR",
        },
        include: { person: true },
      });
      if (body.sendEmail !== false && member.person.email) {
        const roleLabel =
          PUBLICATION_MEMBER_ROLES.find((r) => r.value === member.role)?.label ?? member.role;
        const template = publicationTeamEmail({
          memberName: member.person.name,
          publicationTitle: publication.title,
          role: roleLabel,
          journal: publication.journal ?? undefined,
          status: statusLabel,
        });
        const result = await sendEmail({ to: member.person.email, ...template });
        if (result.success) emailsSent.push(member.person.email);
      }
    }
  }

  return NextResponse.json({ ...publication, emailsSent }, { status: 201 });
}
