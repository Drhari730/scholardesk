import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "scholardesk_session";
const PORTAL_COOKIE = "scholardesk_portal";

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return new TextEncoder().encode("dev-only-auth-secret-change-me");
  }
  return new TextEncoder().encode(secret);
}

async function getSession(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.role === "portal" && payload.personId) {
      return { role: "portal" as const };
    }
    return { role: "owner" as const };
  } catch {
    return null;
  }
}

function isPublicPath(pathname: string) {
  return (
    pathname === "/welcome" ||
    pathname === "/login" ||
    pathname === "/portal/login" ||
    pathname.startsWith("/api/auth/") ||
    pathname === "/api/google/callback" ||
    pathname === "/logo.svg" ||
    pathname === "/icon.svg" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js" ||
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

  const ownerToken = request.cookies.get(COOKIE_NAME)?.value;
  const portalToken = request.cookies.get(PORTAL_COOKIE)?.value;

  let session: { role: "owner" | "portal" } | null = null;
  if (ownerToken) session = await getSession(ownerToken);
  if (!session && portalToken) session = await getSession(portalToken);

  if (session?.role === "portal") {
    const allowed =
      pathname.startsWith("/portal") ||
      pathname.startsWith("/api/portal") ||
      pathname.startsWith("/api/auth/portal");
    if (!allowed) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/portal", request.url));
    }
    return NextResponse.next();
  }

  if (session?.role === "owner") {
    if (pathname === "/login" || pathname === "/welcome" || pathname === "/portal/login") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/portal")) {
    if (pathname === "/portal/login") return NextResponse.next();
    return NextResponse.redirect(new URL("/portal/login", request.url));
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (pathname === "/login") {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/welcome", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
