import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [messages, unread] = await Promise.all([
    prisma.portalMessage.findMany({
      orderBy: { createdAt: "asc" },
      take: 500,
      include: { person: { select: { id: true, name: true, email: true, role: true } } },
    }),
    prisma.portalMessage.count({ where: { direction: "INBOUND", isRead: false } }),
  ]);
  return NextResponse.json({ messages, unread });
}
