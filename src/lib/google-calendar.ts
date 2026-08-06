import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

const REDIRECT_URI = () =>
  `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/google/callback`;

export function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  return new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI());
}

export async function getGoogleAuthUrl() {
  const client = getOAuthClient();
  if (!client) return null;

  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar.events"],
  });
}

export async function exchangeGoogleCode(code: string) {
  const client = getOAuthClient();
  if (!client) throw new Error("Google OAuth not configured");

  const { tokens } = await client.getToken(code);
  await prisma.appSettings.upsert({
    where: { id: "default" },
    update: {
      googleAccessToken: tokens.access_token ?? null,
      googleRefreshToken: tokens.refresh_token ?? undefined,
      googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    },
    create: {
      id: "default",
      googleAccessToken: tokens.access_token ?? null,
      googleRefreshToken: tokens.refresh_token ?? null,
      googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    },
  });
  return tokens;
}

async function getAuthedClient() {
  const client = getOAuthClient();
  if (!client) return null;

  const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });
  if (!settings?.googleRefreshToken && !settings?.googleAccessToken) return null;

  client.setCredentials({
    access_token: settings.googleAccessToken ?? undefined,
    refresh_token: settings.googleRefreshToken ?? undefined,
    expiry_date: settings.googleTokenExpiry?.getTime(),
  });

  client.on("tokens", async (tokens) => {
    await prisma.appSettings.update({
      where: { id: "default" },
      data: {
        googleAccessToken: tokens.access_token ?? undefined,
        googleRefreshToken: tokens.refresh_token ?? undefined,
        googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      },
    });
  });

  return client;
}

export async function isGoogleCalendarConnected() {
  const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });
  return !!(settings?.googleRefreshToken || settings?.googleAccessToken);
}

export async function pushCalendarEvent(params: {
  googleEventId?: string | null;
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
}) {
  const auth = await getAuthedClient();
  if (!auth) return null;

  const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });
  const calendar = google.calendar({ version: "v3", auth });
  const calendarId = settings?.googleCalendarId ?? "primary";

  const body = {
    summary: params.title,
    description: params.description,
    location: params.location,
    start: { dateTime: params.start.toISOString() },
    end: { dateTime: params.end.toISOString() },
  };

  if (params.googleEventId) {
    const res = await calendar.events.update({
      calendarId,
      eventId: params.googleEventId,
      requestBody: body,
    });
    return res.data.id ?? params.googleEventId;
  }

  const res = await calendar.events.insert({ calendarId, requestBody: body });
  return res.data.id ?? null;
}

export async function deleteCalendarEvent(googleEventId: string) {
  const auth = await getAuthedClient();
  if (!auth) return;

  const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });
  const calendar = google.calendar({ version: "v3", auth });
  try {
    await calendar.events.delete({
      calendarId: settings?.googleCalendarId ?? "primary",
      eventId: googleEventId,
    });
  } catch {
    // event may already be deleted
  }
}

export async function disconnectGoogleCalendar() {
  await prisma.appSettings.update({
    where: { id: "default" },
    data: {
      googleAccessToken: null,
      googleRefreshToken: null,
      googleTokenExpiry: null,
    },
  });
}
