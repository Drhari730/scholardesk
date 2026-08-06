import { NextRequest, NextResponse } from "next/server";
import { exchangeGoogleCode } from "@/lib/google-calendar";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/calendar?google=error`);
  }

  try {
    await exchangeGoogleCode(code);
    return NextResponse.redirect(`${appUrl}/calendar?google=connected`);
  } catch {
    return NextResponse.redirect(`${appUrl}/calendar?google=error`);
  }
}
