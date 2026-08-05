import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const exams = await prisma.exam.findMany({
    orderBy: { examDate: "asc" },
    include: { course: true, questionPapers: true },
  });
  return NextResponse.json(exams);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const exam = await prisma.exam.create({
    data: {
      courseId: body.courseId,
      title: body.title,
      type: body.type || "MIDTERM",
      examDate: new Date(body.examDate),
      duration: body.duration ? parseInt(body.duration) : null,
      totalMarks: body.totalMarks ? parseInt(body.totalMarks) : null,
      venue: body.venue,
      syllabus: body.syllabus,
      status: body.status || "PLANNED",
      notes: body.notes,
    },
    include: { course: true },
  });

  if (body.reminderDaysBefore) {
    const reminderDate = new Date(body.examDate);
    reminderDate.setDate(reminderDate.getDate() - parseInt(body.reminderDaysBefore));
    await prisma.reminder.create({
      data: {
        title: `Exam approaching: ${body.title}`,
        message: `Exam scheduled for ${new Date(body.examDate).toLocaleDateString()}`,
        dueDate: reminderDate,
        examId: exam.id,
      },
    });
  }

  return NextResponse.json(exam, { status: 201 });
}
