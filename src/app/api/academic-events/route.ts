import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, planningEventEmail } from "@/lib/email";
import { getEmailPrefs } from "@/lib/auth";
import { buildDefaultChecklist, serializeChecklist } from "@/lib/checklists";
import { detectConflicts } from "@/lib/conflicts";
import { formatDate } from "@/lib/utils";
import { EVENT_TYPES } from "@/lib/constants";
import { pushCalendarEvent } from "@/lib/google-calendar";

async function syncEventToGoogle(event: {
  id: string;
  title: string;
  googleEventId: string | null;
  startDate: Date;
  endDate: Date | null;
  location: string | null;
  venue: string | null;
  prepNotes: string | null;
  type: string;
}) {
  const end = event.endDate ?? new Date(event.startDate.getTime() + 2 * 60 * 60 * 1000);
  const googleId = await pushCalendarEvent({
    googleEventId: event.googleEventId,
    title: `[ScholarDesk] ${event.title}`,
    description: `${event.type.replace(/_/g, " ")}${event.prepNotes ? `\n${event.prepNotes}` : ""}`,
    location: event.location ?? event.venue ?? undefined,
    start: event.startDate,
    end,
  });
  if (googleId && googleId !== event.googleEventId) {
    await prisma.academicEvent.update({ where: { id: event.id }, data: { googleEventId: googleId } });
  }
}

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
  const startDate = new Date(body.startDate);
  const endDate = body.endDate ? new Date(body.endDate) : null;
  const checklist = body.checklist
    ? JSON.stringify(body.checklist)
    : serializeChecklist(buildDefaultChecklist(body.type || "CONFERENCE"));

  const conflicts = await detectConflicts(startDate, endDate ?? startDate);

  const event = await prisma.academicEvent.create({
    data: {
      title: body.title,
      type: body.type,
      status: body.status || "PLANNED",
      startDate,
      endDate,
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
      checklist,
      remindEmail: body.remindEmail !== false,
      reminder7DaySent: false,
      reminder1DaySent: false,
    },
  });

  const prefs = await getEmailPrefs();
  if (prefs.emailOnPlanning && prefs.ownerEmail && body.sendEmail !== false) {
    const typeLabel = EVENT_TYPES.find((t) => t.value === event.type)?.label ?? event.type;
    const template = planningEventEmail({
      title: event.title,
      type: typeLabel,
      startDate: formatDate(event.startDate),
      endDate: event.endDate ? formatDate(event.endDate) : undefined,
      location: event.location ?? undefined,
      prepNotes: event.prepNotes ?? undefined,
    });
    await sendEmail({ to: prefs.ownerEmail, ...template });
  }

  await syncEventToGoogle(event).catch(() => {});

  return NextResponse.json({ ...event, conflicts }, { status: 201 });
}
