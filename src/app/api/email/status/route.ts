import { NextResponse } from "next/server";
import { isEmailConfigured } from "@/lib/email";

export async function GET() {
  return NextResponse.json({
    configured: isEmailConfigured(),
    from: process.env.EMAIL_FROM ?? "ScholarDesk <onboarding@resend.dev>",
    provider: "Resend",
    docs: "https://resend.com/docs",
  });
}
