import { SignJWT, jwtVerify } from "jose";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { verifyPasswordHash, hashPassword } from "@/lib/password";

const COOKIE_NAME = "scholardesk_session";
const PORTAL_COOKIE = "scholardesk_portal";
const SESSION_DURATION = "7d";

export type Session =
  | { role: "owner" }
  | { role: "portal"; personId: string; personName: string };

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

export { COOKIE_NAME, PORTAL_COOKIE };

export async function createSessionToken() {
  return new SignJWT({ role: "owner" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSecret());
}

export async function createPortalToken(personId: string, personName: string) {
  return new SignJWT({ role: "portal", personId, personName })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSecret());
}

/** Long-lived link for one-click portal login from email */
export async function createPortalMagicToken(personId: string, personName: string) {
  return new SignJWT({ role: "portal", personId, personName, magic: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("90d")
    .sign(getSecret());
}

export async function verifyPortalMagicToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.role !== "portal" || !payload.personId || !payload.magic) return null;
    const person = await prisma.person.findFirst({
      where: { id: String(payload.personId), portalEnabled: true },
    });
    if (!person) return null;
    return person;
  } catch {
    return null;
  }
}

export function generatePortalPin(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.role === "portal" && payload.personId) {
      return {
        role: "portal" as const,
        personId: String(payload.personId),
        personName: String(payload.personName ?? "Team Member"),
      };
    }
    return { role: "owner" as const };
  } catch {
    return null;
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

export async function verifyPortalPin(email: string, pin: string) {
  const person = await prisma.person.findFirst({
    where: {
      portalEnabled: true,
      email: { equals: email, mode: "insensitive" },
    },
  });
  if (!person?.portalPinHash) return null;
  if (!verifyPasswordHash(pin, person.portalPinHash)) return null;
  return person;
}

export async function setPortalPin(personId: string, pin: string) {
  await prisma.person.update({
    where: { id: personId },
    data: {
      portalEnabled: true,
      portalPinHash: hashPassword(pin),
    },
  });
}

export async function getSessionFromRequest(req: Request): Promise<Session | null> {
  const cookieHeader = req.headers.get("cookie") ?? "";

  const ownerMatch = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (ownerMatch?.[1]) {
    const session = await verifySessionToken(ownerMatch[1]);
    if (session?.role === "owner") return { role: "owner" };
  }

  const portalMatch = cookieHeader.match(new RegExp(`${PORTAL_COOKIE}=([^;]+)`));
  if (portalMatch?.[1]) {
    const session = await verifySessionToken(portalMatch[1]);
    if (session?.role === "portal") return session;
  }

  return null;
}

/** Portal API routes must use this — ignores admin session cookie */
export async function getPortalSessionFromRequest(req: Request): Promise<Session | null> {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const portalMatch = cookieHeader.match(new RegExp(`${PORTAL_COOKIE}=([^;]+)`));
  if (!portalMatch?.[1]) return null;
  const session = await verifySessionToken(portalMatch[1]);
  if (session?.role === "portal") return session;
  return null;
}

export function clearOwnerSessionCookie(res: { cookies: { set: (name: string, value: string, options: object) => void } }) {
  res.cookies.set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function requireOwner(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== "owner") return null;
  return session;
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

export function portalCookieOptions(token: string) {
  return {
    name: PORTAL_COOKIE,
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
    emailOnDigest: settings?.emailOnDigest ?? true,
    emailOnBackup: settings?.emailOnBackup ?? true,
    planningReminderDays: settings?.planningReminderDays ?? 7,
    ownerEmail: settings?.email ?? null,
    emailSignature: settings?.emailSignature ?? null,
    userName: settings?.userName ?? "Dr. Hari Prakash",
    userTitle: settings?.userTitle ?? "Assistant Professor, Public Health",
  };
}
