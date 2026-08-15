import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, independenceDayEmail, getEmailBranding, isEmailConfigured } from "@/lib/email";

// Send a festive Independence Day greeting to every registered person with an email.
export async function POST(req: NextRequest) {
  if (!(await requireOwner(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isEmailConfigured()) {
    return NextResponse.json({ error: "Email is not configured on the server." }, { status: 400 });
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
