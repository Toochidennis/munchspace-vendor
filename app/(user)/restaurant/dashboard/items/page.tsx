"use client";

import { useState, useEffect } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
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
import Image from "next/image";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { getAccessToken, getBusinessId } from "@/app/lib/auth";
import { toast } from "sonner";
import { refreshAccessToken } from "@/app/lib/api";

// ────────────────────────────────────────────────
//  Constants from .env
// ────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_MUNCHSPACE_API_BASE || "";
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
//  Component
// ────────────────────────────────────────────────

export default function BestSellingItemsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [period, setPeriod] = useState<
    | "today"
    | "last_7_days"
    | "last_30_days"
    | "last_6_months"
    | "this_month"
    | "last_month"
    | "this_year"
  >("last_30_days");
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [items, setItems] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchNetworkError, setFetchNetworkError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const fetchBestSelling = async () => {
      setLoading(true);
      setFetchNetworkError(null);

      const businessId = getBusinessId();
      if (!businessId) {
        toast.error("Business ID not found");
        setLoading(false);
        return;
      }

      try {
        const url = `${API_BASE}/vendors/me/businesses/${businessId}/analytics/best-selling?range=${period}&page=${currentPage}&limit=${itemsPerPage}`;
        const res = await authenticatedFetch(url);

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        if (!json.success || !json.data) throw new Error("Invalid response");

        setItems(json.data.data || []);
        setTotalItems(json.data.total || 0);
      } catch (err: any) {
        console.error("Best-selling fetch failed:", err);
        if (
          err.message?.includes("fetch") ||
          err.message?.includes("Network")
        ) {
          setFetchNetworkError(
            "Unable to load best-selling items. Please check your internet connection.",
          );
        } else {
          toast.error("Failed to load best selling items", {
            description: err.message || "Please try again later.",
          });
        }
        setItems([]);
        setTotalItems(0);
      } finally {
        setLoading(false);
      }
    };

    fetchBestSelling();
  }, [period, currentPage, itemsPerPage]);

  // ────────────────────────────────────────────────
  //  Improved search: safe, checks actual fields, future-proof for name
  // ────────────────────────────────────────────────
  const filteredItems = items.filter((item) =>
    [
      (item.description || "").toLowerCase(),
      (item.categoryType?.label || "").toLowerCase(),
      (item.name || "").toLowerCase(), // safe fallback — will be "" until API adds it
    ].some((text) => text.includes(searchTerm.toLowerCase())),
  );

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filteredItems.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

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
      for (let i = 1; i <= 5; i++) {
        pages.push(i);
      }
      if (totalPages > 5) {
        pages.push("...");
        pages.push(totalPages);
      }
    } else if (currentPage > 5 && currentPage < totalPages) {
      pages.push(1);
      pages.push("...");
      pages.push(currentPage - 1, currentPage, currentPage + 1);
      pages.push("...");
      pages.push(totalPages);
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

  // Skeleton row (unchanged)
  const SkeletonRow = () => (
    <TableRow>
      <TableCell className="py-4 ps-4">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-gray-200 rounded-lg" />
          <div className="space-y-2">
            <div className="h-5 w-48 bg-gray-200 rounded" />
            <div className="h-4 w-64 bg-gray-200 rounded" />
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="h-5 w-12 bg-gray-200 rounded" />
      </TableCell>
      <TableCell>
        <div className="h-5 w-20 bg-gray-200 rounded" />
      </TableCell>
    </TableRow>
  );

  // Determine if pagination should be shown
  const showPagination = !loading && filteredItems.length > 0;

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
    <div className="min-h-screen bg-white text-gray-900 mt-10 md:mt-0">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/restaurant/dashboard">Dashboard</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Best selling items</span>
        </div>

        {/* Header with Search and Period */}
        <div className="flex justify-between items-center gap-2 md:gap-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 bg-white border-gray-300 text-gray-900 md:h-10 placeholder-gray-500 focus:border-gray-400"
            />
          </div>

          <Select
            value={period}
            onValueChange={(value) => {
              setPeriod(value as typeof period);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="md:w-40 bg-white border-gray-300 text-gray-900">
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
        </div>

        {/* Table */}
        <Card className="p-0 border border-gray-100 shadow-none min-h-[calc(100vh-240px)]">
          <Table>
            <TableHeader className="bg-gray-100 h-13">
              <TableRow className="border-b border-gray-200">
                <TableHead className="text-gray-600 my-5 ps-4">Item</TableHead>
                <TableHead className="text-gray-600 ps-5 md:ps-0">
                  Orders
                </TableHead>
                <TableHead className="text-gray-600">Category</TableHead>
              </TableRow>
            </TableHeader>

            {loading ? (
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </TableBody>
            ) : paginatedItems.length > 0 ? (
              <TableBody>
                {paginatedItems.map((item) => (
                  <TableRow
                    key={item.menuItemId}
                    className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <TableCell className="py-4 ps-4">
                      <div className="flex items-center gap-4 w-fit">
                        <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden">
                          <img
                            src={item.image}
                            alt={item.description}
                            width={80}
                            height={80}
                            className="object-cover w-full h-full"
                            crossOrigin="anonymous"
                          />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-900 min-w-20 ps-5 md:ps-0 md:min-w-30 font-medium">
                      {item.totalOrders}
                    </TableCell>
                    <TableCell className="text-gray-600 min-w-20 md:min-w-30">
                      {item.categoryType?.label || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            ) : null}
          </Table>

          {!loading && paginatedItems.length === 0 && (
            <div className="w-full flex-1 mt-10">
              <Image
                src={"/images/empty.png"}
                width={900}
                height={900}
                alt="empty"
                className="w-40 mx-auto"
              />
              <p className="text-center mb-10 mt-5 text-sm text-slate-500">
                Order list is empty.
              </p>
            </div>
          )}
        </Card>

        {/* Pagination - only shown when there are items after filtering */}
        {showPagination && (
          <div className="flex items-center justify-center mx-2 gap-5 text-sm">
            <p className="text-gray-600 hidden md:block">
              Total <span>{filteredItems.length}</span> items
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
    </div>
  );
}
