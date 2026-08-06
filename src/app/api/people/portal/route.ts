import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { setPortalPin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  sendEmail,
  portalInviteEmail,
  getEmailBranding,
  isEmailConfigured,
} from "@/lib/email";

const PORTAL_URL =
  `${process.env.NEXT_PUBLIC_APP_URL ?? "https://scholardesk-production-55cf.up.railway.app"}/portal/login`;

async function sendPortalInvite(personId: string, pin: string) {
  const person = await prisma.person.findUnique({ where: { id: personId } });
  if (!person?.email) {
    return { emailSent: false, reason: "no_email" as const };
  }

  if (!isEmailConfigured()) {
    return { emailSent: false, reason: "email_not_configured" as const };
  }

  const branding = await getEmailBranding();
  const template = portalInviteEmail({
    name: person.name,
    email: person.email,
    pin,
    supervisorName: branding.name,
    portalUrl: PORTAL_URL,
  });
  const result = await sendEmail({
    to: person.email,
    ...template,
    category: "team",
  });

  return { emailSent: result.success, reason: result.success ? undefined : result.reason };
}

export async function POST(req: NextRequest) {
  if (!(await requireOwner(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { personId, pin, portalEnabled, resendInvite } = body;

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
      return NextResponse.json({ error: "Portal access is not enabled for this person" }, { status: 400 });
    }
    if (!pin || String(pin).length < 4) {
      return NextResponse.json(
        { error: "Enter the current PIN to resend the invite email" },
        { status: 400 }
      );
    }
    await setPortalPin(personId, String(pin));
    const invite = await sendPortalInvite(personId, String(pin));
    return NextResponse.json({
      success: true,
      portalUrl: PORTAL_URL,
      ...invite,
    });
  }

  if (!pin || String(pin).length < 4) {
    return NextResponse.json({ error: "PIN must be at least 4 characters" }, { status: 400 });
  }

  await setPortalPin(personId, String(pin));
  const invite = await sendPortalInvite(personId, String(pin));

  return NextResponse.json({
    success: true,
    portalUrl: PORTAL_URL,
    ...invite,
  });
}
