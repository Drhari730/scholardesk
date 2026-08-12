import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const message = await prisma.portalMessage.update({
    where: { id },
    data: { isRead: Boolean(body.isRead) },
  });
  return NextResponse.json(message);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.portalMessage.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
