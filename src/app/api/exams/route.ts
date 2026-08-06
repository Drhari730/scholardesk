import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pushCalendarEvent } from "@/lib/google-calendar";

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

  const durationMs = (exam.duration ?? 120) * 60 * 1000;
  const googleId = await pushCalendarEvent({
    title: `[Exam] ${exam.course.code} — ${exam.title}`,
    description: exam.venue ? `Venue: ${exam.venue}` : undefined,
    location: exam.venue ?? undefined,
    start: exam.examDate,
    end: new Date(exam.examDate.getTime() + durationMs),
  }).catch(() => null);
  if (googleId) {
    await prisma.exam.update({ where: { id: exam.id }, data: { googleEventId: googleId } });
  }

  return NextResponse.json(exam, { status: 201 });
}
