import { NextRequest, NextResponse } from "next/server";
import { getPortalSessionFromRequest, getOwnerEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, portalMessageEmail, isEmailConfigured } from "@/lib/email";

export async function POST(req: NextRequest) {
  const session = await getPortalSessionFromRequest(req);
  if (!session || session.role !== "portal") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const text = String(body.body ?? "").trim();
  const subject = body.subject ? String(body.subject).trim().slice(0, 200) : null;

  if (!text) {
    return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
  }

  const person = await prisma.person.findUnique({ where: { id: session.personId } });
  if (!person) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const message = await prisma.portalMessage.create({
    data: {
      personId: person.id,
      fromName: person.name,
      fromEmail: person.email,
      fromRole: person.role,
      subject,
      body: text.slice(0, 5000),
    },
  });

  let emailSent = false;
  const ownerEmail = await getOwnerEmail();
  if (ownerEmail && isEmailConfigured()) {
    const template = portalMessageEmail({
      fromName: person.name,
      fromEmail: person.email,
      fromRole: person.role,
      subject,
      body: text,
    });
    const result = await sendEmail({
      to: ownerEmail,
      ...template,
      category: "message",
      replyTo: person.email ?? undefined,
    });
    emailSent = result.success;
  }

  return NextResponse.json({ ok: true, id: message.id, emailSent }, { status: 201 });
}
