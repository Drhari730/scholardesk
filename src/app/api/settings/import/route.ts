import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { importBackupData } from "@/lib/import-data";

export async function POST(req: NextRequest) {
  if (!(await requireOwner(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  let data: Record<string, unknown>;
  let mode: "merge" | "replace" = "merge";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    mode = (form.get("mode") as "merge" | "replace") || "merge";
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
    data = JSON.parse(await file.text());
  } else {
    const body = await req.json();
    data = body.data ?? body;
    mode = body.mode === "replace" ? "replace" : "merge";
  }

  if (!data.people && !data.projects && !data.publications) {
    return NextResponse.json({ error: "Invalid backup file" }, { status: 400 });
  }

  const stats = await importBackupData(data, mode);
  return NextResponse.json({ success: true, stats, mode });
}
