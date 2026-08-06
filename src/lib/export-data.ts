import { prisma } from "@/lib/prisma";

export async function gatherExportData() {
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
    prisma.publication.findMany({ include: { members: true, revisions: true } }),
    prisma.course.findMany({ include: { sessions: true, exams: true } }),
    prisma.exam.findMany({ include: { marks: true } }),
    prisma.reminder.findMany(),
    prisma.academicEvent.findMany(),
    prisma.task.findMany(),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    version: "1.1",
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
}

export function exportToJson(data: Awaited<ReturnType<typeof gatherExportData>>) {
  return JSON.stringify(data, null, 2);
}
