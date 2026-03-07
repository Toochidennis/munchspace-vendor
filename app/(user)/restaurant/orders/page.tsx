"use client";

import { useState, useEffect } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Settings2,
  Plus,
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
import { getAccessToken, getBusinessId } from "@/app/lib/auth";
import { refreshAccessToken } from "@/app/lib/api";
import Image from "next/image";

// ────────────────────────────────────────────────
//  Auth / Fetch utilities (assumed to exist)
// ────────────────────────────────────────────────
// ← replace with real value / context

const API_BASE = "https://dev.api.munchspace.io/api/v1";
const API_KEY = process.env.NEXT_PUBLIC_MUNCHSPACE_API_KEY || "";

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
      headers: { ...headers, Authorization: `Bearer ${token}` },
    });
  }

  return response;
}

// ────────────────────────────────────────────────
//  Types
// ────────────────────────────────────────────────
type Order = {
  orderId: string;
  orderCode: string;
  placedAt: string;
  status: string;
  totalAmount: number;
};

type StatusFilter = "all" | "pending" | "preparing" | "completed" | "cancelled";

const rangeMap: Record<string, string> = {
  last30: "last_30_days",
  last7: "last_7_days",
  today: "today",
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
    completed: 0,
    cancelled: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const BUSINESS_ID = getBusinessId();
    const fetchOrders = async () => {
      setLoading(true);

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
            apiGroup = "preparing"; // adjust if backend uses different key
            break;
          case "completed":
            apiGroup = "completed";
            break;
          case "cancelled":
            apiGroup = "returned"; // most common naming seen in your example
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

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const json = await response.json();

        if (!json.success || !json.data) {
          throw new Error("Invalid API response format");
        }

        const apiData = json.data;

        setOrders(apiData.data || []);
        setTotalItems(apiData.total || 0);

        const groups = apiData.groups || {};
        setCounts({
          all: groups.all || 0,
          pending: groups.pending || 0,
          preparing: groups.preparing || 0,
          completed: groups.completed || 0,
          cancelled: groups.returned || 0,
        });
      } catch (err: any) {
        toast.error("Failed to load orders", {
          description: err.message || "Please try again later.",
        });
        setOrders([]);
        setTotalItems(0);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [period, statusFilter, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  const getPageNumbers = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [];

    if (currentPage <= 5) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      if (totalPages > 5) {
        pages.push("...");
        pages.push(totalPages);
      }
    } else if (currentPage > 5 && currentPage < totalPages) {
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

  // Skeleton row for desktop table
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

  // Skeleton card for mobile view
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

  return (
    <div className="min-h-screen p-6 lg:p-8 mt-10 md:mt-0">
      {orders.length === 0 && !loading ? (
        <div className="flex flex-col items-center mt-20 justify-center py-12 px-6">
          <div className="relative mb-8">
            <Image
              src="/images/empty-menu-illustration.png"
              alt="No results found"
              width={300}
              height={250}
              className="object-contain"
              priority
            />
          </div>
          <h2 className="text-2xl font-medium text-orange-500 mb-4 text-center">
            {searchTerm
              ? "No results found"
              : "You don't have any order yet."}
          </h2>
          <p className="text-center text-gray-600 max-w-md">
            {searchTerm
              ? `Your search for "${searchTerm}" does not match any items in your order. Try a different keyword.`
              : "Your orders will be visible here once a customer place them."}
          </p>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header + filters */}
          <div className="flex justify-between items-center mb-8 md:mb-15">
            <h1 className="text-3xl font-bold text-gray-900">Orders</h1>

            <div className="md:flex items-center hidden gap-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search by Order ID"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>

              <Select
                value={period}
                onValueChange={(value) => {
                  setPeriod(value as typeof period);
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

            <div
              onClick={() => setShowSearchMobile(!showSearchMobile)}
              className={cn(
                "border border-gray-300 items-center md:hidden rounded-lg p-2 w-15 h-12 text-slate-800 flex justify-center",
                showSearchMobile && "bg-munchprimary text-white",
              )}
            >
              <Settings2 />
            </div>
          </div>

          {showSearchMobile && (
            <div className="flex flex-col items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search by Order ID"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full h-12"
                />
              </div>

              <Select
                value={period}
                onValueChange={(value) => {
                  setPeriod(value as typeof period);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger style={{ height: "48px" }} className="w-full">
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

          {/* Tabs */}
          <div className="flex items-center gap-8 border-b border-gray-200 overflow-x-auto pb-1">
            <button
              onClick={() => {
                setStatusFilter("all");
                setCurrentPage(1);
              }}
              className={cn(
                "pb-2 border-b-4 transition-colors whitespace-nowrap",
                statusFilter === "all"
                  ? "text-orange-600 border-orange-600"
                  : "text-gray-600 border-transparent hover:text-gray-900",
              )}
            >
              All Orders ({counts.all})
            </button>
            <button
              onClick={() => {
                setStatusFilter("pending");
                setCurrentPage(1);
              }}
              className={cn(
                "pb-2 border-b-4 transition-colors whitespace-nowrap",
                statusFilter === "pending"
                  ? "text-orange-600 border-orange-600"
                  : "text-gray-600 border-transparent hover:text-gray-900",
              )}
            >
              Pending ({counts.pending})
            </button>
            <button
              onClick={() => {
                setStatusFilter("preparing");
                setCurrentPage(1);
              }}
              className={cn(
                "pb-2 border-b-4 transition-colors whitespace-nowrap",
                statusFilter === "preparing"
                  ? "text-orange-600 border-orange-600"
                  : "text-gray-600 border-transparent hover:text-gray-900",
              )}
            >
              Preparing ({counts.preparing})
            </button>
            <button
              onClick={() => {
                setStatusFilter("completed");
                setCurrentPage(1);
              }}
              className={cn(
                "pb-2 border-b-4 transition-colors whitespace-nowrap",
                statusFilter === "completed"
                  ? "text-orange-600 border-orange-600"
                  : "text-gray-600 border-transparent hover:text-gray-900",
              )}
            >
              Completed ({counts.completed})
            </button>
            <button
              onClick={() => {
                setStatusFilter("cancelled");
                setCurrentPage(1);
              }}
              className={cn(
                "pb-2 border-b-4 transition-colors whitespace-nowrap",
                statusFilter === "cancelled"
                  ? "text-orange-600 border-orange-600"
                  : "text-gray-600 border-transparent hover:text-gray-900",
              )}
            >
              Cancelled ({counts.cancelled})
            </button>
          </div>

          {/* Table / List */}
          <Card className="border-0 shadow-none p-0">
            {loading ? (
              <>
                {/* Desktop skeleton */}
                <div className="hidden md:block w-full">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-100">
                        <TableHead
                          style={{ paddingTop: "15px", paddingBottom: "15px" }}
                          className="text-gray-700 font-medium ps-4"
                        >
                          Order ID
                        </TableHead>
                        <TableHead
                          style={{ paddingTop: "15px", paddingBottom: "15px" }}
                          className="text-gray-700 font-medium"
                        >
                          Order Date
                        </TableHead>
                        <TableHead
                          style={{ paddingTop: "15px", paddingBottom: "15px" }}
                          className="text-gray-700 font-medium"
                        >
                          ₦ Total Price
                        </TableHead>
                        <TableHead
                          style={{ paddingTop: "15px", paddingBottom: "15px" }}
                          className="text-gray-700 font-medium"
                        >
                          Status
                        </TableHead>
                        <TableHead
                          style={{ paddingTop: "15px", paddingBottom: "15px" }}
                          className="text-gray-700 font-medium"
                        />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <SkeletonRow key={i} />
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile skeleton */}
                <div className="md:hidden border p-1 px-2 rounded space-y-0">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonMobileCard key={i} />
                  ))}
                </div>
              </>
            ) : (
              <>
                {/* Desktop view */}
                <div className="hidden md:block w-full">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-100">
                        <TableHead
                          style={{ paddingTop: "15px", paddingBottom: "15px" }}
                          className="text-gray-700 font-medium ps-4"
                        >
                          Order ID
                        </TableHead>
                        <TableHead
                          style={{ paddingTop: "15px", paddingBottom: "15px" }}
                          className="text-gray-700 font-medium"
                        >
                          Order Date
                        </TableHead>
                        <TableHead
                          style={{ paddingTop: "15px", paddingBottom: "15px" }}
                          className="text-gray-700 font-medium"
                        >
                          ₦ Total Price
                        </TableHead>
                        <TableHead
                          style={{ paddingTop: "15px", paddingBottom: "15px" }}
                          className="text-gray-700 font-medium"
                        >
                          Status
                        </TableHead>
                        <TableHead
                          style={{ paddingTop: "15px", paddingBottom: "15px" }}
                          className="text-gray-700 font-medium"
                        />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow
                          key={order.orderId}
                          style={{ paddingTop: "10px", paddingBottom: "10px" }}
                          className="font-medium border-gray-100 text-base hover:bg-white"
                        >
                          <TableCell
                            className="ps-4"
                            style={{
                              paddingTop: "25px",
                              paddingBottom: "25px",
                            }}
                          >
                            {order.orderCode}
                          </TableCell>
                          <TableCell
                            style={{
                              paddingTop: "25px",
                              paddingBottom: "25px",
                            }}
                          >
                            {new Date(order.placedAt).toLocaleString()}
                          </TableCell>
                          <TableCell
                            style={{
                              paddingTop: "25px",
                              paddingBottom: "25px",
                            }}
                          >
                            ₦{order.totalAmount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={cn(
                                "rounded px-4 py-1.5",
                                order.status
                                  .toLowerCase()
                                  .includes("pending") &&
                                  "bg-blue-100 text-blue-500 border border-blue-200",
                                order.status
                                  .toLowerCase()
                                  .includes("preparing") &&
                                  "bg-yellow-100 text-yellow-700 border border-yellow-200",
                                order.status
                                  .toLowerCase()
                                  .includes("completed") &&
                                  "bg-green-100 text-green-500 border border-green-200",
                                (order.status
                                  .toLowerCase()
                                  .includes("cancel") ||
                                  order.status
                                    .toLowerCase()
                                    .includes("return")) &&
                                  "bg-red-100 text-red-400 border border-red-200",
                              )}
                            >
                              {order.status.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/restaurant/orders/${order.orderId}`}>
                              <Button
                                variant="outline"
                                className="border-gray-200"
                              >
                                View Details
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile view */}
                <div className="md:hidden border p-1 px-2 rounded">
                  {orders.map((order, index) => (
                    <Link
                      key={order.orderId}
                      href={`/restaurant/orders/${order.orderId}`}
                    >
                      <div
                        className={cn(
                          "border-b border-gray-100 p-4 px-0 flex justify-between items-center hover:bg-gray-50",
                          orders.length - 1 === index && "border-0",
                        )}
                      >
                        <div className="flex flex-col mb-2">
                          <span
                            className={cn(
                              "py-1.5 font-medium",
                              order.status.toLowerCase().includes("pending") &&
                                "text-blue-500",
                              order.status
                                .toLowerCase()
                                .includes("preparing") && "text-yellow-600",
                              order.status
                                .toLowerCase()
                                .includes("completed") && "text-green-500",
                              (order.status.toLowerCase().includes("cancel") ||
                                order.status
                                  .toLowerCase()
                                  .includes("return")) &&
                                "text-red-400",
                            )}
                          >
                            {order.status.replace(/_/g, " ")}
                          </span>
                          <span className="font-medium">{order.orderCode}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-600 mb-2 text-sm">
                            {new Date(order.placedAt).toLocaleString()}
                          </p>
                          <p className="text-gray-900 font-semibold text-xl mb-2">
                            ₦{order.totalAmount.toLocaleString()}
                          </p>
                          <p className="text-gray-600 mb-2 text-xs">
                            order channel: Store
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </Card>

          {/* Pagination */}
          {totalItems > 0 && !loading && (
            <div className="flex items-center justify-center mx-2 gap-5 text-sm">
              <p className="text-gray-600 hidden md:block">
                Total <span>{totalItems}</span> items
              </p>

              <div className="flex items-center gap-2 md:gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="hover:bg-gray-100 disabled:opacity-50"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>

                <div className="flex items-center gap-2">
                  {getPageNumbers().map((page, index) => (
                    <div key={index}>
                      {page === "..." ? (
                        <span className="text-gray-500 px-2 flex items-center">
                          <p className="-mt-2">...</p>
                        </span>
                      ) : (
                        <Button
                          variant={currentPage === page ? "default" : "ghost"}
                          size="sm"
                          onClick={() => handlePageChange(page as number)}
                          className={cn(
                            "min-w-8 md:min-w-10",
                            currentPage === page &&
                              "bg-orange-500 hover:bg-orange-600 text-white",
                          )}
                        >
                          {page}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    handlePageChange(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="hover:bg-gray-100 disabled:opacity-50"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>

                <Select
                  value={`${itemsPerPage}`}
                  onValueChange={handleItemsPerPageChange}
                >
                  <SelectTrigger className="w-32 bg-white border-gray-300 hidden md:flex">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 / page</SelectItem>
                    <SelectItem value="20">20 / page</SelectItem>
                    <SelectItem value="50">50 / page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
