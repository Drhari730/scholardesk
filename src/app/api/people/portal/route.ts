import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { setPortalPin } from "@/lib/auth";

export async function POST(req: NextRequest) {
  if (!(await requireOwner(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { personId, pin, portalEnabled } = body;

  if (!personId) {
    return NextResponse.json({ error: "personId required" }, { status: 400 });
  }

  if (portalEnabled === false) {
    const { prisma } = await import("@/lib/prisma");
    await prisma.person.update({
      where: { id: personId },
      data: { portalEnabled: false, portalPinHash: null },
    });
    return NextResponse.json({ success: true });
  }

  if (!pin || String(pin).length < 4) {
    return NextResponse.json({ error: "PIN must be at least 4 characters" }, { status: 400 });
  }

  await setPortalPin(personId, String(pin));
  return NextResponse.json({ success: true });
}
