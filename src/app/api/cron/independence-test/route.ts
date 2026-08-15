import { NextResponse } from "next/server";
import { getOwnerEmail } from "@/lib/auth";
import { sendEmail, independenceDayEmail, getEmailBranding, isEmailConfigured } from "@/lib/email";

// Bearer-protected (via middleware /api/cron/* + CRON_SECRET) test that sends the
// Independence Day greeting to the OWNER only, for previewing.
export async function GET() {
  if (!isEmailConfigured()) {
    return NextResponse.json({ error: "Email not configured" }, { status: 400 });
  }
  const ownerEmail = await getOwnerEmail();
  if (!ownerEmail) {
    return NextResponse.json({ error: "No owner email on file" }, { status: 400 });
  }
  const branding = await getEmailBranding();
  const template = independenceDayEmail({ name: branding.name, supervisorName: branding.name });
  const result = await sendEmail({ to: ownerEmail, ...template, category: "team" });
  return NextResponse.json({ ok: result.success, sentTo: ownerEmail });
}

export async function POST() {
  return GET();
}
