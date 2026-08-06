import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/auth";
import { saveUpload } from "@/lib/uploads";

export async function GET(req: NextRequest) {
  if (!(await requireOwner(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entityType = req.nextUrl.searchParams.get("entityType");
  const entityId = req.nextUrl.searchParams.get("entityId");
  if (!entityType || !entityId) {
    return NextResponse.json({ error: "entityType and entityId required" }, { status: 400 });
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
    return NextResponse.json(attachment, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
