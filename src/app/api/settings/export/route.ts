import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [
    settings,
    people,
    projects,
    publications,
    courses,
    exams,
    reminders,
    academicEvents,
    tasks,
  ] = await Promise.all([
    prisma.appSettings.findUnique({ where: { id: "default" } }),
    prisma.person.findMany({ include: { projectMembers: true } }),
    prisma.researchProject.findMany({ include: { members: true, tasks: true } }),
    prisma.publication.findMany({ include: { members: true } }),
    prisma.course.findMany({ include: { sessions: true, exams: true } }),
    prisma.exam.findMany(),
    prisma.reminder.findMany(),
    prisma.academicEvent.findMany(),
    prisma.task.findMany(),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    version: "1.0",
    settings,
    people,
    projects,
    publications,
    courses,
    exams,
    reminders,
    academicEvents,
    tasks,
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="scholardesk-backup-${new Date().toISOString().split("T")[0]}.json"`,
    },
  });
}
