import * as XLSX from "xlsx";
import type { gatherExportData } from "./export-data";

type ExportData = Awaited<ReturnType<typeof gatherExportData>>;

function sheetFromRows(rows: Record<string, unknown>[]) {
  if (!rows.length) return XLSX.utils.aoa_to_sheet([["(empty)"]]);
  return XLSX.utils.json_to_sheet(rows);
}

export function exportToExcelBuffer(data: ExportData): Buffer {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    sheetFromRows(
      data.people.map((p) => ({
        name: p.name,
        email: p.email,
        phone: p.phone,
        role: p.role,
        department: p.department,
      }))
    ),
    "People"
  );

  XLSX.utils.book_append_sheet(
    wb,
    sheetFromRows(
      data.projects.map((p) => ({
        title: p.title,
        status: p.status,
        phase: p.researchPhase,
        state: p.studyState,
        aims: p.aims,
        startDate: p.startDate,
        endDate: p.endDate,
      }))
    ),
    "Research"
  );

  XLSX.utils.book_append_sheet(
    wb,
    sheetFromRows(
      data.publications.map((p) => ({
        title: p.title,
        journal: p.journal,
        status: p.status,
        revision: p.currentRevision,
        submittedDate: p.submittedDate,
        doi: p.doi,
      }))
    ),
    "Publications"
  );

  XLSX.utils.book_append_sheet(
    wb,
    sheetFromRows(
      data.academicEvents.map((e) => ({
        title: e.title,
        type: e.type,
        status: e.status,
        startDate: e.startDate,
        endDate: e.endDate,
        location: e.location,
        venue: e.venue,
      }))
    ),
    "Planning"
  );

  XLSX.utils.book_append_sheet(
    wb,
    sheetFromRows(
      data.exams.flatMap((exam) =>
        exam.marks.length
          ? exam.marks.map((m) => ({
              exam: exam.title,
              rollNumber: m.rollNumber,
              studentName: m.studentName,
              marks: m.marks,
              grade: m.grade,
            }))
          : [{ exam: exam.title, rollNumber: "", studentName: "", marks: null, grade: null }]
      )
    ),
    "Exam Marks"
  );

  XLSX.utils.book_append_sheet(
    wb,
    sheetFromRows(
      data.tasks.map((t) => ({
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        projectId: t.projectId,
      }))
    ),
    "Tasks"
  );

  XLSX.utils.book_append_sheet(
    wb,
    sheetFromRows(
      data.reminders.map((r) => ({
        title: r.title,
        dueDate: r.dueDate,
        isCompleted: r.isCompleted,
        message: r.message,
      }))
    ),
    "Reminders"
  );

  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}
