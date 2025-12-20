"use client";

import { useState } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Settings,
  Settings2,
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

// Mock data for different periods
const mockData = {
  last30: {
    orders: Array.from({ length: 64 }, (_, i) => ({
      id: `45DF${String(100 + i).padStart(3, "0")}`,
      date: `Aug ${21 - Math.floor(i / 10)}, 2024 3:25 PM`,
      price: `${Math.floor(Math.random() * 3000 + 500)}`,
      status: ["Completed", "Pending", "Cancelled"][
        Math.floor(Math.random() * 3)
      ] as "Completed" | "Pending" | "Cancelled",
    })),
  },
  last7: {
    orders: Array.from({ length: 25 }, (_, i) => ({
      id: `45DF${String(200 + i).padStart(3, "0")}`,
      date: `Aug ${18 + i}, 2024 2:45 PM`,
      price: `${Math.floor(Math.random() * 2500 + 800)}`,
      status: ["Completed", "Pending", "Cancelled"][
        Math.floor(Math.random() * 3)
      ] as "Completed" | "Pending" | "Cancelled",
    })),
  },
  today: {
    orders: Array.from({ length: 12 }, (_, i) => ({
      id: `45DF${String(300 + i).padStart(3, "0")}`,
      date: `Aug 21, 2024 ${11 + i}:00 AM`,
      price: `{Math.floor(Math.random() * 2000 + 600)}`,
      status: ["Completed", "Pending", "Cancelled"][
        Math.floor(Math.random() * 3)
      ] as "Completed" | "Pending" | "Cancelled",
    })),
  },
};

type StatusFilter = "all" | "pending" | "completed" | "cancelled";

const itemsPerPageOptions = [10, 20, 50];

export default function OrdersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [period, setPeriod] = useState<"last30" | "last7" | "today">("last30");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showSearchMobile, setShowSearchMobile] = useState(false);

  const currentOrders = mockData[period].orders;

  // Filter by status and search term
  const filteredOrders = currentOrders.filter((order) => {
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "pending" && order.status === "Pending") ||
      (statusFilter === "completed" && order.status === "Completed") ||
      (statusFilter === "cancelled" && order.status === "Cancelled");

    const matchesSearch = order.id
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  // Counts for tabs
  const counts = {
    all: currentOrders.length,
    pending: currentOrders.filter((o) => o.status === "Pending").length,
    completed: currentOrders.filter((o) => o.status === "Completed").length,
    cancelled: currentOrders.filter((o) => o.status === "Cancelled").length,
  };

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
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
      for (let i = 1; i <= 5; i++) {
        pages.push(i);
      }
      pages.push("...");
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="min-h-screen p-6 lg:p-8 mt-10 md:mt-0">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center mb-8 md:mb-15">
          <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
          {/* Search and Period Filter */}
          <div className="md:flex items-center hidden  gap-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search by Order ID"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
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
              showSearchMobile && "bg-munchprimary text-white"
            )}
          >
            <Settings2 className="" />
          </div>
        </div>
        {showSearchMobile && (
          <div className="flex flex-col items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search by Order ID"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
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
        <div className="flex items-center gap-8 border-b border-gray-200">
          <button
            onClick={() => {
              setStatusFilter("all");
              setCurrentPage(1);
            }}
            className={cn(
              "pb-2 border-b-4 transition-colors",
              statusFilter === "all"
                ? "text-orange-600 border-orange-600"
                : "text-gray-600 border-transparent hover:text-gray-900"
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
              "pb-2 border-b-4 transition-colors",
              statusFilter === "pending"
                ? "text-orange-600 border-orange-600"
                : "text-gray-600 border-transparent hover:text-gray-900"
            )}
          >
            Pending ({counts.pending})
          </button>
          <button
            onClick={() => {
              setStatusFilter("completed");
              setCurrentPage(1);
            }}
            className={cn(
              "pb-2 border-b-4 transition-colors",
              statusFilter === "completed"
                ? "text-orange-600 border-orange-600"
                : "text-gray-600 border-transparent hover:text-gray-900"
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
              "pb-2 border-b-4 transition-colors",
              statusFilter === "cancelled"
                ? "text-orange-600 border-orange-600"
                : "text-gray-600 border-transparent hover:text-gray-900"
            )}
          >
            Cancelled ({counts.cancelled})
          </button>
        </div>

        {/* Table */}
        <Card className="border-0 shadow-none p-0">
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
                  ></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOrders.map((order) => (
                  <TableRow
                    key={order.id}
                    style={{ paddingTop: "10px", paddingBottom: "10px" }}
                    className="font-medium border-gray-100 text-base hover:bg-white"
                  >
                    <TableCell
                      className="ps-4"
                      style={{ paddingTop: "25px", paddingBottom: "25px" }}
                    >
                      #{order.id}
                    </TableCell>
                    <TableCell
                      style={{ paddingTop: "25px", paddingBottom: "25px" }}
                    >
                      {order.date}
                    </TableCell>
                    <TableCell
                      style={{ paddingTop: "25px", paddingBottom: "25px" }}
                    >
                      ₦{order.price}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "rounded px-4 py-1.5",
                          order.status === "Completed" &&
                            "bg-green-100 text-green-500 border border-green-200",
                          order.status === "Pending" &&
                            "bg-blue-100 text-blue-500 border border-blue-200",
                          order.status === "Cancelled" &&
                            "bg-red-100 text-red-400 border border-red-200"
                        )}
                      >
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/restaurant/orders/${order.id}`}>
                        <Button variant="outline" className="border-gray-200">
                          View Details
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden border p-1 rounded">
            {paginatedOrders.map((order) => (
              <Link key={order.id} href={`/restaurant/orders/${order.id}`}>
                <div className="border-b border-gray-200 p-4 flex justify-between items-center hover:bg-gray-50">
                  <div className="flex flex-col mb-2">
                    <span
                      className={cn(
                        "py-1.5",
                        order.status === "Completed" && "text-green-500",
                        order.status === "Pending" && "text-blue-500",
                        order.status === "Cancelled" && "text-red-400"
                      )}
                    >
                      {order.status}
                    </span>
                    <span className="font-medium">#{order.id}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-600 mb-2">{order.date}</p>
                    <p className="text-gray-900 font-semibold text-xl mb-2">
                      N{order.price}
                    </p>
                    <p className="text-gray-600 mb-2 text-xs">order channel: Store</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        {/* Pagination */}
        {paginatedOrders.length > 0 && (
          <div className="flex items-center justify-center mx-2 gap-5 text-sm">
            <p className="text-gray-600 hidden md:block">
              Total <span>{filteredOrders.length}</span> items
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
                            "bg-orange-500 hover:bg-orange-600 text-white"
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
                <SelectTrigger className="w-32 bg-white border-gray-300 hidden md:block">
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
