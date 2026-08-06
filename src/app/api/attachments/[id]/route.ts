import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwner, getPortalSessionFromRequest } from "@/lib/auth";
import { canPersonAccessAttachment } from "@/lib/attachment-access";
import { readUpload, deleteUpload } from "@/lib/uploads";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const file = await prisma.fileAttachment.findUnique({ where: { id } });
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const owner = await requireOwner(req);
  if (!owner) {
    const portalSession = await getPortalSessionFromRequest(req);
    if (!portalSession || portalSession.role !== "portal") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const allowed = await canPersonAccessAttachment(
      portalSession.personId,
      file.entityType,
      file.entityId
    );
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const buffer = await readUpload(file.storageKey);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename="${file.filename}"`,
    },
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireOwner(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const file = await prisma.fileAttachment.delete({ where: { id } });
  await deleteUpload(file.storageKey);
  return NextResponse.json({ success: true });
}
