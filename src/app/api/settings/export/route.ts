import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { gatherExportData, exportToJson } from "@/lib/export-data";
import { exportToExcelBuffer } from "@/lib/export-excel";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const format = req.nextUrl.searchParams.get("format") ?? "json";
  const data = await gatherExportData();
  const date = new Date().toISOString().split("T")[0];

  if (format === "xlsx") {
    const buffer = exportToExcelBuffer(data);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="scholardesk-backup-${date}.xlsx"`,
      },
    });
  }

  return new NextResponse(exportToJson(data), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="scholardesk-backup-${date}.json"`,
    },
  });
}
