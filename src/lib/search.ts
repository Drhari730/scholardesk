import { prisma } from "@/lib/prisma";

export interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

export async function globalSearch(query: string, limit = 20): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const contains = { contains: q, mode: "insensitive" as const };

  const [projects, publications, people, events, exams, tasks, courses] = await Promise.all([
    prisma.researchProject.findMany({
      where: { OR: [{ title: contains }, { description: contains }, { aims: contains }] },
      take: 5,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.publication.findMany({
      where: { OR: [{ title: contains }, { journal: contains }, { authors: contains }] },
      take: 5,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.person.findMany({
      where: { OR: [{ name: contains }, { email: contains }] },
      take: 5,
      orderBy: { name: "asc" },
    }),
    prisma.academicEvent.findMany({
      where: { OR: [{ title: contains }, { location: contains }, { venue: contains }] },
      take: 5,
      orderBy: { startDate: "asc" },
    }),
    prisma.exam.findMany({
      where: { title: contains },
      include: { course: true },
      take: 5,
      orderBy: { examDate: "asc" },
    }),
    prisma.task.findMany({
      where: { OR: [{ title: contains }, { description: contains }] },
      include: { project: true },
      take: 5,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.course.findMany({
      where: { OR: [{ name: contains }, { code: contains }] },
      take: 5,
      orderBy: { name: "asc" },
    }),
  ]);

  const results: SearchResult[] = [
    ...projects.map((p) => ({
      type: "Research",
      id: p.id,
      title: p.title,
      subtitle: p.researchPhase,
      href: "/research",
    })),
    ...publications.map((p) => ({
      type: "Publication",
      id: p.id,
      title: p.title,
      subtitle: p.journal ?? undefined,
      href: "/publications",
    })),
    ...people.map((p) => ({
      type: "Person",
      id: p.id,
      title: p.name,
      subtitle: p.email ?? p.role,
      href: "/people",
    })),
    ...events.map((e) => ({
      type: "Planning",
      id: e.id,
      title: e.title,
      subtitle: e.type.replace(/_/g, " "),
      href: "/planning",
    })),
    ...exams.map((e) => ({
      type: "Exam",
      id: e.id,
      title: e.title,
      subtitle: `${e.course.code} — ${e.course.name}`,
      href: "/exams",
    })),
    ...tasks.map((t) => ({
      type: "Task",
      id: t.id,
      title: t.title,
      subtitle: t.project?.title,
      href: "/research",
    })),
    ...courses.map((c) => ({
      type: "Course",
      id: c.id,
      title: `${c.code} — ${c.name}`,
      href: "/teaching",
    })),
  ];

  return results.slice(0, limit);
}
