import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  sendEmail,
  welcomePersonEmail,
  portalInviteEmail,
  getEmailBranding,
  getReplyToEmail,
  isEmailConfigured,
} from "@/lib/email";
import { setPortalPin, generatePortalPin, createPortalMagicToken } from "@/lib/auth";
import { PERSON_ROLES } from "@/lib/constants";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://scholardesk-production-55cf.up.railway.app";

export async function GET() {
  const people = await prisma.person.findMany({
    orderBy: { name: "asc" },
    include: {
      projectMembers: { include: { project: true } },
      _count: { select: { tasks: true, publicationMembers: true } },
    },
  });
  return NextResponse.json(people);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const person = await prisma.person.create({
    data: {
      name: body.name,
      email: body.email,
      phone: body.phone,
      role: body.role || "STUDENT",
      department: body.department,
      notes: body.notes,
    },
  });

  let emailSent = false;
  if (body.sendEmail && person.email) {
    const roleLabel = PERSON_ROLES.find((r) => r.value === person.role)?.label ?? person.role;
    const branding = await getEmailBranding();
    const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });
    const replyEmail = await getReplyToEmail();
    const template = welcomePersonEmail({
      name: person.name,
      role: roleLabel,
      supervisorName: branding.name,
      institution: settings?.institution ?? "MSRUAS, Bengaluru",
      replyEmail: replyEmail ?? undefined,
    });
    const result = await sendEmail({ to: person.email, ...template, category: "team" });
    emailSent = result.success;
  }

  let portalEnabled = false;
  let portalEmailSent = false;
  if (body.enablePortal && person.email) {
    const pin = generatePortalPin();
    await setPortalPin(person.id, pin);
    portalEnabled = true;

    if (isEmailConfigured()) {
      const magicToken = await createPortalMagicToken(person.id, person.name);
      const magicLoginUrl = `${APP_URL}/api/auth/portal/magic?token=${encodeURIComponent(magicToken)}`;
      const branding = await getEmailBranding();
      const template = portalInviteEmail({
        name: person.name,
        email: person.email,
        pin,
        supervisorName: branding.name,
        portalUrl: `${APP_URL}/portal/login`,
        magicLoginUrl,
      });
      const result = await sendEmail({ to: person.email, ...template, category: "team" });
      portalEmailSent = result.success;
    }
  }

  return NextResponse.json(
    { ...person, emailSent, portalEnabled, portalEmailSent },
    { status: 201 }
  );
}
