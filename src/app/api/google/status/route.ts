import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { isGoogleCalendarConnected, disconnectGoogleCalendar } from "@/lib/google-calendar";

export async function GET(req: NextRequest) {
  if (!(await requireOwner(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connected = await isGoogleCalendarConnected();
  return NextResponse.json({ connected, configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) });
}

export async function DELETE(req: NextRequest) {
  if (!(await requireOwner(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await disconnectGoogleCalendar();
  return NextResponse.json({ success: true });
}
