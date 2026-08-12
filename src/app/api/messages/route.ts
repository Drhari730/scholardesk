import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [messages, unread] = await Promise.all([
    prisma.portalMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { person: { select: { id: true, name: true, email: true, role: true } } },
    }),
    prisma.portalMessage.count({ where: { isRead: false } }),
  ]);
  return NextResponse.json({ messages, unread });
}
