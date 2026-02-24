import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const cookieStore = await cookies();

  const hasRefreshToken = cookieStore.has("refreshToken");
  const hasBusiness = cookieStore.get("hasBusiness")?.value;

  console.log(`Proxy - Path: ${pathname}, HasBusiness: ${hasBusiness}`);

  // 1. PUBLIC ROUTES: If logged in, don't allow access to login/home
  if (hasRefreshToken && (pathname === "/" || pathname === "/login")) {
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

  if (!hasRefreshToken && isProtectedRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 3. BUSINESS REQUIREMENT: If in /restaurant but no business is set
  if (hasRefreshToken && !hasBusiness && pathname.startsWith("/restaurant")) {
    return NextResponse.redirect(new URL("/setup-your-store", request.url));
  }

  // 4. PREVENT LOOP: If they HAVE a business, don't let them stay on setup page
  if (
    hasRefreshToken &&
    hasBusiness &&
    pathname.startsWith("/setup-your-store")
  ) {
    return NextResponse.redirect(new URL("/restaurant/dashboard", request.url));
  }

  // FALLBACK: Root redirect for logged-out users
  if (!hasRefreshToken && pathname === "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/setup-your-store/:path*", "/restaurant/:path*"],
};
