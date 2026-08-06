import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const publicationId = req.nextUrl.searchParams.get("publicationId");
  if (!publicationId) {
    return NextResponse.json({ error: "publicationId required" }, { status: 400 });
  }

  const revisions = await prisma.publicationRevision.findMany({
    where: { publicationId },
    orderBy: { round: "asc" },
  });
  return NextResponse.json(revisions);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const publicationId = body.publicationId as string;
  if (!publicationId) {
    return NextResponse.json({ error: "publicationId required" }, { status: 400 });
  }

  const latest = await prisma.publicationRevision.findFirst({
    where: { publicationId },
    orderBy: { round: "desc" },
  });
  const round = body.round ?? (latest ? latest.round + 1 : 1);

  const revision = await prisma.publicationRevision.create({
    data: {
      publicationId,
      round,
      receivedDate: body.receivedDate ? new Date(body.receivedDate) : new Date(),
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      submittedDate: body.submittedDate ? new Date(body.submittedDate) : null,
      comments: body.comments,
      status: body.status || "PENDING",
      notes: body.notes,
    },
  });

  await prisma.publication.update({
    where: { id: publicationId },
    data: {
      currentRevision: round,
      status: body.setPublicationStatus || "REVISION_REQUESTED",
    },
  });

  return NextResponse.json(revision, { status: 201 });
}
