import { NextRequest, NextResponse } from "next/server";
import {
  verifyPortalMagicToken,
  createPortalToken,
  portalCookieOptions,
  clearOwnerSessionCookie,
} from "@/lib/auth";

// Redirect to the public URL, not req.url (which is the internal host:port on Railway)
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://scholardesk-production-55cf.up.railway.app";

function redirectBase(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  // Prefer the actual public host the visitor used; fall back to configured APP_URL
  if (host && !host.startsWith("localhost") && !host.startsWith("127.0.0.1")) {
    return `${proto}://${host}`;
  }
  return APP_URL;
}

export async function GET(req: NextRequest) {
  const base = redirectBase(req);
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/portal/login?error=missing", base));
  }

  const person = await verifyPortalMagicToken(token);
  if (!person) {
    return NextResponse.redirect(new URL("/portal/login?error=expired", base));
  }

  const sessionToken = await createPortalToken(person.id, person.name);
  const opts = portalCookieOptions(sessionToken);
  const res = NextResponse.redirect(new URL("/portal", base));
  res.cookies.set(opts.name, opts.value, {
    httpOnly: opts.httpOnly,
    secure: opts.secure,
    sameSite: opts.sameSite,
    maxAge: opts.maxAge,
    path: opts.path,
  });
  clearOwnerSessionCookie(res);
  return res;
}
