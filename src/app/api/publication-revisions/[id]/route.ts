import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const revision = await prisma.publicationRevision.update({
    where: { id },
    data: {
      receivedDate: body.receivedDate ? new Date(body.receivedDate) : undefined,
      dueDate: body.dueDate ? new Date(body.dueDate) : body.dueDate === null ? null : undefined,
      submittedDate: body.submittedDate ? new Date(body.submittedDate) : body.submittedDate === null ? null : undefined,
      comments: body.comments,
      status: body.status,
      notes: body.notes,
    },
  });

  if (body.status === "SUBMITTED") {
    const submittedDate = revision.submittedDate ?? new Date();
    if (!revision.submittedDate) {
      await prisma.publicationRevision.update({
        where: { id },
        data: { submittedDate },
      });
    }
    await prisma.publication.update({
      where: { id: revision.publicationId },
      data: { status: "RESUBMITTED" },
    });
  }

  return NextResponse.json(revision);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const revision = await prisma.publicationRevision.delete({ where: { id } });
  const remaining = await prisma.publicationRevision.findMany({
    where: { publicationId: revision.publicationId },
    orderBy: { round: "desc" },
  });
  await prisma.publication.update({
    where: { id: revision.publicationId },
    data: { currentRevision: remaining[0]?.round ?? 0 },
  });
  return NextResponse.json({ success: true });
}
