import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

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
    upcomingPlanning,
    monthEvents,
  ] = await Promise.all([
    prisma.researchProject.count({ where: { status: "ACTIVE" } }),
    prisma.task.count({ where: { status: { not: "COMPLETED" } } }),
    prisma.publication.count(),
    prisma.publication.findMany({ orderBy: { updatedAt: "desc" }, take: 5 }),
    prisma.exam.findMany({
      where: { examDate: { gte: now } },
      orderBy: { examDate: "asc" },
      take: 5,
      include: { course: true },
    }),
    prisma.reminder.count({
      where: { isCompleted: false, dueDate: { lt: now } },
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
    prisma.academicEvent.findMany({
      where: { startDate: { gte: now } },
      orderBy: { startDate: "asc" },
      take: 6,
    }),
    prisma.academicEvent.count({
      where: {
        OR: [
          { startDate: { gte: monthStart, lte: monthEnd } },
          { endDate: { gte: monthStart, lte: monthEnd } },
        ],
      },
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
      monthEvents,
    },
    recentPublications,
    upcomingExams,
    upcomingReminders,
    recentProjects: projects,
    upcomingPlanning,
    pubStatusCounts,
    taskStatusCounts,
    projectStatusCounts,
    examStatusCounts,
  });
}
