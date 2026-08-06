import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "scholardesk_session";

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return new TextEncoder().encode("dev-only-auth-secret-change-me");
  }
  return new TextEncoder().encode(secret);
}

async function isValidSession(token: string) {
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}

function isPublicPath(pathname: string) {
  return (
    pathname === "/login" ||
    pathname.startsWith("/api/auth/") ||
    pathname === "/logo.svg" ||
    pathname === "/icon.svg" ||
    pathname.endsWith(".ico")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/cron/")) {
    const auth = request.headers.get("authorization")?.replace("Bearer ", "");
    if (process.env.CRON_SECRET && auth === process.env.CRON_SECRET) {
      return NextResponse.next();
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (pathname === "/api/calendar/ical") {
    const token = request.nextUrl.searchParams.get("token");
    if (process.env.CALENDAR_SECRET && token === process.env.CALENDAR_SECRET) {
      return NextResponse.next();
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = request.cookies.get(COOKIE_NAME)?.value;
  if (session && (await isValidSession(session))) {
    if (pathname === "/login") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
