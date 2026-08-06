import { prisma } from "@/lib/prisma";

type ImportPayload = {
  version?: string;
  people?: Array<Record<string, unknown>>;
  projects?: Array<Record<string, unknown>>;
  publications?: Array<Record<string, unknown>>;
  academicEvents?: Array<Record<string, unknown>>;
  courses?: Array<Record<string, unknown>>;
  exams?: Array<Record<string, unknown>>;
  tasks?: Array<Record<string, unknown>>;
  reminders?: Array<Record<string, unknown>>;
};

export async function importBackupData(data: ImportPayload, mode: "merge" | "replace") {
  const stats = {
    people: 0,
    projects: 0,
    publications: 0,
    events: 0,
    courses: 0,
    exams: 0,
    tasks: 0,
    reminders: 0,
  };

  if (mode === "replace") {
    await prisma.$transaction([
      prisma.examMark.deleteMany(),
      prisma.reminder.deleteMany(),
      prisma.task.deleteMany(),
      prisma.publicationRevision.deleteMany(),
      prisma.publicationMember.deleteMany(),
      prisma.publication.deleteMany(),
      prisma.projectMember.deleteMany(),
      prisma.researchProject.deleteMany(),
      prisma.academicEvent.deleteMany(),
      prisma.questionPaper.deleteMany(),
      prisma.exam.deleteMany(),
      prisma.classSession.deleteMany(),
      prisma.course.deleteMany(),
      prisma.person.deleteMany(),
      prisma.fileAttachment.deleteMany(),
    ]);
  }

  const personIdMap = new Map<string, string>();
  const projectIdMap = new Map<string, string>();
  const publicationIdMap = new Map<string, string>();
  const courseIdMap = new Map<string, string>();
  const examIdMap = new Map<string, string>();

  for (const p of data.people ?? []) {
    const oldId = p.id as string;
    const created = await prisma.person.create({
      data: {
        name: (p.name as string) ?? "Unknown",
        email: (p.email as string) ?? null,
        phone: (p.phone as string) ?? null,
        role: (p.role as string) ?? "STUDENT",
        department: (p.department as string) ?? null,
        notes: (p.notes as string) ?? null,
        portalEnabled: false,
      },
    });
    if (oldId) personIdMap.set(oldId, created.id);
    stats.people++;
  }

  for (const proj of data.projects ?? []) {
    const oldId = proj.id as string;
    const created = await prisma.researchProject.create({
      data: {
        title: (proj.title as string) ?? "Untitled",
        description: (proj.description as string) ?? null,
        status: (proj.status as string) ?? "ACTIVE",
        priority: (proj.priority as string) ?? "MEDIUM",
        aims: (proj.aims as string) ?? null,
        objectives: (proj.objectives as string) ?? null,
        methodology: (proj.methodology as string) ?? null,
        studyState: (proj.studyState as string) ?? null,
        researchPhase: (proj.researchPhase as string) ?? "PROTOCOL_DEVELOPMENT",
        timeline: (proj.timeline as string) ?? null,
        startDate: proj.startDate ? new Date(proj.startDate as string) : null,
        endDate: proj.endDate ? new Date(proj.endDate as string) : null,
        tags: (proj.tags as string) ?? null,
        notes: (proj.notes as string) ?? null,
      },
    });
    if (oldId) projectIdMap.set(oldId, created.id);
    stats.projects++;
  }

  for (const pub of data.publications ?? []) {
    const oldId = pub.id as string;
    const created = await prisma.publication.create({
      data: {
        title: (pub.title as string) ?? "Untitled",
        journal: (pub.journal as string) ?? null,
        authors: (pub.authors as string) ?? null,
        status: (pub.status as string) ?? "DRAFT",
        submittedDate: pub.submittedDate ? new Date(pub.submittedDate as string) : null,
        decisionDate: pub.decisionDate ? new Date(pub.decisionDate as string) : null,
        reviewerComments: (pub.reviewerComments as string) ?? null,
        doi: (pub.doi as string) ?? null,
        manuscriptId: (pub.manuscriptId as string) ?? null,
        currentRevision: (pub.currentRevision as number) ?? 0,
        notes: (pub.notes as string) ?? null,
      },
    });
    if (oldId) publicationIdMap.set(oldId, created.id);
    stats.publications++;
  }

  for (const ev of data.academicEvents ?? []) {
    await prisma.academicEvent.create({
      data: {
        title: (ev.title as string) ?? "Event",
        type: (ev.type as string) ?? "CONFERENCE",
        status: (ev.status as string) ?? "PLANNED",
        startDate: new Date(ev.startDate as string),
        endDate: ev.endDate ? new Date(ev.endDate as string) : null,
        location: (ev.location as string) ?? null,
        venue: (ev.venue as string) ?? null,
        organizer: (ev.organizer as string) ?? null,
        hostInstitution: (ev.hostInstitution as string) ?? null,
        description: (ev.description as string) ?? null,
        prepNotes: (ev.prepNotes as string) ?? null,
        checklist: (ev.checklist as string) ?? null,
        remindEmail: (ev.remindEmail as boolean) ?? true,
      },
    });
    stats.events++;
  }

  for (const c of data.courses ?? []) {
    const oldId = c.id as string;
    const created = await prisma.course.create({
      data: {
        code: (c.code as string) ?? "COURSE",
        name: (c.name as string) ?? "Course",
        semester: (c.semester as string) ?? null,
        year: (c.year as string) ?? null,
        credits: (c.credits as number) ?? null,
        description: (c.description as string) ?? null,
      },
    });
    if (oldId) courseIdMap.set(oldId, created.id);
    stats.courses++;
  }

  for (const exam of data.exams ?? []) {
    const oldId = exam.id as string;
    const courseId = courseIdMap.get(exam.courseId as string);
    if (!courseId) continue;
    const created = await prisma.exam.create({
      data: {
        courseId,
        title: (exam.title as string) ?? "Exam",
        type: (exam.type as string) ?? "MIDTERM",
        examDate: new Date(exam.examDate as string),
        duration: (exam.duration as number) ?? null,
        totalMarks: (exam.totalMarks as number) ?? null,
        venue: (exam.venue as string) ?? null,
        status: (exam.status as string) ?? "PLANNED",
        marksEntered: (exam.marksEntered as boolean) ?? false,
      },
    });
    if (oldId) examIdMap.set(oldId, created.id);

    const marks = (exam as { marks?: Array<Record<string, unknown>> }).marks ?? [];
    for (const m of marks) {
      await prisma.examMark.create({
        data: {
          examId: created.id,
          rollNumber: (m.rollNumber as string) ?? "N/A",
          studentName: (m.studentName as string) ?? "Student",
          marks: (m.marks as number) ?? null,
          grade: (m.grade as string) ?? null,
        },
      });
    }
    stats.exams++;
  }

  for (const t of data.tasks ?? []) {
    const projectId = t.projectId ? projectIdMap.get(t.projectId as string) : null;
    const assigneeId = t.assigneeId ? personIdMap.get(t.assigneeId as string) : null;
    await prisma.task.create({
      data: {
        title: (t.title as string) ?? "Task",
        description: (t.description as string) ?? null,
        status: (t.status as string) ?? "TODO",
        priority: (t.priority as string) ?? "MEDIUM",
        dueDate: t.dueDate ? new Date(t.dueDate as string) : null,
        projectId,
        assigneeId,
      },
    });
    stats.tasks++;
  }

  for (const r of data.reminders ?? []) {
    await prisma.reminder.create({
      data: {
        title: (r.title as string) ?? "Reminder",
        message: (r.message as string) ?? null,
        dueDate: new Date(r.dueDate as string),
        isCompleted: (r.isCompleted as boolean) ?? false,
        personId: r.personId ? personIdMap.get(r.personId as string) : null,
      },
    });
    stats.reminders++;
  }

  return stats;
}
