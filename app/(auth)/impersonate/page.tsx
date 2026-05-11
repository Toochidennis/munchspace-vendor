"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  setAccessToken,
  setBusinessId,
  hasBusiness,
  setDisplayName,
} from "@/app/lib/auth";
import { Loader2 } from "lucide-react";

function Impersonator() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const accessToken = searchParams.get("accessToken");
    const vendorId = searchParams.get("vendorId");
    const vendorName = searchParams.get("vendorName");

    if (accessToken && vendorId) {
      // Set the impersonation credentials
      setAccessToken(accessToken);
      setBusinessId(vendorId);
      hasBusiness(true);
      if (vendorName) setDisplayName(vendorName);

      // Optionally keep them marked as an admin for UI cues
      localStorage.setItem("admin", "true");

      // Redirect directly to their dashboard
      router.replace("/restaurant/dashboard");
    } else {
      // If missing parameters, redirect back to login safely
      router.replace("/login");
    }
  }, [searchParams, router]);

  return (
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      <p className="text-gray-600">Setting up impersonation session...</p>
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
