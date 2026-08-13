import { NextRequest, NextResponse } from "next/server";
import { requireOwner, getOwnerEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, directMessageEmail, getEmailBranding, isEmailConfigured } from "@/lib/email";

// Owner sends a message to one or more people. Stores an OUTBOUND record per
// person (so it appears in the conversation) and emails those with an address.
export async function POST(req: NextRequest) {
  if (!(await requireOwner(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body.personIds)
    ? body.personIds.map(String)
    : body.personId
    ? [String(body.personId)]
    : [];
  const message = String(body.body ?? "").trim();
  const subject = body.subject ? String(body.subject).trim().slice(0, 200) : null;

  if (!ids.length) {
    return NextResponse.json({ error: "Select at least one person." }, { status: 400 });
  }
  if (!message) {
    return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
  }

  const people = await prisma.person.findMany({ where: { id: { in: ids } } });
  const branding = await getEmailBranding();
  const ownerEmail = await getOwnerEmail();
  const emailOk = isEmailConfigured();

  let sent = 0;
  let stored = 0;
  const failed: string[] = [];

  for (const p of people) {
    await prisma.portalMessage.create({
      data: {
        personId: p.id,
        direction: "OUTBOUND",
        fromName: branding.name,
        fromEmail: ownerEmail ?? null,
        fromRole: "OWNER",
        subject,
        body: message.slice(0, 5000),
        isRead: false,
      },
    });
    stored += 1;

    if (p.email && emailOk) {
      const template = directMessageEmail({
        name: p.name,
        subject,
        message,
        supervisorName: branding.name,
      });
      const result = await sendEmail({
        to: p.email,
        ...template,
        category: "message",
        replyTo: ownerEmail ?? undefined,
      });
      if (result.success) sent += 1;
      else failed.push(p.email);
    } else if (!p.email) {
      failed.push(p.name);
    }
  }

  return NextResponse.json({ ok: true, stored, sent, failed, total: people.length });
}
