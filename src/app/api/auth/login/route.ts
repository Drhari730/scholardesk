import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  verifyPassword,
  sessionCookieOptions,
  COOKIE_NAME,
  getSessionFromRequest,
} from "@/lib/auth";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = checkRateLimit(`login:${ip}`, 5, 15 * 60 * 1000);

  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${limit.retryAfterSec} seconds.` },
      { status: 429 }
    );
  }

  const body = await req.json();

  if (!(await verifyPassword(body.password ?? ""))) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  resetRateLimit(`login:${ip}`);

  const token = await createSessionToken();
  const opts = sessionCookieOptions(token);
  const res = NextResponse.json({ success: true });
  res.cookies.set(opts.name, opts.value, {
    httpOnly: opts.httpOnly,
    secure: opts.secure,
    sameSite: opts.sameSite,
    maxAge: opts.maxAge,
    path: opts.path,
  });
  return res;
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  return NextResponse.json({ authenticated: !!session });
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
