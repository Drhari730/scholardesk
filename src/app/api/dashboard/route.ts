import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [
    activeProjects,
    pendingTasks,
    totalPublications,
    recentPublications,
    upcomingExams,
    overdueReminders,
    people,
    courses,
    upcomingReminders,
    pubStatusCounts,
    taskStatusCounts,
    projectStatusCounts,
    examStatusCounts,
    projects,
  ] = await Promise.all([
    prisma.researchProject.count({ where: { status: "ACTIVE" } }),
    prisma.task.count({ where: { status: { not: "COMPLETED" } } }),
    prisma.publication.count(),
    prisma.publication.findMany({ orderBy: { updatedAt: "desc" }, take: 5 }),
    prisma.exam.findMany({
      where: { examDate: { gte: new Date() } },
      orderBy: { examDate: "asc" },
      take: 5,
      include: { course: true },
    }),
    prisma.reminder.count({
      where: { isCompleted: false, dueDate: { lt: new Date() } },
    }),
    prisma.person.count(),
    prisma.course.count(),
    prisma.reminder.findMany({
      where: { isCompleted: false },
      orderBy: { dueDate: "asc" },
      take: 8,
      include: { person: true },
    }),
    prisma.publication.groupBy({ by: ["status"], _count: true }),
    prisma.task.groupBy({ by: ["status"], _count: true }),
    prisma.researchProject.groupBy({ by: ["status"], _count: true }),
    prisma.exam.groupBy({ by: ["status"], _count: true }),
    prisma.researchProject.findMany({
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: { members: { include: { person: true } } },
    }),
  ]);

  return NextResponse.json({
    stats: {
      activeProjects,
      pendingTasks,
      totalPublications,
      upcomingExams: upcomingExams.length,
      overdueReminders,
      people,
      courses,
    },
    recentPublications,
    upcomingExams,
    upcomingReminders,
    recentProjects: projects,
    pubStatusCounts,
    taskStatusCounts,
    projectStatusCounts,
    examStatusCounts,
  });
}
