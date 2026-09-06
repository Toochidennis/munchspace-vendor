import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const cookieStore = await cookies();

  const hasRefreshToken = cookieStore.has("refreshToken");
  const hasAccessToken = cookieStore.has("accessToken");
  const hasAuth = hasRefreshToken || hasAccessToken;
  const hasBusinessCookie = cookieStore.get("hasBusiness")?.value === "true";
  const hasBusinessId = Boolean(cookieStore.get("businessId")?.value);
  const hasBusiness = hasBusinessCookie && hasBusinessId;



  // A queued destination wins over the dashboard for someone who already has a
  // session — the stale-cookie case, where logout() lands on /login?next=... a
  // beat before the cleared cookie is visible here. Same-origin paths only:
  // "//evil.com" and "/\\evil.com" are protocol-relative URLs despite the
  // leading slash, and this value reaches a redirect.
  const queued = request.nextUrl.searchParams.get("next");
  const queuedTarget =
    queued &&
    queued.startsWith("/") &&
    !queued.startsWith("//") &&
    !queued.startsWith("/\\") &&
    !queued.startsWith("/login")
      ? queued
      : null;

  // 1. PUBLIC ROUTES: If logged in, don't allow access to login/home
  if (hasAuth && (pathname === "/" || pathname === "/login")) {
    if (queuedTarget && hasBusiness) {
      return NextResponse.redirect(new URL(queuedTarget, request.url));
    }

    // If they have a session but NO business, send to setup
    if (!hasBusiness) {
      return NextResponse.redirect(new URL("/setup-your-store", request.url));
    }
    // Otherwise, they are fully set up -> Dashboard
    return NextResponse.redirect(new URL("/restaurant/dashboard", request.url));
  }

  // 2. PROTECTED ROUTES: Require Refresh Token
  const isProtectedRoute =
    pathname.startsWith("/restaurant") ||
    pathname.startsWith("/setup-your-store");

  if (!hasAuth && isProtectedRoute) {
    // Carry the page they were trying to reach, so an order link from email
    // survives the detour through login. Built from nextUrl, so it is always a
    // same-origin path; the login form sanitizes it again before using it.
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  // 3. BUSINESS REQUIREMENT: If in /restaurant but no business is set
  if (hasAuth && !hasBusiness && pathname.startsWith("/restaurant")) {
    return NextResponse.redirect(new URL("/setup-your-store", request.url));
  }

  // 4. PREVENT LOOP: If they HAVE a business, don't let them stay on setup page
  if (
    hasAuth &&
    hasBusiness &&
    pathname.startsWith("/setup-your-store")
  ) {
    return NextResponse.redirect(new URL("/restaurant/dashboard", request.url));
  }

  // FALLBACK: Root redirect for logged-out users
  if (!hasAuth && pathname === "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/setup-your-store/:path*", "/restaurant/:path*"],
};
