// proxy.ts (project root)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hasRefreshToken = request.cookies.has("refreshToken");

  // Handle root homepage ("/")
  if (pathname === "/") {
    if (hasRefreshToken) {
      // User has a valid session → redirect to dashboard
      return NextResponse.redirect(
        new URL("/restaurant/dashboard", request.url)
      );
    } else {
      // No session → redirect to login
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  if (hasRefreshToken && pathname === "/login") {
    return NextResponse.redirect(new URL("/restaurant/dashboard", request.url));
  }

  // Existing protection for /setup-your-store
  if (!hasRefreshToken && pathname.startsWith("/restaurant")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Existing protection for /setup-your-store
  if (!hasRefreshToken && pathname.startsWith("/setup-your-store")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/setup-your-store/:path*",
    "/restaurant/:path*",
    // Add other protected routes here if needed, e.g., "/dashboard/:path*"
  ],
};
