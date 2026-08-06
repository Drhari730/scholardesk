import { NextRequest, NextResponse } from "next/server";
import { getPortalSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getPortalSessionFromRequest(req);
  if (!session || session.role !== "portal") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const person = await prisma.person.findUnique({
    where: { id: session.personId },
    include: {
      tasks: {
        where: { status: { notIn: ["COMPLETED"] } },
        include: { project: true },
        orderBy: { dueDate: "asc" },
      },
      publicationMembers: {
        include: { publication: true },
      },
      projectMembers: {
        include: { project: true },
      },
    },
  });

  if (!person) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    person: { id: person.id, name: person.name, email: person.email, role: person.role },
    tasks: person.tasks,
    publications: person.publicationMembers.map((m) => ({
      role: m.role,
      ...m.publication,
    })),
    projects: person.projectMembers.map((m) => ({
      role: m.role,
      ...m.project,
    })),
  });
}
