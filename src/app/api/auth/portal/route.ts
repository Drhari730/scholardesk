import { NextRequest, NextResponse } from "next/server";
import {
  verifyPortalPin,
  createPortalToken,
  portalCookieOptions,
  PORTAL_COOKIE,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = (body.email ?? "").trim().toLowerCase();
  const pin = body.pin ?? "";

  if (!email || !pin) {
    return NextResponse.json({ error: "Email and PIN required" }, { status: 400 });
  }

  const person = await verifyPortalPin(email, pin);
  if (!person) {
    return NextResponse.json({ error: "Invalid email or PIN" }, { status: 401 });
  }

  const token = await createPortalToken(person.id, person.name);
  const opts = portalCookieOptions(token);
  const res = NextResponse.json({ success: true, name: person.name });
  res.cookies.set(opts.name, opts.value, {
    httpOnly: opts.httpOnly,
    secure: opts.secure,
    sameSite: opts.sameSite,
    maxAge: opts.maxAge,
    path: opts.path,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(PORTAL_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
