import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const secret = process.env.CALENDAR_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Calendar not configured" }, { status: 503 });
  }

  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  return NextResponse.json({
    feedUrl: `${base}/api/calendar/ical?token=${secret}`,
    webcalUrl: `${base}/api/calendar/ical?token=${secret}`.replace(/^https:/, "webcal:").replace(/^http:/, "webcal:"),
  });
}
