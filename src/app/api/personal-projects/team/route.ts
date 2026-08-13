import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPortalMagicToken } from "@/lib/auth";
import { sendEmail, personalProjectAccessEmail, isEmailConfigured } from "@/lib/email";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://scholardesk-production-55cf.up.railway.app";

// List all people with their personal-project membership + portal status
export async function GET() {
  const people = await prisma.person.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      portalEnabled: true,
      personalProjectMember: true,
    },
  });
  return NextResponse.json(people);
}

// Toggle a person's personal-project membership (emails them when newly added)
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (!body.personId) {
    return NextResponse.json({ error: "personId required" }, { status: 400 });
  }

  const before = await prisma.person.findUnique({
    where: { id: String(body.personId) },
    select: { id: true, name: true, email: true, portalEnabled: true, personalProjectMember: true },
  });
  if (!before) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const member = Boolean(body.member);
  await prisma.person.update({
    where: { id: before.id },
    data: { personalProjectMember: member },
  });

  // Notify the member only when newly granted access
  let emailSent = false;
  const newlyAdded = member && !before.personalProjectMember;
  if (newlyAdded && before.email && isEmailConfigured()) {
    let loginUrl = `${APP_URL}/portal/login`;
    if (before.portalEnabled) {
      const token = await createPortalMagicToken(before.id, before.name);
      loginUrl = `${APP_URL}/api/auth/portal/magic?token=${encodeURIComponent(token)}`;
    }
    const template = personalProjectAccessEmail({
      name: before.name,
      loginUrl,
      hasPortalAccess: before.portalEnabled,
    });
    const result = await sendEmail({ to: before.email, ...template, category: "team" });
    emailSent = result.success;
  }

  return NextResponse.json({ id: before.id, personalProjectMember: member, emailSent, newlyAdded });
}
