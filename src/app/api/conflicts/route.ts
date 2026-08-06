import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getAllUpcomingConflicts } from "@/lib/conflicts";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conflicts = await getAllUpcomingConflicts();
  return NextResponse.json(conflicts);
}
