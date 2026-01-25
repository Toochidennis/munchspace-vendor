"use client";

import { CircleDashed, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { getAccessToken, getBusinessId } from "@/app/lib/auth";
import { refreshAccessToken } from "@/app/lib/api";

const API_BASE = "https://api.munchspace.io/api/v1";

interface OnboardingStatus {
  availabilityReady: boolean;
  canGoLive: boolean;
  chargesReady: boolean;
  kycVerified: boolean;
  menuItemsCount: number;
  pending: string[];
}

interface Task {
  title: string;
  description: string;
  completed: boolean;
  actionLabel: string;
  href: string;
  pendingKey: string;
}

export default function SetupGuidePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const taskMapping: Record<
    string,
    { title: string; description: string; actionLabel: string; href: string }
  > = {
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
  };

  const alwaysShownTasks: Task[] = [
    {
      title: "Add Store Details",
      description:
        "Provide your store name, address, hours and basic information.",
      completed: true,
      actionLabel: "View details",
      href: "/restaurant/dashboard",
      pendingKey: "store-details",
    },
    {
      title: "Add Settlement Account",
      description:
        "Provide the bank account where your earnings should be deposited.",
      completed: true,
      actionLabel: "View account",
      href: "/restaurant/dashboard",
      pendingKey: "settlement-account",
    },
  ];

  useEffect(() => {
    async function fetchOnboardingStatus() {
      setLoading(true);
      setError(null);

      const businessId = getBusinessId();
      if (!businessId) {
        setError("Business identifier not found. Please sign in again.");
        setLoading(false);
        return;
      }

      let accessToken = getAccessToken();

      // Ensure we have a valid token (attempt refresh if missing)
      if (!accessToken) {
        const refreshSuccess = await refreshAccessToken();
        if (!refreshSuccess) {
          console.log("refresh success is:", refreshSuccess);
          setError("Your session has expired. Please sign in again.");
          setLoading(false);
          return;
        }

        accessToken = getAccessToken();
        if (!accessToken) {
          setError(
            "Token refresh completed but no valid access token was obtained.",
          );
          setLoading(false);
          return;
        }
      }

      const endpoint = `${API_BASE}/vendors/me/businesses/${businessId}/onboarding`;

      const makeRequest = (token: string) =>
        fetch(endpoint, {
          method: "GET",
          headers: {
            "x-api-key":
              "eH4u8eujRzIrLWE+xkqyUWg33ggZ1Ts5bAKi/Ze5l23dyc7aLZSVMEssML0vUvDHrhchMtyskMxzGW3c4jhQCA==",
            Authorization: `Bearer ${token}`,
          },
        });

      try {
        let response = await makeRequest(accessToken);

        // Handle 401 → refresh and retry once
        if (response.status === 401) {
          const refreshSuccess = await refreshAccessToken();
          if (!refreshSuccess) {
            throw new Error("Session expired (token refresh failed)");
          }

          accessToken = getAccessToken();
          if (!accessToken) {
            throw new Error("Refresh succeeded but no access token available");
          }

          response = await makeRequest(accessToken);
        }

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const res = await response.json();
        const data: OnboardingStatus = res.data;

        let dynamicTasks: Task[] = [...alwaysShownTasks];

        data.pending.forEach((pendingMsg) => {
          const config = taskMapping[pendingMsg];
          if (config) {
            dynamicTasks.push({
              ...config,
              completed: false,
              pendingKey: pendingMsg,
            });
          }
        });

        dynamicTasks = dynamicTasks.map((task) => ({
          ...task,
          completed: !data.pending.includes(task.pendingKey),
        }));

        setTasks(dynamicTasks);
      } catch (err: any) {
        console.error("Onboarding fetch error:", err);
        const message =
          err.message?.includes("expired") || err.message?.includes("refresh")
            ? "Your session has expired. Please sign in again."
            : "Failed to load setup progress. Please try again later.";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    fetchOnboardingStatus();
  }, []);

  const dismissTask = (pendingKey: string) => {
    setTasks((prev) => prev.filter((task) => task.pendingKey !== pendingKey));
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const progress =
    tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Loading setup progress...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="px-5 md:px-15 py-12 mt-5 md:mt-0">
        <h1 className="text-4xl font-bold mb-4">Setup Guide</h1>
        <p className="text-slate-700 mb-2">
          Complete the steps below to prepare your store for launch. Once all
          critical items are completed, your store will be ready for customers
          to view and place orders.
        </p>
        <p className="text-slate-700 mb-8">
          <Link href="#" className="text-blue-500">
            Need assistance?
          </Link>{" "}
          Our team is ready to help.
        </p>

        <div className="flex items-center gap-4 mb-12">
          <Progress value={progress} className="flex-1 h-2 bg-gray-200">
            <div
              className="h-full bg-munchprimary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </Progress>
          <span className="text-sm text-blue-500 font-medium">
            {progress}% completed
          </span>
        </div>

        {tasks.length === 0 ? (
          <p className="text-center text-slate-600">
            No pending setup items at this time.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tasks.map((task) => (
              <div
                key={task.pendingKey}
                className="text-black rounded-2xl p-6 flex flex-col justify-between border border-gray-100"
              >
                <div className="flex items-start gap-3">
                  {task.completed ? (
                    <Image
                      src="/images/CheckCircleSuccess.svg"
                      alt="Completed"
                      width={27}
                      height={27}
                    />
                  ) : (
                    <CircleDashed className="h-6 w-6 text-slate-700 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">{task.title}</h3>
                    <p className="text-gray-600 leading-relaxed">
                      {task.description}
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  {!task.completed ? (
                    <Link href={task.href}>
                      <Button
                        variant="default"
                        className="rounded-full bg-munchprimary hover:bg-orange-600 text-white"
                      >
                        {task.actionLabel}
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      variant="outline"
                      className="rounded-full bg-gray-100 border-gray-100"
                    >
                      <div
                        onClick={() => dismissTask(task.pendingKey)}
                        className="flex items-center gap-2 text-slate-700 cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                        <span>Dismiss</span>
                      </div>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
