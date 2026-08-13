import { NextRequest, NextResponse } from "next/server";
import { requireOwner, createPortalMagicToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, portalMovedEmail, getEmailBranding, isEmailConfigured } from "@/lib/email";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://scholardesk-production-55cf.up.railway.app";

// Email every portal-enabled member a fresh magic sign-in link for the current
// (new) domain. Does NOT change anyone's PIN.
export async function POST(req: NextRequest) {
  if (!(await requireOwner(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isEmailConfigured()) {
    return NextResponse.json({ error: "Email is not configured on the server." }, { status: 400 });
  }

  const people = await prisma.person.findMany({
    where: { portalEnabled: true, email: { not: null } },
    select: { id: true, name: true, email: true },
  });

  const branding = await getEmailBranding();
  const portalUrl = `${APP_URL}/portal/login`;
  let newUrl = APP_URL;
  try {
    newUrl = new URL(APP_URL).host;
  } catch {
    /* keep APP_URL */
  }

  let sent = 0;
  const failed: string[] = [];
  for (const p of people) {
    if (!p.email) continue;
    const magicToken = await createPortalMagicToken(p.id, p.name);
    const magicLoginUrl = `${APP_URL}/api/auth/portal/magic?token=${encodeURIComponent(magicToken)}`;
    const template = portalMovedEmail({
      name: p.name,
      magicLoginUrl,
      portalUrl,
      newUrl,
      supervisorName: branding.name,
    });
    const result = await sendEmail({ to: p.email, ...template, category: "team" });
    if (result.success) sent += 1;
    else failed.push(p.email);
  }

  return NextResponse.json({ ok: true, total: people.length, sent, failed });
}
