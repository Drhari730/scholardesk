import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_THESIS_MILESTONES } from "@/lib/constants";

function rid() {
  return Math.random().toString(36).slice(2, 10);
}

function addMonths(d: Date, m: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + m);
  return x;
}

function seedMilestones(degree: string, start: Date, end: Date) {
  const titles = DEFAULT_THESIS_MILESTONES[degree] ?? DEFAULT_THESIS_MILESTONES.MASTERS;
  const startMs = start.getTime();
  const seg = (end.getTime() - startMs) / titles.length;
  return titles.map((title, i) => ({
    id: rid(),
    title,
    start: new Date(startMs + seg * i).toISOString().slice(0, 10),
    end: new Date(startMs + seg * (i + 1)).toISOString().slice(0, 10),
    status: "PLANNED",
  }));
}

export async function GET() {
  const theses = await prisma.thesis.findMany({
    orderBy: [{ degree: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(theses);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (!body.title || !body.studentName) {
    return NextResponse.json({ error: "Title and student name are required." }, { status: 400 });
  }
  const degree = body.degree === "PHD" ? "PHD" : "MASTERS";
  const start = body.startDate ? new Date(body.startDate) : new Date();
  const end = body.expectedEndDate
    ? new Date(body.expectedEndDate)
    : addMonths(start, degree === "PHD" ? 48 : 24);

  const milestones =
    body.milestones ?? JSON.stringify(seedMilestones(degree, start, end));

  const thesis = await prisma.thesis.create({
    data: {
      title: String(body.title).trim(),
      studentName: String(body.studentName).trim(),
      degree,
      status: body.status || "ONGOING",
      supervisor: body.supervisor || null,
      startDate: start,
      expectedEndDate: end,
      milestones,
      notes: body.notes || null,
    },
  });
  return NextResponse.json(thesis, { status: 201 });
}
