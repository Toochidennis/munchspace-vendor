// components/ClientWrapper.tsx
"use client";

import { useEffect } from "react";
import { startInactivityListener } from "@/app/lib/inactivity";
import { refreshAccessToken } from "@/app/lib/api";
import { usePathname } from "next/navigation";
import { getAccessToken } from "@/app/lib/auth";

const PROTECTED_PATHS = ["/setup-your-store", "/dashboard"];

export default function ClientWrapper({
  children,
}: {
  children: React.ReactNode;
  }) {
  const pathname = usePathname()
  useEffect(() => {
    // Always start the inactivity listener (global)
    const cleanupInactivity = startInactivityListener();

    // Determine if current route is protected
    const isProtected = PROTECTED_PATHS.some((path) =>
      pathname.startsWith(path)
    );

    if (isProtected) {
      async function ensureValidAccessToken() {
        // Check if access token exists in localStorage
        const currentToken = getAccessToken();
        // console.log("access token", currentToken);
        // console.log("refresh token", localStorage.getItem("refreshToken"));

        if (!currentToken) {
          // No access token → attempt refresh using refresh token cookie
          const newToken = await refreshAccessToken();
          if (!newToken) {
            // Refresh failed → no valid session, redirect to login
            // window.location.href = "/login";
          }
          // If successful, refreshAccessToken already sets the new token in localStorage
        }
        // If token exists, assume it is valid (backend will enforce expiry)
      }

      ensureValidAccessToken();
    }

    return () => {
      cleanupInactivity();
    };
  }, [pathname]);

  return <>{children}</>;
}
