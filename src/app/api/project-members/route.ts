import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const member = await prisma.projectMember.create({
    data: {
      projectId: body.projectId,
      personId: body.personId,
      role: body.role || "MEMBER",
    },
    include: { person: true },
  });
  return NextResponse.json(member, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.projectMember.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
