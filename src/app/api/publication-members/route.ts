import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, publicationTeamEmail } from "@/lib/email";
import { getEmailPrefs } from "@/lib/auth";
import { PUBLICATION_MEMBER_ROLES, PUBLICATION_STATUSES } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const member = await prisma.publicationMember.create({
    data: {
      publicationId: body.publicationId,
      personId: body.personId,
      role: body.role || "CO_AUTHOR",
    },
    include: { person: true, publication: true },
  });

  let emailSent = false;
  const prefs = await getEmailPrefs();
  if (body.sendEmail !== false && member.person.email && prefs.emailOnPublication) {
    const roleLabel =
      PUBLICATION_MEMBER_ROLES.find((r) => r.value === member.role)?.label ?? member.role;
    const statusLabel =
      PUBLICATION_STATUSES.find((s) => s.value === member.publication.status)?.label ??
      member.publication.status;
    const template = publicationTeamEmail({
      memberName: member.person.name,
      publicationTitle: member.publication.title,
      role: roleLabel,
      journal: member.publication.journal ?? undefined,
      status: statusLabel,
    });
    const result = await sendEmail({ to: member.person.email, ...template, category: "team" });
    emailSent = result.success;
  }

  return NextResponse.json({ ...member, emailSent }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.publicationMember.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
