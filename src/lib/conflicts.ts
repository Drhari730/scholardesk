import { prisma } from "@/lib/prisma";

export interface ScheduleConflict {
  type: "event" | "exam" | "leave_overlap";
  message: string;
  severity: "warning" | "critical";
  eventId?: string;
  examId?: string;
  date: string;
}

export async function detectConflicts(
  startDate: Date,
  endDate: Date,
  excludeEventId?: string
): Promise<ScheduleConflict[]> {
  const conflicts: ScheduleConflict[] = [];
  const end = endDate ?? startDate;

  const [events, exams] = await Promise.all([
    prisma.academicEvent.findMany({
      where: excludeEventId ? { id: { not: excludeEventId } } : undefined,
    }),
    prisma.exam.findMany({
      where: {
        examDate: {
          gte: new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() - 7),
          lte: new Date(end.getFullYear(), end.getMonth(), end.getDate() + 7),
        },
      },
      include: { course: true },
    }),
  ]);

  function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
    return aStart <= bEnd && bStart <= aEnd;
  }

  for (const ev of events) {
    const evEnd = ev.endDate ?? ev.startDate;
    if (!rangesOverlap(startDate, end, ev.startDate, evEnd)) continue;

    if (ev.type === "LEAVE") {
      conflicts.push({
        type: "leave_overlap",
        message: `Overlaps with leave: "${ev.title}"`,
        severity: "critical",
        eventId: ev.id,
        date: ev.startDate.toISOString(),
      });
    } else if (excludeEventId !== ev.id) {
      conflicts.push({
        type: "event",
        message: `Overlaps with ${ev.type.replace(/_/g, " ").toLowerCase()}: "${ev.title}"`,
        severity: ev.type === "TRAVEL" ? "warning" : "warning",
        eventId: ev.id,
        date: ev.startDate.toISOString(),
      });
    }
  }

  for (const exam of exams) {
    if (startDate <= exam.examDate && exam.examDate <= end) {
      conflicts.push({
        type: "exam",
        message: `Exam scheduled: ${exam.title} (${exam.course.code}) on same period`,
        severity: "critical",
        examId: exam.id,
        date: exam.examDate.toISOString(),
      });
    }
  }

  return conflicts;
}

export async function getAllUpcomingConflicts(): Promise<ScheduleConflict[]> {
  const now = new Date();
  const horizon = new Date(now.getFullYear(), now.getMonth() + 3, 0);

  const events = await prisma.academicEvent.findMany({
    where: { startDate: { gte: now, lte: horizon } },
    orderBy: { startDate: "asc" },
  });

  const all: ScheduleConflict[] = [];
  const seen = new Set<string>();

  for (const ev of events) {
    const end = ev.endDate ?? ev.startDate;
    const found = await detectConflicts(ev.startDate, end, ev.id);
    for (const c of found) {
      const key = `${c.message}-${c.date}`;
      if (!seen.has(key)) {
        seen.add(key);
        all.push(c);
      }
    }
  }

  return all.slice(0, 10);
}
