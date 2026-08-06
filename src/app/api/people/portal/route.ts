import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { setPortalPin, generatePortalPin, createPortalMagicToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  sendEmail,
  portalInviteEmail,
  getEmailBranding,
  isEmailConfigured,
} from "@/lib/email";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://scholardesk-production-55cf.up.railway.app";
const PORTAL_URL = `${APP_URL}/portal/login`;

async function enablePortalAndSendEmail(personId: string) {
  const person = await prisma.person.findUnique({ where: { id: personId } });
  if (!person) {
    return { success: false, error: "Person not found" };
  }
  if (!person.email) {
    return { success: false, error: "Add an email address first" };
  }

  const pin = generatePortalPin();
  await setPortalPin(personId, pin);

  if (!isEmailConfigured()) {
    return {
      success: true,
      emailSent: false,
      portalUrl: PORTAL_URL,
      message: "Portal enabled but email is not configured on the server.",
    };
  }

  const magicToken = await createPortalMagicToken(person.id, person.name);
  const magicLoginUrl = `${APP_URL}/api/auth/portal/magic?token=${encodeURIComponent(magicToken)}`;
  const branding = await getEmailBranding();
  const template = portalInviteEmail({
    name: person.name,
    email: person.email,
    pin,
    supervisorName: branding.name,
    portalUrl: PORTAL_URL,
    magicLoginUrl,
  });
  const result = await sendEmail({
    to: person.email,
    ...template,
    category: "team",
  });

  return {
    success: true,
    emailSent: result.success,
    portalUrl: PORTAL_URL,
    sentTo: person.email,
    message: result.success
      ? `Login email sent to ${person.email}`
      : `Portal enabled but email failed to send. Share the portal link manually.`,
  };
}

export async function POST(req: NextRequest) {
  if (!(await requireOwner(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { personId, portalEnabled, resendInvite } = body;

  if (!personId) {
    return NextResponse.json({ error: "personId required" }, { status: 400 });
  }

  if (portalEnabled === false) {
    await prisma.person.update({
      where: { id: personId },
      data: { portalEnabled: false, portalPinHash: null },
    });
    return NextResponse.json({ success: true });
  }

  if (resendInvite) {
    const person = await prisma.person.findUnique({ where: { id: personId } });
    if (!person?.portalEnabled) {
      return NextResponse.json({ error: "Enable portal first" }, { status: 400 });
    }
    const result = await enablePortalAndSendEmail(personId);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  }

  const result = await enablePortalAndSendEmail(personId);
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
