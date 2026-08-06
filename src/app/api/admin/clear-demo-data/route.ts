import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";

async function authorize(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (session) return true;

  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  return !!(process.env.CRON_SECRET && secret === process.env.CRON_SECRET);
}

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) {
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
    prisma.academicEvent.deleteMany(),
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
