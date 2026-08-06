import { NextRequest, NextResponse } from "next/server";
import {
  verifyPortalMagicToken,
  createPortalToken,
  portalCookieOptions,
} from "@/lib/auth";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://scholardesk-production-55cf.up.railway.app";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/portal/login?error=missing", APP_URL));
  }

  const person = await verifyPortalMagicToken(token);
  if (!person) {
    return NextResponse.redirect(new URL("/portal/login?error=expired", APP_URL));
  }

  const sessionToken = await createPortalToken(person.id, person.name);
  const opts = portalCookieOptions(sessionToken);
  const res = NextResponse.redirect(new URL("/portal", APP_URL));
  res.cookies.set(opts.name, opts.value, {
    httpOnly: opts.httpOnly,
    secure: opts.secure,
    sameSite: opts.sameSite,
    maxAge: opts.maxAge,
    path: opts.path,
  });
  return res;
}
