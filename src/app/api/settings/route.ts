import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { verifyPassword } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });
  return NextResponse.json({
    userName: settings?.userName,
    userTitle: settings?.userTitle,
    institution: settings?.institution,
    email: settings?.email,
    emailOnTask: settings?.emailOnTask ?? true,
    emailOnPublication: settings?.emailOnPublication ?? true,
    emailOnPlanning: settings?.emailOnPlanning ?? true,
    emailOnProject: settings?.emailOnProject ?? true,
    planningReminderDays: settings?.planningReminderDays ?? 7,
    hasPasswordSet: !!(settings?.passwordHash || process.env.ADMIN_PASSWORD),
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (body.newPassword) {
    if (!body.currentPassword || !(await verifyPassword(body.currentPassword))) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    }
    if (body.newPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    await prisma.appSettings.upsert({
      where: { id: "default" },
      update: { passwordHash: hashPassword(body.newPassword) },
      create: {
        id: "default",
        passwordHash: hashPassword(body.newPassword),
        email: "hariprakash607@gmail.com",
      },
    });
  }

  const settings = await prisma.appSettings.upsert({
    where: { id: "default" },
    update: {
      userName: body.userName,
      userTitle: body.userTitle,
      institution: body.institution,
      email: body.email,
      emailOnTask: body.emailOnTask,
      emailOnPublication: body.emailOnPublication,
      emailOnPlanning: body.emailOnPlanning,
      emailOnProject: body.emailOnProject,
      planningReminderDays: body.planningReminderDays
        ? Number(body.planningReminderDays)
        : undefined,
    },
    create: {
      id: "default",
      userName: body.userName ?? "Dr. Hari Prakash",
      userTitle: body.userTitle ?? "Assistant Professor, Public Health",
      institution: body.institution,
      email: body.email ?? "hariprakash607@gmail.com",
      emailOnTask: body.emailOnTask ?? true,
      emailOnPublication: body.emailOnPublication ?? true,
      emailOnPlanning: body.emailOnPlanning ?? true,
      emailOnProject: body.emailOnProject ?? true,
      planningReminderDays: body.planningReminderDays ? Number(body.planningReminderDays) : 7,
    },
  });

  return NextResponse.json(settings);
}
