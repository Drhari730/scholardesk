import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const courses = await prisma.course.findMany({
    orderBy: { name: "asc" },
    include: {
      sessions: true,
      exams: true,
      _count: { select: { questionPapers: true } },
    },
  });
  return NextResponse.json(courses);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const course = await prisma.course.create({
    data: {
      code: body.code,
      name: body.name,
      semester: body.semester,
      year: body.year,
      credits: body.credits ? parseInt(body.credits) : null,
      description: body.description,
    },
  });
  return NextResponse.json(course, { status: 201 });
}
