import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { getGoogleAuthUrl } from "@/lib/google-calendar";

export async function GET(req: NextRequest) {
  if (!(await requireOwner(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = await getGoogleAuthUrl();
  if (!url) {
    return NextResponse.json(
      { error: "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Railway variables" },
      { status: 400 }
    );
  }
  return NextResponse.json({ url });
}
