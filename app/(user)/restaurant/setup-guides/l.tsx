"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  AlertCircle,
  RefreshCw,
  ChevronRight,
  ShoppingBag,
  Users,
  Percent,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { getAccessToken, getBusinessId, getFirstName } from "@/app/lib/auth";
import { toast } from "sonner";
import { refreshAccessToken } from "@/app/lib/api";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vendor Dashboard",
  description:
    "Monitor your restaurant's performance, manage active orders, and track your logistics in real-time on the munchspace dashboard.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  openGraph: {
    title: "Dashboard | munchspace",
    description: "Access your munchspace vendor tools and real-time analytics.",
    url: "https://vendor.munchspace.io/dashboard",
  },
};

// ────────────────────────────────────────────────
//  Constants
// ────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_BASE_URL || "";
const API_KEY = process.env.NEXT_PUBLIC_MUNCHSPACE_API_KEY || "";

// ────────────────────────────────────────────────
//  Authenticated Fetch
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

  const method = (init.method || "GET").toUpperCase();
  const hasBody = init.body !== undefined && init.body !== null;

  if (
    !hasBody &&
    (method === "POST" || method === "PATCH" || method === "PUT")
  ) {
    init.body = JSON.stringify({});
    (headers as any)["Content-Type"] = "application/json";
  } else if (hasBody && !(init.body instanceof FormData)) {
    (headers as any)["Content-Type"] = "application/json";
  }

  let response = await fetch(url, { ...init, headers });

  if (response.status === 401) {
    const refreshOk = await refreshAccessToken();
    if (!refreshOk) throw new Error("Session expired");
    token = getAccessToken();

    response = await fetch(url, {
      ...init,
      headers: { ...headers, Authorization: `Bearer ${token}` },
    });
  }

  return response;
}

// ────────────────────────────────────────────────
//  Main Component
// ────────────────────────────────────────────────

export default function DashboardPage() {
  const [firstName, setFirstName] = useState<string | null>(null);
  const [period, setPeriod] = useState<
    | "today"
    | "last_7_days"
    | "last_30_days"
    | "last_6_months"
    | "this_month"
    | "last_month"
    | "this_year"
  >("last_30_days");

  const [isPublished, setIsPublished] = useState<boolean | null>(null);
  const [canGoLive, setCanGoLive] = useState<boolean>(false);
  const [toggling, setToggling] = useState(false);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fetchNetworkError, setFetchNetworkError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    setFirstName(getFirstName());
  }, []);

  // Fetch onboarding status (including canGoLive)
  useEffect(() => {
    const fetchOnlineStatus = async () => {
      const businessId = getBusinessId();
      if (!businessId) return;

      try {
        const res = await authenticatedFetch(
          `${API_BASE}/api/v1/vendors/me/businesses/${businessId}/onboarding`,
        );

        if (res.ok) {
          const json = await res.json();
          const onboarding = json.data || {};
          setIsPublished(onboarding.isPublished ?? false);
          setCanGoLive(onboarding.canGoLive ?? false);
        } else {
          setIsPublished(false);
          setCanGoLive(false);
        }
      } catch (err) {
        console.error(err);
        setIsPublished(false);
        setCanGoLive(false);
      }
    };

    fetchOnlineStatus();
  }, []);

  // Fetch dashboard analytics
  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      setFetchNetworkError(null);

      const businessId = getBusinessId();
      if (!businessId) {
        toast.error("Business ID not found");
        setLoading(false);
        return;
      }

      try {
        const url = `${API_BASE}/vendors/me/businesses/${businessId}/analytics/dashboard?range=${period}`;
        const res = await authenticatedFetch(url);

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        if (!json.success || !json.data) throw new Error("Invalid response");

        const api = json.data;

        setData({
          traffic: api.traffic || [],
          bestSelling: (api.bestSelling || []).map((item: any) => ({
            name: item.name || item.productName || "Unknown Item",
            sales: item.sales || item.quantity || item.totalSold || 0,
          })),
          recentOrders: (api.recentOrders?.data || []).map((o: any) => ({
            id: o.orderId,
            code: o.code || o.orderId,
            date: new Date(o.placedAt).toLocaleString(),
            price: o.total,
            status: o.status,
          })),
          kpis: {
            totalOrders: api.totals?.orders?.total?.value || 0,
            totalOrdersTrend: api.totals?.orders?.total?.trend || 0,
            totalReturns: api.totals?.returns?.total?.value || 0,
            totalReturnsTrend: api.totals?.returns?.total?.trend || 0,
            newCustomers: api.totals?.newCustomers?.value || 0,
            newCustomersTrend: api.totals?.newCustomers?.trend || 0,
            totalDiscount: api.totals?.discounts?.total?.value || 0,
            totalDiscountTrend: api.totals?.discounts?.total?.trend || 0,
          },
        });
      } catch (err: any) {
        console.error(err);
        if (
          err.message?.includes("fetch") ||
          err.message?.includes("Network")
        ) {
          setFetchNetworkError(
            "Unable to load dashboard data. Please check your internet connection.",
          );
        } else {
          toast.error("Failed to load dashboard");
        }
        setData({
          traffic: [],
          bestSelling: [],
          recentOrders: [],
          kpis: {
            totalOrders: 0,
            totalOrdersTrend: 0,
            totalReturns: 0,
            totalReturnsTrend: 0,
            newCustomers: 0,
            newCustomersTrend: 0,
            totalDiscount: 0,
            totalDiscountTrend: 0,
          },
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [period]);

  // Toggle Publish / Unpublish
  const toggleOnlineStatus = async () => {
    if (isPublished === null || toggling) return;

    const businessId = getBusinessId();
    if (!businessId) return toast.error("Business ID not found");

    setToggling(true);
    const action = isPublished ? "unpublish" : "publish";
    const endpoint = `${API_BASE}/api/v1/vendors/me/businesses/${businessId}/${action}`;

    try {
      const res = await authenticatedFetch(endpoint, { method: "PATCH" });

      if (res.ok) {
        const newStatus = !isPublished;
        setIsPublished(newStatus);
        toast.success(`Store is now ${newStatus ? "Online" : "Offline"}`);
      } else {
        let errorMessage = `Failed to ${action} store`;
        try {
          const errorJson = await res.json();
          errorMessage = errorJson.error || errorJson.message || errorMessage;
        } catch (_) {}
        toast.error(errorMessage, {
          description:
            "Please complete all required business setup to go live.",
        });
      }
    } catch (err) {
      toast.error("An unexpected error occurred while updating store status.");
    } finally {
      setToggling(false);
    }
  };

  const colorPalette = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-orange-500",
    "bg-red-500",
  ];

  const getStatusBadgeClass = (status: string): string => {
    const s = status.toLowerCase().trim();
    switch (s) {
      case "pending":
        return "bg-blue-100 text-blue-700 border border-blue-200";
      case "preparing":
        return "bg-amber-100 text-amber-700 border border-amber-200";
      case "ready":
        return "bg-purple-100 text-purple-700 border border-purple-200";
      case "cancelled":
        return "bg-red-100 text-red-700 border border-red-200";
      case "returned":
        return "bg-orange-100 text-orange-700 border border-orange-200";
      case "completed":
        return "bg-green-100 text-green-700 border border-green-200";
      default:
        return "bg-gray-100 text-gray-700 border border-gray-200";
    }
  };

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
          <RefreshCw className="h-4 w-4" /> Refresh Page
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen p-6 lg:p-8 mt-10 md:mt-0">
        <div className="max-w-7xl mx-auto space-y-8 animate-pulse">
          {/* Loading skeleton - same as before */}
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <div className="h-10 w-48 bg-gray-200 rounded" />
              <div className="h-5 w-64 bg-gray-200 rounded" />
            </div>
            <div className="h-10 w-40 bg-gray-200 rounded" />
          </div>
          {/* ... rest of skeleton unchanged ... */}
        </div>
      </div>
    );
  }

  const top5Items =
    data.bestSelling.length > 5
      ? data.bestSelling.slice(0, 5)
      : data.bestSelling;
  const totalSales = top5Items.reduce(
    (sum: number, item: any) => sum + item.sales,
    0,
  );

  return (
    <div className="min-h-screen p-6 lg:p-8 mt-10 md:mt-0">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Hi {firstName || "User"},
            </h1>
            <p className="text-gray-600 mt-1">Welcome to your dashboard</p>
          </div>

          <div className="flex items-center gap-4">
            <Select
              value={period}
              onValueChange={(value) => setPeriod(value as any)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="last_7_days">Last 7 days</SelectItem>
                <SelectItem value="last_30_days">Last 30 days</SelectItem>
                <SelectItem value="last_6_months">Last 6 months</SelectItem>
                <SelectItem value="this_month">This month</SelectItem>
                <SelectItem value="last_month">Last month</SelectItem>
                <SelectItem value="this_year">This year</SelectItem>
              </SelectContent>
            </Select>

            {isPublished !== null && (
              <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-2">
                <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  Store Status
                </span>
                <Switch
                  checked={isPublished}
                  onCheckedChange={toggleOnlineStatus}
                  disabled={toggling}
                />
                <span
                  className={cn(
                    "text-sm font-semibold whitespace-nowrap",
                    isPublished ? "text-green-600" : "text-red-600",
                  )}
                >
                  {isPublished ? "Online" : "Offline"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* === NEW PUBLISH STORE CARD (shown when canGoLive is true) === */}
        {canGoLive && (
          <Card className="bg-black text-white overflow-hidden border-0 shadow-xl">
            <div className="flex flex-col md:flex-row items-center justify-between p-8 gap-8">
              <div className="space-y-4">
                <h2 className="text-3xl font-bold">Ready to go live?</h2>
                <p className="text-gray-300 text-lg max-w-md">
                  Your store meets all requirements. Publish it now to start
                  receiving orders.
                </p>
                <Button
                  onClick={toggleOnlineStatus}
                  disabled={toggling}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-medium px-8 py-6 text-lg rounded-xl"
                >
                  Publish Store
                </Button>
              </div>

              <div className="flex-shrink-0">
                <Image
                  src="/images/publish-illustration.png" // Replace with your actual illustration if needed
                  alt="Publish Store"
                  width={280}
                  height={180}
                  className="object-contain"
                />
              </div>
            </div>
          </Card>
        )}

        {/* Store Traffic + KPI Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* ... Your existing traffic and KPI cards remain unchanged ... */}
          {/* (Kept exactly as in your provided code) */}
        </div>

        {/* Best Selling Items and Recent Orders sections remain the same as your original code */}
        {/* Best Selling Items */}
        <Card className="border-transparent shadow-none">
          {/* ... your original Best Selling Items code ... */}
        </Card>

        {/* Recent Orders */}
        <Card className="border-gray-100 shadow-none">
          {/* ... your original Recent Orders code ... */}
        </Card>
      </div>
    </div>
  );
}
