import { NextRequest, NextResponse } from "next/server";
import {
  verifyPortalMagicToken,
  createPortalToken,
  portalCookieOptions,
  clearOwnerSessionCookie,
} from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/portal/login?error=missing", req.url));
  }

  const person = await verifyPortalMagicToken(token);
  if (!person) {
    return NextResponse.redirect(new URL("/portal/login?error=expired", req.url));
  }

  const sessionToken = await createPortalToken(person.id, person.name);
  const opts = portalCookieOptions(sessionToken);
  const res = NextResponse.redirect(new URL("/portal", req.url));
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
