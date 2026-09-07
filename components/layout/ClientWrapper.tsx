// components/ClientWrapper.tsx
"use client";

import { useEffect } from "react";
import { refreshAccessToken } from "@/app/lib/api";
import { usePathname } from "next/navigation";
import { getAccessToken } from "@/app/lib/auth";
import { currentReturnTo, loginUrlWithReturnTo } from "@/app/lib/return-to";

// Every authenticated screen lives under /restaurant, and /setup-your-store is
// the one onboarding step that also needs a session. Matching "/dashboard" was
// matching nothing: the route is /restaurant/dashboard, so startsWith never
// fired and the entire dashboard went ungated.
const PROTECTED_PATHS = ["/restaurant", "/setup-your-store"];

export default function ClientWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  useEffect(() => {
    // No idle timeout. A session is bounded by MAX_SESSION_MS from sign-in and
    // nothing else — a vendor watching the kitchen rather than the screen is
    // not signed out mid-service.

    // Determine if current route is protected
    const isProtected = PROTECTED_PATHS.some((path) =>
      pathname.startsWith(path),
    );

    if (isProtected) {
      async function ensureValidAccessToken() {
        // Check if access token exists in localStorage
        const currentToken = getAccessToken();

        if (!currentToken) {
          // No access token → attempt refresh using refresh token cookie
          const newToken = await refreshAccessToken();
          if (!newToken) {
            // Refresh failed → no valid session. Send them to login carrying
            // the page they were trying to reach, so following an order link
            // from email survives the detour through the login form.
            window.location.replace(loginUrlWithReturnTo(currentReturnTo()));
          }
          // If successful, refreshAccessToken already sets the new token in localStorage
        }
        // If token exists, assume it is valid (backend will enforce expiry)
      }

      ensureValidAccessToken();
    }

    return;
  }, [pathname]);

  return <>{children}</>;
}
