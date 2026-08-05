import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const projects = await prisma.researchProject.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      members: { include: { person: true } },
      tasks: true,
      _count: { select: { tasks: true } },
    },
  });
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const project = await prisma.researchProject.create({
    data: {
      title: body.title,
      description: body.description,
      status: body.status || "ACTIVE",
      priority: body.priority || "MEDIUM",
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      tags: body.tags,
      notes: body.notes,
    },
  });
  return NextResponse.json(project, { status: 201 });
}
