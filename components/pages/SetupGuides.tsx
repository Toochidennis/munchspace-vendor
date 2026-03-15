"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { CircleDashed, X, AlertCircle, RefreshCw } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { toast } from "sonner";
import { getAccessToken, getBusinessId } from "@/app/lib/auth";
import { useStore } from "@/components/context/StoreContext";
import { useRouter } from "next/navigation";
import { refreshAccessToken } from "@/app/lib/api";

// ────────────────────────────────────────────────
//  Constants from .env
// ────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_BASE_URL || "";
const API_KEY = process.env.NEXT_PUBLIC_MUNCHSPACE_API_KEY || "";

// ────────────────────────────────────────────────
//  Authenticated Fetch (with token refresh on 401)
// ────────────────────────────────────────────────

async function authenticatedFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  let token = getAccessToken();

  if (!token) {
    const refreshOk = await refreshAccessToken();
    if (!refreshOk) throw new Error("Session expired");
    token = getAccessToken();
  }

  const headers: HeadersInit = {
    "x-api-key": API_KEY,
    Authorization: `Bearer ${token}`,
    ...init.headers,
  };

  if (!(init.body instanceof FormData)) {
    (headers as any)["Content-Type"] = "application/json";
  }

  let response = await fetch(url, { ...init, headers });

  if (response.status === 401) {
    const refreshOk = await refreshAccessToken();
    if (!refreshOk) throw new Error("Session expired");
    token = getAccessToken();

    response = await fetch(url, {
      ...init,
      headers: {
        ...headers,
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return response;
}

// ────────────────────────────────────────────────
//  Types & Interface (unchanged)
// ────────────────────────────────────────────────

interface OnboardingData {
  businessId: string;
  kycVerified: boolean;
  menuItemsCount: number;
  availabilityReady: boolean;
  isPublished: boolean;
  chargesReady: boolean;
  settlementReady: boolean;
  pending: string[];
  canGoLive: boolean;
}

interface Task {
  title: string;
  description: string;
  completed: boolean;
  actionLabel: string;
  href: string;
  pendingKey: string;
  isPublishTask?: boolean;
}

// ────────────────────────────────────────────────
//  Component
// ────────────────────────────────────────────────

export default function SetupGuidePage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const { isPublished, isPublishLoading } = useStore();
  const [showCompletedDialog, setShowCompletedDialog] = useState(false);
  const [fetchNetworkError, setFetchNetworkError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!isPublishLoading && isPublished === true) {
      setShowCompletedDialog(true);
    }
  }, [isPublished, isPublishLoading]);

  const taskMapping: Record<string, Omit<Task, "completed" | "pendingKey">> = {
    "Tax Identification Number (TIN) not provided": {
      title: "Complete KYC Verification",
      description:
        "Submit required documents including your Tax Identification Number (TIN) to verify your business.",
      actionLabel: "Begin KYC",
      href: "/restaurant/setup/kyc",
    },
    "At least 3 menu items are required": {
      title: "Add 3+ Menu Items",
      description:
        "List at least three dishes or products with names, prices and photos so customers can order.",
      actionLabel: "Add items",
      href: "/restaurant/menu",
    },
    "Business charges not configured": {
      title: "Set Charges & Fees",
      description:
        "Define packaging, service, or delivery fees so prices stay clear and accurate.",
      actionLabel: "Add charges",
      href: "/restaurant/setup/charges",
    },
    "Settlement account not configured": {
      title: "Add Settlement Account",
      description:
        "Add your bank account details to receive payouts for your orders.",
      actionLabel: "Add account",
      href: "/restaurant/settlement",
    },
  };

  const fetchOnboardingStatus = async () => {
    setLoading(true);
    setFetchNetworkError(null);

    try {
      const businessId = getBusinessId();
      if (!businessId) throw new Error("Business identifier not found.");

      const response = await authenticatedFetch(
        `${API_BASE}/vendors/me/businesses/${businessId}/onboarding`,
      );

      if (!response.ok) {
        throw new Error("Failed to load setup progress.");
      }

      const res = await response.json();
      const data: OnboardingData = res.data;

      // Requirement: If pending is empty, redirect to dashboard
      if (data.pending && data.pending.length === 0 && !data.canGoLive) {
        router.push("/restaurant/dashboard");
        return;
      }

      const updatedTasks: Task[] = [];

      Object.keys(taskMapping).forEach((key) => {
        const isPending = data.pending.includes(key);
        updatedTasks.push({
          ...taskMapping[key],
          pendingKey: key,
          completed: !isPending,
        });
      });

      if (data.canGoLive) {
        updatedTasks.push({
          title: "Publish Store",
          description:
            "Make your store live so customers can find you and place orders.",
          actionLabel: "Publish store",
          href: "#",
          completed: false,
          pendingKey: "PUBLISH_ACTION",
          isPublishTask: true,
        });
      }

      setTasks(updatedTasks);
    } catch (err: any) {
      console.error("Onboarding fetch error:", err);
      if (err.message?.includes("fetch") || err.message?.includes("Network")) {
        setFetchNetworkError(
          "Unable to load setup progress. Please check your internet connection.",
        );
      } else {
        toast.error(err.message || "Failed to fetch status");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOnboardingStatus();
  }, []);

  const handlePublish = async () => {
    const businessId = getBusinessId();
    if (!businessId) return;

    setIsPublishing(true);
    try {
      const response = await authenticatedFetch(
        `${API_BASE}/vendors/me/businesses/${businessId}/publish`,
        {
          method: "PATCH",
          body: JSON.stringify({ businessId }),
        },
      );

      const resData = await response.json();
      if (!response.ok)
        throw new Error(resData.message || "Failed to publish store");

      toast.success(resData.message || "Business is now live.");
      router.push("/restaurant/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to publish store");
    } finally {
      setIsPublishing(false);
    }
  };

  const dismissTask = (pendingKey: string) => {
    setTasks((prev) => prev.filter((task) => task.pendingKey !== pendingKey));
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const progress =
    tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  if (fetchNetworkError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="h-16 w-16 text-red-500 mb-6" />
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Connection Error
        </h2>
        <p className="text-gray-600 max-w-md mb-8">{fetchNetworkError}</p>
        <Button
          onClick={() => window.location.reload()}
          className="gap-2 bg-munchprimary hover:bg-munchprimaryDark"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Page
        </Button>
      </div>
    );
  }

  if (loading) {
    return <SetupSkeleton />;
  }

  return (
    <>
      {showCompletedDialog && (
        <div className="min-h-screen bg-white flex items-center justify-center px-5 py-12">
          <div className="max-w-lg w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-10 text-center">
            <div className="mx-auto w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6">
              <svg
                className="w-10 h-10 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Setup Complete
            </h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Your store has been successfully published and all required setup
              steps have been completed.
            </p>
            <Button
              onClick={() => router.push("/restaurant/dashboard")}
              className="bg-[#E3723D] hover:bg-orange-600 text-white px-12 py-6 text-lg font-medium rounded-md"
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      )}
      <div className="min-h-screen bg-white">
        <div className="px-5 md:px-15 py-12 mt-5 md:mt-0 max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">Setup Guide</h1>
          <p className="text-slate-700 mb-8 max-w-2xl">
            Complete the steps below to prepare your store for launch.
          </p>

          <div className="flex items-center gap-4 mb-12">
            <Progress value={progress} className="flex-1 h-2 bg-gray-100">
              <div
                className="h-full bg-munchprimary transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </Progress>
            <span className="text-sm text-blue-500 font-medium">
              {progress}% completed
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tasks.map((task) => (
              <div
                key={task.pendingKey}
                className="text-black rounded-2xl p-6 flex flex-col justify-between border border-gray-100 relative bg-white shadow-sm"
              >
                <div className="flex items-start gap-4">
                  {task.completed ? (
                    <Image
                      src="/images/CheckCircleSuccess.svg"
                      alt="Completed"
                      width={28}
                      height={28}
                    />
                  ) : (
                    <CircleDashed className="h-7 w-7 text-slate-400 shrink-0 mt-0.5" />
                  )}

                  <div className={cn("flex-1", task.isPublishTask && "pr-24")}>
                    <h3 className="font-bold text-xl mb-2">{task.title}</h3>
                    <p className="text-gray-500 leading-relaxed text-sm md:text-base">
                      {task.description}
                    </p>
                  </div>

                  {task.isPublishTask && (
                    <div className="absolute right-4 top-6 w-24 h-24 pointer-events-none">
                      <Image
                        src="/images/publish-illustration.png"
                        alt="Publish"
                        width={96}
                        height={96}
                        className="object-contain"
                      />
                    </div>
                  )}
                </div>

                <div className="mt-8">
                  {task.isPublishTask ? (
                    <Button
                      onClick={handlePublish}
                      disabled={isPublishing}
                      className="rounded-md bg-[#E3723D] hover:bg-orange-600 text-white px-10 py-6 text-lg font-semibold"
                    >
                      {isPublishing ? "Publishing..." : "Publish store"}
                    </Button>
                  ) : !task.completed ? (
                    <Link href={task.href}>
                      <Button className="rounded-md bg-munchprimary hover:bg-orange-600 text-white px-6">
                        {task.actionLabel}
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      variant="outline"
                      className="rounded-md bg-gray-50 border-gray-100 text-slate-600 flex items-center gap-2"
                      onClick={() => dismissTask(task.pendingKey)}
                    >
                      <X className="h-4 w-4" />
                      <span>Dismiss</span>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

const SetupSkeleton = () => {
  return (
    <div className="min-h-screen bg-white">
      <div className="px-5 md:px-15 py-12 mt-5 md:mt-0 max-w-7xl mx-auto">
        {/* Title and Description Skeletons */}
        <div className="h-10 w-48 bg-gray-200 animate-pulse rounded-md mb-4" />
        <div className="h-5 w-96 bg-gray-100 animate-pulse rounded-md mb-8" />

        {/* Progress Bar Skeleton */}
        <div className="flex items-center gap-4 mb-12">
          <div className="flex-1 h-2 bg-gray-100 animate-pulse rounded-full" />
          <div className="h-4 w-24 bg-gray-100 animate-pulse rounded-md" />
        </div>

        {/* Task Cards Skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-2xl p-6 border border-gray-100 bg-white shadow-sm space-y-4"
            >
              <div className="flex items-start gap-4">
                <div className="h-7 w-7 rounded-full bg-gray-200 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-6 w-3/4 bg-gray-200 animate-pulse rounded-md" />
                  <div className="h-4 w-full bg-gray-100 animate-pulse rounded-md" />
                  <div className="h-4 w-5/6 bg-gray-100 animate-pulse rounded-md" />
                </div>
              </div>
              <div className="mt-8">
                <div className="h-10 w-32 bg-gray-200 animate-pulse rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
