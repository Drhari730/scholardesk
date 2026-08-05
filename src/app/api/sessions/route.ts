import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const sessions = await prisma.classSession.findMany({
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    include: { course: true },
  });
  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const session = await prisma.classSession.create({
    data: {
      courseId: body.courseId,
      dayOfWeek: parseInt(body.dayOfWeek),
      startTime: body.startTime,
      endTime: body.endTime,
      room: body.room,
      topic: body.topic,
      notes: body.notes,
    },
    include: { course: true },
  });
  return NextResponse.json(session, { status: 201 });
}
