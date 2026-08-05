import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const papers = await prisma.questionPaper.findMany({
    orderBy: { dueDate: "asc" },
    include: { course: true, exam: true },
  });
  return NextResponse.json(papers);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const paper = await prisma.questionPaper.create({
    data: {
      courseId: body.courseId,
      examId: body.examId || null,
      title: body.title,
      status: body.status || "NOT_STARTED",
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      totalMarks: body.totalMarks ? parseInt(body.totalMarks) : null,
      sections: body.sections,
      notes: body.notes,
    },
    include: { course: true, exam: true },
  });
  return NextResponse.json(paper, { status: 201 });
}
