import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Mark all inbound (person→admin) messages from a person as read.
export async function POST(req: NextRequest) {
  if (!(await requireOwner(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  if (!body.personId) {
    return NextResponse.json({ error: "personId required" }, { status: 400 });
  }
  await prisma.portalMessage.updateMany({
    where: { personId: String(body.personId), direction: "INBOUND", isRead: false },
    data: { isRead: true },
  });
  return NextResponse.json({ ok: true });
}
