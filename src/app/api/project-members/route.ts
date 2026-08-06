import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, projectInviteEmail } from "@/lib/email";
import { getEmailPrefs } from "@/lib/auth";
import { PERSON_ROLES } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const member = await prisma.projectMember.create({
    data: {
      projectId: body.projectId,
      personId: body.personId,
      role: body.role || "MEMBER",
    },
    include: {
      person: true,
      project: true,
    },
  });

  let emailSent = false;
  const prefs = await getEmailPrefs();
  if (body.sendEmail !== false && member.person.email && prefs.emailOnProject) {
    const roleLabel =
      PERSON_ROLES.find((r) => r.value === member.role)?.label ?? member.role;
    const template = projectInviteEmail({
      memberName: member.person.name,
      projectTitle: member.project.title,
      role: roleLabel,
      description: member.project.description ?? undefined,
    });
    const result = await sendEmail({ to: member.person.email, ...template });
    emailSent = result.success;
  }

  return NextResponse.json({ ...member, emailSent }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.projectMember.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
