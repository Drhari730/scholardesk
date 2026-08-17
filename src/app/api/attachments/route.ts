import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwner, getPortalSessionFromRequest } from "@/lib/auth";
import { canPersonAccessAttachment } from "@/lib/attachment-access";
import { saveUpload } from "@/lib/uploads";
import { sendEmail, attachmentSharedEmail, getEmailBranding } from "@/lib/email";
import { getEmailPrefs } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const entityType = req.nextUrl.searchParams.get("entityType");
  const entityId = req.nextUrl.searchParams.get("entityId");
  if (!entityType || !entityId) {
    return NextResponse.json({ error: "entityType and entityId required" }, { status: 400 });
  }

  const owner = await requireOwner(req);
  const portalSession = await getPortalSessionFromRequest(req);

  if (!owner) {
    if (!portalSession || portalSession.role !== "portal") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const allowed = await canPersonAccessAttachment(
      portalSession.personId,
      entityType,
      entityId
    );
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const files = await prisma.fileAttachment.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(files);
}

export async function POST(req: NextRequest) {
  if (!(await requireOwner(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const entityType = form.get("entityType") as string;
  const entityId = form.get("entityId") as string;
  const notifyTeam = form.get("notifyTeam") === "true";

  if (!file || !entityType || !entityId) {
    return NextResponse.json({ error: "file, entityType, entityId required" }, { status: 400 });
  }

  try {
    const { storageKey, size } = await saveUpload(file);
    const attachment = await prisma.fileAttachment.create({
      data: {
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        size,
        storageKey,
        entityType,
        entityId,
      },
    });

    let emailsSent = 0;
    if (notifyTeam && (entityType === "project" || entityType === "publication" || entityType === "thesis")) {
      const prefs = await getEmailPrefs();
      const branding = await getEmailBranding();

      if (entityType === "project") {
        const project = await prisma.researchProject.findUnique({
          where: { id: entityId },
          include: { members: { include: { person: true } } },
        });
        if (project && prefs.emailOnProject) {
          for (const m of project.members) {
            if (!m.person.email) continue;
            const template = attachmentSharedEmail({
              memberName: m.person.name,
              itemTitle: project.title,
              itemType: "research project",
              filename: file.name,
              supervisorName: branding.name,
            });
            const result = await sendEmail({ to: m.person.email, ...template, category: "team" });
            if (result.success) emailsSent++;
          }
        }
      }

      if (entityType === "publication") {
        const publication = await prisma.publication.findUnique({
          where: { id: entityId },
          include: { members: { include: { person: true } } },
        });
        if (publication && prefs.emailOnPublication) {
          for (const m of publication.members) {
            if (!m.person.email) continue;
            const template = attachmentSharedEmail({
              memberName: m.person.name,
              itemTitle: publication.title,
              itemType: "publication",
              filename: file.name,
              supervisorName: branding.name,
            });
            const result = await sendEmail({ to: m.person.email, ...template, category: "team" });
            if (result.success) emailsSent++;
          }
        }
      }

      if (entityType === "thesis") {
        const thesis = await prisma.thesis.findUnique({
          where: { id: entityId },
          include: { person: true },
        });
        if (thesis?.person?.email) {
          const template = attachmentSharedEmail({
            memberName: thesis.person.name,
            itemTitle: thesis.title,
            itemType: "thesis",
            filename: file.name,
            supervisorName: branding.name,
          });
          const result = await sendEmail({ to: thesis.person.email, ...template, category: "team" });
          if (result.success) emailsSent++;
        }
      }
    }

    return NextResponse.json({ ...attachment, emailsSent }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
