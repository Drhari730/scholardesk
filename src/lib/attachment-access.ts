import { prisma } from "@/lib/prisma";

export async function canPersonAccessAttachment(
  personId: string,
  entityType: string,
  entityId: string
): Promise<boolean> {
  if (entityType === "project") {
    const member = await prisma.projectMember.findFirst({
      where: { personId, projectId: entityId },
    });
    return !!member;
  }

  if (entityType === "publication") {
    const member = await prisma.publicationMember.findFirst({
      where: { personId, publicationId: entityId },
    });
    return !!member;
  }

  if (entityType === "thesis") {
    const thesis = await prisma.thesis.findFirst({
      where: { id: entityId, personId },
    });
    return !!thesis;
  }

  return false;
}
