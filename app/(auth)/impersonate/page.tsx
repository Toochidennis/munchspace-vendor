"use client";

import { useEffect, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  setAccessToken,
  setBusinessId,
  hasBusiness,
  setDisplayName,
} from "@/app/lib/auth";
import { Loader2 } from "lucide-react";
import { readTokenExpiry, startSession } from "@/app/lib/session";
import { readApiError } from "@/app/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_BASE_URL || "";
const API_KEY = process.env.NEXT_PUBLIC_MUNCHSPACE_API_KEY || "";

/**
 * Receives an admin impersonating a vendor.
 *
 * The URL carries a one-time code, never a token: a URL is written to browser
 * history, to this server's access log and to the Referer header of anything
 * this page loads, so a token placed there leaks to all three. The code is
 * traded for the token over POST, and the exchange destroys it — a second
 * attempt with the same link fails whether or not the first succeeded.
 */
function Impersonator() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");

    if (!code) {
      router.replace("/login");
      return;
    }

    let cancelled = false;

    const exchange = async () => {
      try {
        const res = await fetch(`${API_BASE}/vendors/impersonation/exchange`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": API_KEY,
          },
          body: JSON.stringify({ code }),
        });

        if (!res.ok) {
          const message = await readApiError(
            res,
            "This impersonation link is no longer valid.",
          );
          if (!cancelled) setError(message);
          return;
        }

        const { data } = await res.json();
        const { accessToken, businessId, vendorName } = data ?? {};

        if (!accessToken || !businessId) {
          if (!cancelled) setError("This impersonation link is incomplete.");
          return;
        }

        // An impersonation token runs for about 30 minutes and comes with no
        // refresh token, so the session has to end when the token does. Read
        // from the token itself rather than taken on trust.
        const expiresAt = readTokenExpiry(accessToken);

        if (!expiresAt || expiresAt <= Date.now()) {
          if (!cancelled) setError("This impersonation session has expired.");
          return;
        }

        startSession(expiresAt - Date.now());
        setAccessToken(accessToken);
        setBusinessId(businessId);
        hasBusiness(true);
        if (vendorName) setDisplayName(vendorName);

        // Read by the sidebar for admin-only affordances. Cleared on logout.
        localStorage.setItem("admin", "true");

        // replace(), not push(), so the handoff URL leaves no history entry.
        router.replace("/restaurant/dashboard");
      } catch {
        if (!cancelled) {
          setError("Could not reach the server. Please try again.");
        }
      }
    };

    void exchange();

    return () => {
      cancelled = true;
    };
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <p className="text-sm text-gray-700">{error}</p>
        <button
          type="button"
          onClick={() => router.replace("/login")}
          className="text-sm font-medium text-orange-600 underline"
        >
          Go to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
    </div>
  );
}

export default function ImpersonatePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Suspense
        fallback={<Loader2 className="h-8 w-8 animate-spin text-orange-600" />}
      >
        <Impersonator />
      </Suspense>
    </div>
  );
}
