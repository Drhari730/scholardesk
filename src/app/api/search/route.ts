import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { globalSearch } from "@/lib/search";

export async function GET(req: NextRequest) {
  if (!(await requireOwner(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q") ?? "";
  const results = await globalSearch(q);
  return NextResponse.json(results);
}
