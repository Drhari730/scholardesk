import { NextRequest, NextResponse } from "next/server";
import { requireOwner, getOwnerEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, independenceDayEmail, getEmailBranding, isEmailConfigured } from "@/lib/email";

// Send a festive Independence Day greeting to every registered person with an email.
// Pass { test: true } to send only to the owner (preview).
export async function POST(req: NextRequest) {
  if (!(await requireOwner(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isEmailConfigured()) {
    return NextResponse.json({ error: "Email is not configured on the server." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const branding0 = await getEmailBranding();
  if (body?.test) {
    const ownerEmail = await getOwnerEmail();
    if (!ownerEmail) {
      return NextResponse.json({ error: "No owner email on file." }, { status: 400 });
    }
    const template = independenceDayEmail({ name: branding0.name, supervisorName: branding0.name });
    const result = await sendEmail({ to: ownerEmail, ...template, category: "team" });
    return NextResponse.json({ ok: result.success, test: true, total: 1, sent: result.success ? 1 : 0, sentTo: ownerEmail, failed: [] });
  }

  const people = await prisma.person.findMany({
    where: { email: { not: null } },
    select: { id: true, name: true, email: true },
  });

  const branding = await getEmailBranding();
  let sent = 0;
  const failed: string[] = [];
  for (const p of people) {
    if (!p.email) continue;
    const template = independenceDayEmail({ name: p.name, supervisorName: branding.name });
    const result = await sendEmail({ to: p.email, ...template, category: "team" });
    if (result.success) sent += 1;
    else failed.push(p.email);
  }

  return NextResponse.json({ ok: true, total: people.length, sent, failed });
}
