"use client";

import { useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

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

// Mock data for different periods
const mockData = {
  last30: {
    orders: Array.from({ length: 64 }, (_, i) => ({
      id: `#45DF${String(100 + i).padStart(3, "0")}`,
      date: `Aug ${21 - Math.floor(i / 10)}, 2024 3:25 PM`,
      price: `N${Math.floor(Math.random() * 3000 + 500)}`,
      status: ["Completed", "Pending", "Cancelled"][
        Math.floor(Math.random() * 3)
      ],
    })),
  },
  last7: {
    orders: Array.from({ length: 25 }, (_, i) => ({
      id: `#45DF${String(200 + i).padStart(3, "0")}`,
      date: `Aug ${18 + i}, 2024 2:45 PM`,
      price: `N${Math.floor(Math.random() * 2500 + 800)}`,
      status: ["Completed", "Pending", "Cancelled"][
        Math.floor(Math.random() * 3)
      ],
    })),
  },
  today: {
    orders: Array.from({ length: 12 }, (_, i) => ({
      id: `#45DF${String(300 + i).padStart(3, "0")}`,
      date: `Aug 21, 2024 ${11 + i}:00 AM`,
      price: `N${Math.floor(Math.random() * 2000 + 600)}`,
      status: ["Completed", "Pending", "Cancelled"][
        Math.floor(Math.random() * 3)
      ],
    })),
  },
};

const itemsPerPageOptions = [10, 20, 50];

export default function OrdersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [period, setPeriod] = useState<"last30" | "last7" | "today">("last30");
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const currentOrders = mockData[period].orders;

  // Filter by search term (Order ID)
  const filteredOrders = currentOrders.filter((order) =>
    order.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  // Pagination logic as per your exact specification
  const getPageNumbers = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [];

    if (currentPage <= 5) {
      // First 5 pages: 1 to 5, ..., last page
      for (let i = 1; i <= 5; i++) {
        pages.push(i);
      }
      pages.push("...");
      pages.push(totalPages);
    } else if (currentPage > 5 && currentPage < totalPages - 1) {
      // Middle: 1, 2, ..., current-1, current, current+1, ..., last-1, last
      pages.push(1, 2);
      pages.push("...");
      pages.push(currentPage - 1, currentPage, currentPage + 1);
      pages.push("...");
      pages.push(totalPages - 1, totalPages);
    } else {
      // Near end (currentPage >= totalPages - 1): 1 to 5, ..., last-1, last
      for (let i = 1; i <= 5; i++) {
        pages.push(i);
      }
      pages.push("...");
      pages.push(totalPages - 1, totalPages);
    }

    return pages;
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Title */}
        <h1 className="text-2xl font-bold text-orange-600">
          All Orders ({filteredOrders.length})
        </h1>

        {/* Search and Period Filter */}
        <div className="flex justify-between items-center gap-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search by Order ID"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
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

        {/* Table */}
        <Card className="border-0 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead className="text-gray-700 font-medium">
                  Order ID
                </TableHead>
                <TableHead className="text-gray-700 font-medium">
                  Order Date
                </TableHead>
                <TableHead className="text-gray-700 font-medium text-center">
                  ₦ Total Price
                </TableHead>
                <TableHead className="text-gray-700 font-medium text-right">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedOrders.map((order) => (
                <TableRow key={order.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{order.id}</TableCell>
                  <TableCell>{order.date}</TableCell>
                  <TableCell className="text-center font-medium">
                    {order.price}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      className={cn(
                        "rounded-full px-4 py-1",
                        order.status === "Completed" &&
                          "bg-green-100 text-green-800",
                        order.status === "Pending" &&
                          "bg-blue-100 text-blue-800",
                        order.status === "Cancelled" &&
                          "bg-red-100 text-red-800"
                      )}
                    >
                      {order.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Updated Pagination */}
        <div className="flex items-center justify-between mt-8">
          <p className="text-sm text-gray-600">
            Total{" "}
            <span className="font-medium text-gray-900">
              {filteredOrders.length}
            </span>{" "}
            items
          </p>

          <div className="flex items-center gap-4">
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
                    <span className="text-gray-500 px-2">...</span>
                  ) : (
                    <Button
                      variant={currentPage === page ? "default" : "ghost"}
                      size="sm"
                      onClick={() => handlePageChange(page as number)}
                      className={cn(
                        "min-w-10",
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
              <SelectTrigger className="w-32 bg-white border-gray-300">
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
      </div>
    </div>
  );
}
