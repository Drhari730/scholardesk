import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { getSessionFromRequest } from "@/lib/auth";

// One-click SSO into Vritta (the meeting-minutes app on drhari.co.in).
// Flow: the ScholarDesk owner clicks "Vritta Meetings" -> this route confirms
// they are the signed-in owner, mints a short-lived token signed with a secret
// shared with the Vritta backend, and redirects to Vritta's /vritta/sso, which
// verifies the token and logs them in. No password typed.
const VRITTA_URL = process.env.VRITTA_URL || "https://drhari.co.in";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== "owner") {
    // Not signed in as the owner — send them to the ScholarDesk login first.
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const secret = process.env.VRITTA_SSO_SECRET;
  if (!secret) {
    // SSO not configured yet — just open Vritta's normal sign-in.
    return NextResponse.redirect(`${VRITTA_URL}/vritta`);
  }

  const token = await new SignJWT({ purpose: "vritta-sso", iss: "scholardesk" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2m")
    .sign(new TextEncoder().encode(secret));

  return NextResponse.redirect(`${VRITTA_URL}/vritta/sso?token=${encodeURIComponent(token)}`);
}
