import { NextResponse } from "next/server";
import {
  isEmailConfigured,
  FROM_EMAIL,
  getDomainDeliverabilityStatus,
  getReplyToEmail,
} from "@/lib/email";

export async function GET() {
  const deliverability = await getDomainDeliverabilityStatus();
  const replyTo = await getReplyToEmail();

  return NextResponse.json({
    configured: isEmailConfigured(),
    from: FROM_EMAIL,
    replyTo,
    provider: "Resend",
    deliverability,
    tips: [
      "Set your real email in Settings → Profile so replies go to your inbox (not info@).",
      "Ask new team members to mark the first email as Not Spam — this trains Gmail.",
      "Ensure vicharaqda.in has SPF, DKIM, and DMARC verified in Resend (resend.com/domains).",
      "If using GoDaddy DNS, keep Resend's DKIM/SPF records exactly as shown in Resend.",
    ],
    docs: "https://resend.com/docs/dashboard/domains/introduction",
  });
}
