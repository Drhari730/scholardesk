import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month");
  const type = req.nextUrl.searchParams.get("type");

  const where: Record<string, unknown> = {};
  if (type && type !== "ALL") where.type = type;

  if (month) {
    const [year, m] = month.split("-").map(Number);
    const start = new Date(year, m - 1, 1);
    const end = new Date(year, m, 0, 23, 59, 59);
    where.OR = [
      { startDate: { gte: start, lte: end } },
      { endDate: { gte: start, lte: end } },
      { AND: [{ startDate: { lte: start } }, { endDate: { gte: end } }] },
    ];
  }

  const events = await prisma.academicEvent.findMany({
    where,
    orderBy: { startDate: "asc" },
  });
  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const event = await prisma.academicEvent.create({
    data: {
      title: body.title,
      type: body.type,
      status: body.status || "PLANNED",
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : null,
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
      invitationDate: body.invitationDate ? new Date(body.invitationDate) : null,
      notes: body.notes,
    },
  });
  return NextResponse.json(event, { status: 201 });
}
