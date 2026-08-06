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

  const projectIds = person.projectMembers.map((m) => m.projectId);
  const publicationIds = person.publicationMembers.map((m) => m.publicationId);

  const attachments = await prisma.fileAttachment.findMany({
    where: {
      OR: [
        { entityType: "project", entityId: { in: projectIds } },
        { entityType: "publication", entityId: { in: publicationIds } },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  const attachmentsByEntity = new Map<string, Array<{ id: string; filename: string; size: number; mimeType: string }>>();
  for (const file of attachments) {
    const key = `${file.entityType}:${file.entityId}`;
    const list = attachmentsByEntity.get(key) ?? [];
    list.push({ id: file.id, filename: file.filename, size: file.size, mimeType: file.mimeType });
    attachmentsByEntity.set(key, list);
  }

  return NextResponse.json({
    person: { id: person.id, name: person.name, email: person.email, role: person.role },
    tasks: person.tasks,
    publications: person.publicationMembers.map((m) => ({
      role: m.role,
      ...m.publication,
      attachments: attachmentsByEntity.get(`publication:${m.publication.id}`) ?? [],
    })),
    projects: person.projectMembers.map((m) => ({
      role: m.role,
      ...m.project,
      attachments: attachmentsByEntity.get(`project:${m.project.id}`) ?? [],
    })),
  });
}
