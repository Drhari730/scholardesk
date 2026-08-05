import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const exam = await prisma.exam.update({
    where: { id },
    data: {
      ...body,
      examDate: body.examDate ? new Date(body.examDate) : undefined,
    },
  });
  return NextResponse.json(exam);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.exam.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
