import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// List all people with their personal-project membership + portal status
export async function GET() {
  const people = await prisma.person.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      portalEnabled: true,
      personalProjectMember: true,
    },
  });
  return NextResponse.json(people);
}

// Toggle a person's personal-project membership
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (!body.personId) {
    return NextResponse.json({ error: "personId required" }, { status: 400 });
  }
  const person = await prisma.person.update({
    where: { id: String(body.personId) },
    data: { personalProjectMember: Boolean(body.member) },
    select: { id: true, personalProjectMember: true },
  });
  return NextResponse.json(person);
}
