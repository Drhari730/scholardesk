import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
  const rows: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].match(/("([^"]|"")*"|[^,]+)/g)?.map((v) =>
      v.replace(/^"|"$/g, "").replace(/""/g, '"').trim()
    ) ?? lines[i].split(",").map((v) => v.trim());

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

function toCsv(marks: Array<{ rollNumber: string; studentName: string; marks: number | null; grade: string | null; remarks: string | null }>) {
  const header = "roll_number,student_name,marks,grade,remarks";
  const lines = marks.map((m) => {
    const escape = (s: string) => (s.includes(",") ? `"${s.replace(/"/g, '""')}"` : s);
    return [
      escape(m.rollNumber),
      escape(m.studentName),
      m.marks ?? "",
      m.grade ?? "",
      m.remarks ?? "",
    ].join(",");
  });
  return [header, ...lines].join("\n");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const exam = await prisma.exam.findUnique({
    where: { id },
    include: { course: true, marks: { orderBy: { rollNumber: "asc" } } },
  });
  if (!exam) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const format = _req.nextUrl.searchParams.get("format");
  if (format === "csv") {
    const csv = toCsv(exam.marks);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${exam.course.code}-${exam.title.replace(/\s+/g, "-")}-marks.csv"`,
      },
    });
  }

  return NextResponse.json({ exam, marks: exam.marks });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const exam = await prisma.exam.findUnique({ where: { id } });
  if (!exam) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const contentType = req.headers.get("content-type") ?? "";
  let rows: Array<Record<string, string>> = [];

  if (contentType.includes("text/csv") || contentType.includes("text/plain")) {
    const text = await req.text();
    rows = parseCsv(text);
  } else {
    const body = await req.json();
    rows = body.marks ?? [];
  }

  if (!rows.length) {
    return NextResponse.json({ error: "No marks data found" }, { status: 400 });
  }

  let imported = 0;
  for (const row of rows) {
    const rollNumber = row.roll_number || row.rollnumber || row.roll || row["roll number"];
    const studentName = row.student_name || row.studentname || row.name || row["student name"];
    if (!rollNumber || !studentName) continue;

    const marksVal = row.marks ? parseFloat(row.marks) : null;
    await prisma.examMark.upsert({
      where: { examId_rollNumber: { examId: id, rollNumber } },
      update: {
        studentName,
        marks: marksVal,
        grade: row.grade || null,
        remarks: row.remarks || row.remark || null,
      },
      create: {
        examId: id,
        rollNumber,
        studentName,
        marks: marksVal,
        grade: row.grade || null,
        remarks: row.remarks || row.remark || null,
      },
    });
    imported++;
  }

  await prisma.exam.update({
    where: { id },
    data: { marksEntered: imported > 0 },
  });

  const marks = await prisma.examMark.findMany({
    where: { examId: id },
    orderBy: { rollNumber: "asc" },
  });

  return NextResponse.json({ imported, total: marks.length, marks });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.examMark.deleteMany({ where: { examId: id } });
  await prisma.exam.update({ where: { id }, data: { marksEntered: false } });
  return NextResponse.json({ success: true });
}
