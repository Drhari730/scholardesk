import { NextRequest, NextResponse } from "next/server";
import { requireOwner, getOwnerEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, directMessageEmail, getEmailBranding, isEmailConfigured } from "@/lib/email";

export async function POST(req: NextRequest) {
  if (!(await requireOwner(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isEmailConfigured()) {
    return NextResponse.json({ error: "Email is not configured on the server." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const message = String(body.body ?? "").trim();
  const subject = body.subject ? String(body.subject).trim().slice(0, 200) : null;

  if (!body.personId) {
    return NextResponse.json({ error: "personId required" }, { status: 400 });
  }
  if (!message) {
    return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
  }

  const person = await prisma.person.findUnique({ where: { id: String(body.personId) } });
  if (!person) {
    return NextResponse.json({ error: "Person not found" }, { status: 404 });
  }
  if (!person.email) {
    return NextResponse.json({ error: "This person has no email address on file." }, { status: 400 });
  }

  const branding = await getEmailBranding();
  const template = directMessageEmail({
    name: person.name,
    subject,
    message: message.slice(0, 5000),
    supervisorName: branding.name,
  });

  const ownerEmail = await getOwnerEmail();
  const result = await sendEmail({
    to: person.email,
    ...template,
    category: "message",
    replyTo: ownerEmail ?? undefined,
  });

  if (!result.success) {
    return NextResponse.json({ error: "Email failed to send." }, { status: 502 });
  }
  return NextResponse.json({ ok: true, sentTo: person.email });
}
