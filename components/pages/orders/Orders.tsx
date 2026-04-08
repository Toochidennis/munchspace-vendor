"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Settings2,
  AlertCircle,
  RefreshCw,
  Edit3,
  X,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { toast } from "sonner";
import { getAccessToken, getBusinessId, logout } from "@/app/lib/auth";
import Image from "next/image";
import { refreshAccessToken } from "@/app/lib/api";

// ────────────────────────────────────────────────
//  Custom Modal Component
// ────────────────────────────────────────────────

function CustomModal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = "sm:max-w-[640px]",
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative w-full bg-white shadow-xl overflow-hidden rounded-md animate-in zoom-in-95 duration-200",
          maxWidth,
        )}
      >
        <div className="flex border-b items-center justify-between px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            className="text-gray-400 hover:text-gray-600 transition-colors"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
        {footer && (
          <div className="flex justify-end gap-3 px-6 py-4 border-t bg-white">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

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
    if (!refreshOk) {
      await logout();
      throw new Error("Session expired");
    }
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
    if (!refreshOk) {
      await logout();
      throw new Error("Session expired");
    }
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
//  Types & Helpers
// ────────────────────────────────────────────────

type Order = {
  orderId: string;
  orderCode: string;
  placedAt: string;
  status: string;
  totalAmount: number;
};

type StatusFilter =
  | "all"
  | "pending"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled"
  | "returned";

const rangeMap: Record<string, string> = {
  last30: "last_30_days",
  last7: "last_7_days",
  today: "today",
};

const getStatusBadgeClass = (status: string) => {
  const s = status.toLowerCase();
  if (s.includes("pending")) return "bg-blue-100 text-blue-700 border-blue-200";
  if (s.includes("preparing"))
    return "bg-amber-100 text-amber-700 border-amber-200";
  if (s.includes("ready"))
    return "bg-purple-100 text-purple-700 border-purple-200";
  if (s.includes("completed"))
    return "bg-green-100 text-green-700 border-green-200";
  if (s.includes("reject")) return "bg-red-100 text-red-700 border-red-200";
  if (s.includes("cancel")) return "bg-red-100 text-red-700 border-red-200";
  if (s.includes("out_for_delivery"))
    return "bg-teal-100 text-teal-700 border-teal-200";
  if (s.includes("returned"))
    return "bg-orange-100 text-orange-700 border-orange-200";
  return "bg-gray-100 text-gray-700 border-gray-200";
};

// ────────────────────────────────────────────────
//  Component
// ────────────────────────────────────────────────

export default function OrdersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [period, setPeriod] = useState<"last30" | "last7" | "today">("last30");
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showSearchMobile, setShowSearchMobile] = useState(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [counts, setCounts] = useState<Record<StatusFilter | "all", number>>({
    all: 0,
    pending: 0,
    preparing: 0,
    ready: 0,
    completed: 0,
    cancelled: 0,
    returned: 0,
  });

  const [loading, setLoading] = useState(true);
  const [fetchNetworkError, setFetchNetworkError] = useState<string | null>(
    null,
  );

  // Status update modal state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const BUSINESS_ID = getBusinessId();

    const fetchOrders = async () => {
      setLoading(true);
      setFetchNetworkError(null);

      try {
        const apiPeriod = rangeMap[period] || "last_30_days";

        let apiGroup: string;
        switch (statusFilter) {
          case "all":
            apiGroup = "all";
            break;
          case "pending":
            apiGroup = "pending";
            break;
          case "preparing":
            apiGroup = "preparing";
            break;
          case "ready":
            apiGroup = "ready";
            break;
          case "completed":
            apiGroup = "completed";
            break;
          case "cancelled":
            apiGroup = "cancelled";
            break;
          case "returned":
            apiGroup = "returned";
            break;
          default:
            apiGroup = "all";
        }

        const query = new URLSearchParams({
          range: apiPeriod,
          page: currentPage.toString(),
          limit: itemsPerPage.toString(),
          group: apiGroup,
        });

        const url = `${API_BASE}/vendors/me/businesses/${BUSINESS_ID}/orders?${query}`;
        const response = await authenticatedFetch(url);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const json = await response.json();

        if (!json.success || !json.data) {
          throw new Error("Invalid API response structure");
        }

        // Updated parsing for new nested structure
        const apiData = json.data; // top-level data object
        const fetchedOrders: Order[] = apiData.data || []; // actual orders array
        const meta = apiData.meta || {};
        const groups = apiData.groups || {};

        setOrders(fetchedOrders);
        setTotalItems(meta.total || 0); // use meta.total for pagination

        // Handle counts from groups (fallback logic preserved for "ready")
        let readyCount = groups.ready ?? 0;
        if (readyCount === 0 && statusFilter === "all") {
          readyCount = fetchedOrders.filter((o: Order) =>
            o.status.toLowerCase().includes("ready"),
          ).length;
        }

        setCounts({
          all: groups.all ?? fetchedOrders.length ?? 0,
          pending: groups.pending ?? 0,
          preparing: groups.preparing ?? 0,
          ready: readyCount,
          completed: groups.completed ?? 0,
          cancelled: groups.cancelled ?? 0,
          returned: groups.returned ?? 0,
        });
      } catch (err: any) {
        console.error("Orders fetch failed:", err);
        if (
          err.message?.includes("fetch") ||
          err.message?.includes("Network")
        ) {
          setFetchNetworkError(
            "Unable to load orders. Please check your internet connection.",
          );
        } else {
          toast.error("Failed to load orders", {
            description:
              err.message || "The service may be temporarily unavailable.",
          });
        }
        setOrders([]);
        setTotalItems(0);
        setCounts({
          all: 0,
          pending: 0,
          preparing: 0,
          ready: 0,
          completed: 0,
          cancelled: 0,
          returned: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [period, statusFilter, currentPage, itemsPerPage]);

  const handleStatusUpdate = async () => {
    if (!selectedOrder || !newStatus) return;

    setIsUpdating(true);
    try {
      const BUSINESS_ID = getBusinessId();
      const { orderId } = selectedOrder;

      let endpoint = "";
      switch (newStatus.toLowerCase()) {
        case "confirm":
        case "pending":
          endpoint = `${API_BASE}/vendors/me/businesses/${BUSINESS_ID}/orders/${orderId}/confirm`;
          break;
        case "ready":
          endpoint = `${API_BASE}/vendors/me/businesses/${BUSINESS_ID}/orders/${orderId}/ready-for-pickup`;
          break;
        case "reject":
          endpoint = `${API_BASE}/vendors/me/businesses/${BUSINESS_ID}/orders/${orderId}/reject`;
          break;
        case "cancel":
        case "cancelled":
          endpoint = `${API_BASE}/vendors/me/businesses/${BUSINESS_ID}/orders/${orderId}/cancel`;
          break;
        default:
          toast.error("Invalid status selected");
          return;
      }

      const response = await authenticatedFetch(endpoint, {
        method: "PATCH",
        body: JSON.stringify({}),
      });

      const result = await response.json();
      console.log("Status update response:", result);

      if (!response.ok) {
        throw new Error(
          result.message ||
            `Failed to update order status (${response.status})`,
        );
      }

      if (result.success) {
        toast.success(`Order status updated to ${newStatus}`);
        setIsModalOpen(false);
        setSelectedOrder(null);
        setNewStatus("");
        // Refresh the page to reflect the changes
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        throw new Error(result.message || "Failed to update order status");
      }
    } catch (err: any) {
      console.error("Status update failed:", err);
      toast.error("Failed to update order status", {
        description: err.message || "Please try again",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const filteredOrders = useMemo(() => {
    if (!searchTerm.trim()) return orders;
    return orders.filter(
      (order) =>
        order.orderCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.orderId.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [orders, searchTerm]);

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  const getPageNumbers = () => {
    if (totalPages <= 5)
      return Array.from({ length: totalPages }, (_, i) => i + 1);

    const pages: (number | string)[] = [];
    if (currentPage <= 5) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      if (totalPages > 5) {
        pages.push("...");
        pages.push(totalPages);
      }
    } else if (currentPage < totalPages - 4) {
      pages.push(
        1,
        "...",
        currentPage - 1,
        currentPage,
        currentPage + 1,
        "...",
        totalPages,
      );
    } else {
      for (let i = totalPages - 4; i <= totalPages; i++) {
        if (i > 0) pages.push(i);
      }
      if (totalPages > 5) {
        pages.unshift("...");
        pages.unshift(1);
      }
    }
    return pages;
  };

  // ... (SkeletonRow, SkeletonMobileCard, showFullEmptyState, showFilteredEmpty, PaginationControls remain unchanged)

  const SkeletonRow = () => (
    <TableRow>
      <TableCell className="ps-4 py-8">
        <div className="h-5 w-28 bg-gray-200 rounded animate-pulse" />
      </TableCell>
      <TableCell className="py-8">
        <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
      </TableCell>
      <TableCell className="py-8">
        <div className="h-5 w-20 bg-gray-200 rounded animate-pulse" />
      </TableCell>
      <TableCell className="py-8">
        <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
      </TableCell>
      <TableCell className="text-right py-8">
        <div className="h-9 w-28 bg-gray-200 rounded animate-pulse ml-auto" />
      </TableCell>
    </TableRow>
  );

  const SkeletonMobileCard = () => (
    <div className="border-b border-gray-100 p-4 px-0 flex justify-between items-center">
      <div className="flex flex-col mb-2 gap-2">
        <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
        <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="text-right space-y-2">
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse ml-auto" />
        <div className="h-7 w-20 bg-gray-200 rounded animate-pulse ml-auto" />
        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse ml-auto" />
      </div>
    </div>
  );

  const showFullEmptyState =
    !loading && totalItems === 0 && statusFilter === "all" && searchTerm === "";
  const showFilteredEmpty =
    !loading &&
    (totalItems === 0 || filteredOrders.length === 0) &&
    !showFullEmptyState &&
    !fetchNetworkError;

  const PaginationControls = () => (
    <div className="flex items-center justify-center mx-2 gap-5 text-sm mt-auto pt-6">
      {totalItems > 0 ? (
        <>
          <p className="text-gray-600 hidden md:block">
            Total <span>{totalItems}</span> items
          </p>
          <div className="flex items-center gap-2 md:gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || loading}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              {getPageNumbers().map((p, i) =>
                p === "..." ? (
                  <span key={i} className="text-gray-500 px-2">
                    ...
                  </span>
                ) : (
                  <Button
                    key={i}
                    variant={currentPage === p ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handlePageChange(p as number)}
                    disabled={loading}
                    className={cn(
                      "min-w-8 md:min-w-10",
                      currentPage === p &&
                        "bg-orange-500 hover:bg-orange-600 text-white",
                    )}
                  >
                    {p}
                  </Button>
                ),
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || loading}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={handleItemsPerPageChange}
              disabled={loading}
            >
              <SelectTrigger className="w-32 hidden md:flex">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 / page</SelectItem>
                <SelectItem value="20">20 / page</SelectItem>
                <SelectItem value="50">50 / page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      ) : null}
    </div>
  );

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
  return (
    <div className="min-h-screen p-5 md:p-8 mt-10 md:mt-0 flex flex-col">
      {showFullEmptyState ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="mb-8">
            <Image
              src="/images/empty-menu-illustration.png"
              alt="No orders illustration"
              width={300}
              height={250}
              className="object-contain"
              priority
            />
          </div>
          <h2 className="text-2xl font-medium text-orange-500 mb-4">
            You don't have any orders yet
          </h2>
          <p className="text-gray-600 max-w-md">
            Orders from customers will appear here once they are placed.
          </p>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8 md:mb-12">
            <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
            <div className="hidden md:flex items-center gap-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search by Order ID"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
              <Select
                value={period}
                onValueChange={(v) => {
                  setPeriod(v as typeof period);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last30">Last 30 days</SelectItem>
                  <SelectItem value="last7">Last 7 days</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <button
              className={cn(
                "md:hidden border rounded-lg p-2 h-12 w-12 flex items-center justify-center",
                showSearchMobile &&
                  "bg-orange-500 text-white border-orange-500",
              )}
              onClick={() => setShowSearchMobile(!showSearchMobile)}
            >
              <Settings2 className="h-5 w-5" />
            </button>
          </div>

          {showSearchMobile && (
            <div className="md:hidden flex flex-col gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search by Order ID"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>
              <Select
                value={period}
                onValueChange={(v) => {
                  setPeriod(v as typeof period);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last30">Last 30 days</SelectItem>
                  <SelectItem value="last7">Last 7 days</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Status Tabs - Border Fix Applied Here */}
          <div className="flex gap-8 border-b border-gray-200 overflow-x-auto items-end">
            {(
              [
                "all",
                "pending",
                "preparing",
                "completed",
                "cancelled",
                "returned",
              ] as const
            ).map((f) => (
              <button
                key={f}
                onClick={() => {
                  setStatusFilter(f);
                  setCurrentPage(1);
                }}
                className={cn(
                  "pb-3 border-b-4 font-medium whitespace-nowrap transition-colors -mb-px",
                  statusFilter === f
                    ? "border-orange-600 text-orange-600"
                    : "border-transparent text-gray-600 hover:text-gray-900",
                )}
              >
                {f === "all"
                  ? "All Orders"
                  : f.charAt(0).toUpperCase() + f.slice(1)}{" "}
                ({counts[f]})
              </button>
            ))}
          </div>

          <div className="flex-1">
            {showFilteredEmpty ? (
              <div className="py-20 flex flex-col items-center justify-center text-center">
                <AlertCircle className="h-14 w-14 text-gray-400 mb-6" />
                <h3 className="text-xl font-medium text-gray-700 mb-3">
                  No orders found
                </h3>
                <p className="text-gray-500 max-w-md">
                  {searchTerm
                    ? `No matching orders for "${searchTerm}" in the selected period and status.`
                    : `No ${statusFilter} orders found for the selected time range.`}
                </p>
              </div>
            ) : (
              <Card className="border-0 shadow-none p-0">
                {loading ? (
                  <>
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-100">
                            <TableHead className="ps-4 py-4 font-medium text-gray-700">
                              Order ID
                            </TableHead>
                            <TableHead className="py-4 font-medium text-gray-700">
                              Order Date
                            </TableHead>
                            <TableHead className="py-4 font-medium text-gray-700">
                              ₦ Total Price
                            </TableHead>
                            <TableHead className="py-4 font-medium text-gray-700">
                              Status
                            </TableHead>
                            <TableHead className="py-4" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Array(5)
                            .fill(null)
                            .map((_, i) => (
                              <SkeletonRow key={i} />
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="md:hidden space-y-1">
                      {Array(5)
                        .fill(null)
                        .map((_, i) => (
                          <SkeletonMobileCard key={i} />
                        ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-100">
                            <TableHead className="ps-4 py-4 font-medium text-gray-700">
                              Order ID
                            </TableHead>
                            <TableHead className="py-4 font-medium text-gray-700">
                              Order Date
                            </TableHead>
                            <TableHead className="py-4 font-medium text-gray-700">
                              ₦ Total Price
                            </TableHead>
                            <TableHead className="py-4 font-medium text-gray-700">
                              Status
                            </TableHead>
                            <TableHead className="py-4" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredOrders.map((order) => (
                            <TableRow
                              key={order.orderId}
                              className="hover:bg-gray-50/50"
                            >
                              <TableCell className="ps-4 py-6 font-medium">
                                {order.orderCode}
                              </TableCell>
                              <TableCell className="py-6">
                                {new Date(order.placedAt).toLocaleString()}
                              </TableCell>
                              <TableCell className="py-6">
                                ₦{order.totalAmount.toLocaleString()}
                              </TableCell>
                              <TableCell className="py-6">
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "px-4 py-1.5 rounded text-sm font-medium",
                                      getStatusBadgeClass(order.status),
                                    )}
                                  >
                                    {order.status.replace(/_/g, " ")}
                                  </Badge>
                                  {!order.status
                                    .toLowerCase()
                                    .includes("cancel") &&
                                    !order.status
                                      .toLowerCase()
                                      .includes("completed") &&
                                    !order.status
                                      .toLowerCase()
                                      .includes("out_for_delivery") &&
                                    !order.status
                                      .toLowerCase()
                                      .includes("rejected") && (
                                      <button
                                        onClick={() => {
                                          setSelectedOrder(order);
                                          setIsModalOpen(true);
                                        }}
                                        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                                        title="Update status"
                                      >
                                        <Edit3 className="h-4 w-4 text-gray-600 hover:text-gray-900" />
                                      </button>
                                    )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right py-6">
                                <Link
                                  href={`/restaurant/orders/${order.orderId}`}
                                >
                                  <Button variant="outline" size="sm">
                                    View Details
                                  </Button>
                                </Link>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="md:hidden divide-y divide-gray-100">
                      {filteredOrders.map((order) => (
                        <div
                          key={order.orderId}
                          className="p-4 flex justify-between items-start hover:bg-gray-50"
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <div
                                className={cn(
                                  "font-medium text-sm",
                                  getStatusBadgeClass(order.status).split(
                                    " ",
                                  )[1],
                                )}
                              >
                                {order.status.replace(/_/g, " ")}
                              </div>
                              {!order.status.toLowerCase().includes("cancel") &&
                                !order.status
                                  .toLowerCase()
                                  .includes("completed") &&
                                !order.status
                                  .toLowerCase()
                                  .includes("out_for_delivery") &&
                                !order.status
                                  .toLowerCase()
                                  .includes("rejected") && (
                                  <button
                                    onClick={() => {
                                      setSelectedOrder(order);
                                      setIsModalOpen(true);
                                    }}
                                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                                    title="Update status"
                                  >
                                    <Edit3 className="h-3.5 w-3.5 text-gray-600" />
                                  </button>
                                )}
                            </div>
                            <Link
                              href={`/restaurant/orders/${order.orderId}`}
                              className="font-medium"
                            >
                              {order.orderCode}
                            </Link>
                          </div>
                          <div className="text-right">
                            <div className="text-gray-500 text-sm mb-1">
                              {new Date(order.placedAt).toLocaleString()}
                            </div>
                            <div className="font-bold text-lg">
                              ₦{order.totalAmount.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </Card>
            )}
          </div>
          <PaginationControls />
        </div>
      )}

      {/* Status Update Modal */}
      <CustomModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedOrder(null);
          setNewStatus("");
        }}
        title="Mark order as..."
        maxWidth="sm:max-w-md"
        footer={
          <>
            <Button
              variant="outline"
              className="rounded-md"
              onClick={() => {
                setIsModalOpen(false);
                setSelectedOrder(null);
                setNewStatus("");
              }}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStatusUpdate}
              disabled={!newStatus || isUpdating}
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-md min-w-24"
            >
              {isUpdating ? "Updating..." : "Update Status"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Order ID:</p>
            <p className="font-medium text-gray-900">
              {selectedOrder?.orderCode}
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Select New Status
            </label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger className="rounded-md h-12! w-full mt-2">
                <SelectValue placeholder="Choose a status" />
              </SelectTrigger>
              <SelectContent className="rounded-md">
                {selectedOrder &&
                  selectedOrder.status.toLowerCase().includes("pending") && (
                    <SelectItem value="confirm">Confirm</SelectItem>
                  )}
                {selectedOrder &&
                  selectedOrder.status.toLowerCase().includes("preparing") && (
                    <SelectItem value="ready">Ready for Pickup</SelectItem>
                  )}
                <SelectItem value="reject">Reject</SelectItem>
                <SelectItem value="cancel">Cancel</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CustomModal>
    </div>
  );
}
