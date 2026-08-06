import { SignJWT, jwtVerify } from "jose";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { verifyPasswordHash } from "@/lib/password";

const COOKIE_NAME = "scholardesk_session";
const SESSION_DURATION = "7d";

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET must be set in production");
    }
    return new TextEncoder().encode("dev-only-auth-secret-change-me");
  }
  return new TextEncoder().encode(secret);
}

export { COOKIE_NAME };

export async function createSessionToken() {
  return new SignJWT({ role: "owner" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSecret());
}

export async function verifySessionToken(token: string) {
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}

export async function verifyPassword(input: string): Promise<boolean> {
  const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });

  if (settings?.passwordHash) {
    return verifyPasswordHash(input, settings.passwordHash);
  }

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;

  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function getSessionFromRequest(req: Request) {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  const token = match?.[1];
  if (!token || !(await verifySessionToken(token))) return null;
  return { role: "owner" as const };
}

export function sessionCookieOptions(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  };
}

export async function getOwnerEmail(): Promise<string | null> {
  const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });
  return settings?.email ?? process.env.OWNER_EMAIL ?? null;
}

export async function getEmailPrefs() {
  const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });
  return {
    emailOnTask: settings?.emailOnTask ?? true,
    emailOnPublication: settings?.emailOnPublication ?? true,
    emailOnPlanning: settings?.emailOnPlanning ?? true,
    emailOnProject: settings?.emailOnProject ?? true,
    planningReminderDays: settings?.planningReminderDays ?? 7,
    ownerEmail: settings?.email ?? null,
  };
}
