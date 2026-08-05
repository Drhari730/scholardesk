import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const publications = await prisma.publication.findMany({
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(publications);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const publication = await prisma.publication.create({
    data: {
      title: body.title,
      journal: body.journal,
      authors: body.authors,
      status: body.status || "DRAFT",
      submittedDate: body.submittedDate ? new Date(body.submittedDate) : null,
      decisionDate: body.decisionDate ? new Date(body.decisionDate) : null,
      reviewerComments: body.reviewerComments,
      doi: body.doi,
      manuscriptId: body.manuscriptId,
      notes: body.notes,
    },
  });
  return NextResponse.json(publication, { status: 201 });
}
