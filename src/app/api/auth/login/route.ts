import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  verifyPassword,
  sessionCookieOptions,
  COOKIE_NAME,
  getSessionFromRequest,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!(await verifyPassword(body.password ?? ""))) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

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
