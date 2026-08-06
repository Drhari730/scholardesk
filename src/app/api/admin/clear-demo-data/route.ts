import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function authorize(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && secret !== cronSecret) return false;
  return true;
}

export async function POST(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.$transaction([
    prisma.reminder.deleteMany(),
    prisma.publicationMember.deleteMany(),
    prisma.projectMember.deleteMany(),
    prisma.task.deleteMany(),
    prisma.questionPaper.deleteMany(),
    prisma.exam.deleteMany(),
    prisma.classSession.deleteMany(),
    prisma.publication.deleteMany(),
    prisma.researchProject.deleteMany(),
    prisma.course.deleteMany(),
    prisma.person.deleteMany(),
  ]);

  await prisma.appSettings.upsert({
    where: { id: "default" },
    update: {
      userName: "Dr. Hari Prakash",
      userTitle: "Assistant Professor, Public Health",
      institution: "MSRUAS, Bengaluru",
      email: "hariprakash607@gmail.com",
    },
    create: {
      id: "default",
      userName: "Dr. Hari Prakash",
      userTitle: "Assistant Professor, Public Health",
      institution: "MSRUAS, Bengaluru",
      email: "hariprakash607@gmail.com",
    },
  });

  return NextResponse.json({ success: true, message: "All demo data cleared" });
}
