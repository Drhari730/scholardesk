import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
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
