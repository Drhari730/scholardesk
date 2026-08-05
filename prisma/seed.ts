import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const dbPath = path.join(__dirname, "..", "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.appSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      userName: "Dr. Hari Prakash",
      userTitle: "Assistant Professor, Public Health",
      institution: "University",
      email: "hari.prakash@university.edu",
    },
  });

  const students = await Promise.all([
    prisma.person.create({
      data: {
        name: "Ananya Sharma",
        email: "ananya.sharma@student.edu",
        role: "STUDENT",
        department: "Public Health",
      },
    }),
    prisma.person.create({
      data: {
        name: "Rahul Menon",
        email: "rahul.menon@student.edu",
        role: "STUDENT",
        department: "Epidemiology",
      },
    }),
    prisma.person.create({
      data: {
        name: "Dr. Priya Nair",
        email: "priya.nair@university.edu",
        role: "COLLEAGUE",
        department: "Biostatistics",
      },
    }),
  ]);

  const project = await prisma.researchProject.create({
    data: {
      title: "Community Health Screening Program",
      description:
        "A longitudinal study assessing preventive health behaviors in urban communities.",
      status: "ACTIVE",
      priority: "HIGH",
      startDate: new Date("2026-01-15"),
      tags: "public health, screening, community",
      members: {
        create: [
          { personId: students[0].id, role: "RESEARCH_ASSISTANT" },
          { personId: students[1].id, role: "RESEARCH_ASSISTANT" },
          { personId: students[2].id, role: "CO_INVESTIGATOR" },
        ],
      },
      tasks: {
        create: [
          {
            title: "Complete IRB documentation",
            status: "COMPLETED",
            priority: "HIGH",
            assigneeId: students[0].id,
            dueDate: new Date("2026-02-01"),
          },
          {
            title: "Design survey questionnaire",
            status: "IN_PROGRESS",
            priority: "HIGH",
            assigneeId: students[1].id,
            dueDate: new Date("2026-03-15"),
          },
          {
            title: "Pilot test in 2 communities",
            status: "TODO",
            priority: "MEDIUM",
            assigneeId: students[0].id,
            dueDate: new Date("2026-04-01"),
          },
        ],
      },
    },
  });

  await prisma.researchProject.create({
    data: {
      title: "Maternal Nutrition Intervention Study",
      description: "Evaluating nutritional supplements impact on maternal outcomes.",
      status: "PLANNING",
      priority: "MEDIUM",
    },
  });

  await prisma.publication.createMany({
    data: [
      {
        title: "Urban Health Disparities in South India: A Cross-Sectional Analysis",
        journal: "Indian Journal of Public Health",
        authors: "Hari Prakash, P. Nair, A. Sharma",
        status: "UNDER_REVIEW",
        submittedDate: new Date("2025-11-20"),
        manuscriptId: "IJPH-2025-0842",
        reviewerComments: "Minor revisions requested — clarify methodology section.",
      },
      {
        title: "Effectiveness of Community Health Workers in Rural Screening",
        journal: "The Lancet Regional Health - South Asia",
        authors: "Hari Prakash, R. Menon",
        status: "SUBMITTED",
        submittedDate: new Date("2026-01-10"),
        manuscriptId: "LRHSA-2026-0156",
      },
      {
        title: "COVID-19 Vaccination Uptake Among Healthcare Workers",
        journal: "Vaccine",
        authors: "Hari Prakash et al.",
        status: "PUBLISHED",
        submittedDate: new Date("2024-06-01"),
        decisionDate: new Date("2024-10-15"),
        doi: "10.1016/j.vaccine.2024.10.015",
      },
    ],
  });

  const course = await prisma.course.create({
    data: {
      code: "PH501",
      name: "Introduction to Epidemiology",
      semester: "Spring 2026",
      year: "2026",
      credits: 4,
      description: "Foundational epidemiological methods and study designs.",
      sessions: {
        create: [
          { dayOfWeek: 1, startTime: "09:00", endTime: "10:30", room: "Room 204", topic: "Study Designs" },
          { dayOfWeek: 3, startTime: "09:00", endTime: "10:30", room: "Room 204", topic: "Measures of Association" },
          { dayOfWeek: 5, startTime: "14:00", endTime: "15:30", room: "Lab 3", topic: "Practical Session" },
        ],
      },
    },
  });

  await prisma.course.create({
    data: {
      code: "PH602",
      name: "Biostatistics for Public Health",
      semester: "Spring 2026",
      year: "2026",
      credits: 3,
    },
  });

  const exam = await prisma.exam.create({
    data: {
      courseId: course.id,
      title: "Midterm Examination",
      type: "MIDTERM",
      examDate: new Date("2026-04-15T09:00:00"),
      duration: 120,
      totalMarks: 50,
      venue: "Hall A",
      syllabus: "Units 1-4: Study designs, bias, confounding",
      status: "PLANNED",
    },
  });

  await prisma.questionPaper.create({
    data: {
      courseId: course.id,
      examId: exam.id,
      title: "PH501 Midterm Question Paper",
      status: "IN_PROGRESS",
      dueDate: new Date("2026-04-01"),
      totalMarks: 50,
      sections: "Section A: 10 MCQs (20 marks), Section B: 5 Short answers (30 marks)",
    },
  });

  await prisma.reminder.createMany({
    data: [
      {
        title: "Follow up with Ananya on survey design",
        message: "Check progress on questionnaire draft",
        dueDate: new Date("2026-03-10T10:00:00"),
        personId: students[0].id,
      },
      {
        title: "Review IJPH reviewer comments",
        message: "Address minor revisions for urban health paper",
        dueDate: new Date("2026-03-20T17:00:00"),
      },
      {
        title: "Finalize PH501 midterm question paper",
        dueDate: new Date("2026-04-01T09:00:00"),
        examId: exam.id,
      },
    ],
  });

  console.log("Seed completed successfully!");
  console.log(`Created project: ${project.title}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
