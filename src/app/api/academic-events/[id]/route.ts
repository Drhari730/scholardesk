import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, planningEventConfirmedEmail } from "@/lib/email";
import { getEmailPrefs } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { EVENT_TYPES } from "@/lib/constants";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.academicEvent.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const event = await prisma.academicEvent.update({
    where: { id },
    data: {
      title: body.title,
      type: body.type,
      status: body.status,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : body.endDate === null ? null : undefined,
      location: body.location,
      venue: body.venue,
      organizer: body.organizer,
      hostInstitution: body.hostInstitution,
      description: body.description,
      prepNotes: body.prepNotes,
      travelMode: body.travelMode,
      travelDetails: body.travelDetails,
      accommodation: body.accommodation,
      presentationTitle: body.presentationTitle,
      honorarium: body.honorarium,
      invitationDate: body.invitationDate ? new Date(body.invitationDate) : undefined,
      notes: body.notes,
      checklist: body.checklist ? JSON.stringify(body.checklist) : undefined,
      remindEmail: body.remindEmail,
    },
  });

  const prefs = await getEmailPrefs();
  const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });
  const userName = settings?.userName ?? "Dr. Hari Prakash";

  if (
    body.status === "CONFIRMED" &&
    existing.status !== "CONFIRMED" &&
    prefs.emailOnPlanning &&
    prefs.ownerEmail &&
    body.sendEmail !== false
  ) {
    const typeLabel = EVENT_TYPES.find((t) => t.value === event.type)?.label ?? event.type;
    const template = planningEventConfirmedEmail({
      userName,
      title: event.title,
      type: typeLabel,
      startDate: formatDate(event.startDate),
      endDate: event.endDate ? formatDate(event.endDate) : undefined,
      location: event.location ?? undefined,
      venue: event.venue ?? undefined,
    });
    await sendEmail({ to: prefs.ownerEmail, ...template });
  }

  return NextResponse.json(event);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.academicEvent.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
