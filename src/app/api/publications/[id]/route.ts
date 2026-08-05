import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const publication = await prisma.publication.update({
    where: { id },
    data: {
      ...body,
      submittedDate: body.submittedDate ? new Date(body.submittedDate) : undefined,
      decisionDate: body.decisionDate ? new Date(body.decisionDate) : undefined,
    },
  });
  return NextResponse.json(publication);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.publication.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
