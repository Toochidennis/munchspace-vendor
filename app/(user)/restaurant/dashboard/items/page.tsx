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
import Image from "next/image";
import { cn } from "@/lib/utils";

// Mock data for different periods
const mockData = {
  last30: {
    items: Array.from({ length: 85 }, (_, i) => ({
      id: i + 1,
      name: "Pounded Yam With Egusi",
      image: "/images/foods/egusi.png",
      description:
        "a delightful blend of velvety pounded yam and flavorful Egusi soup.",
      orders: Math.floor(Math.random() * 300) + 100,
      category: ["Rice", "Swallow", "Side dish"][Math.floor(Math.random() * 3)],
    })).sort((a, b) => b.orders - a.orders),
  },
  last7: {
    items: Array.from({ length: 35 }, (_, i) => ({
      id: i + 1,
      name: "Pounded Yam With Egusi",
      image: "/images/foods/egusi.png",
      description:
        "a delightful blend of velvety pounded yam and flavorful Egusi soup.",
      orders: Math.floor(Math.random() * 150) + 50,
      category: ["Rice", "Swallow", "Side dish"][Math.floor(Math.random() * 3)],
    })).sort((a, b) => b.orders - a.orders),
  },
  today: {
    items: Array.from({ length: 12 }, (_, i) => ({
      id: i + 1,
      name: "Pounded Yam With Egusi",
      image: "/images/foods/egusi.png",
      description:
        "a delightful blend of velvety pounded yam and flavorful Egusi soup.",
      orders: Math.floor(Math.random() * 50) + 10,
      category: ["Rice", "Swallow", "Side dish"][Math.floor(Math.random() * 3)],
    })).sort((a, b) => b.orders - a.orders),
  },
};

export default function BestSellingItemsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [period, setPeriod] = useState<"last30" | "last7" | "today">("last30");
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const currentItems = mockData[period].items;

  const filteredItems = currentItems.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filteredItems.slice(
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

  // Pagination logic as previously implemented (matching your last accepted version)
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
    } else if (currentPage > 5 && currentPage < totalPages - 1) {
      pages.push(1, 2);
      pages.push("...");
      pages.push(currentPage - 1, currentPage, currentPage + 1);
      pages.push("...");
      pages.push(totalPages - 1, totalPages);
    } else {
      for (let i = 1; i <= 5; i++) {
        pages.push(i);
      }
      pages.push("...");
      pages.push(totalPages - 1, totalPages);
    }

    return pages;
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 mt-10 md:mt-0">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>Dashboard</span>
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
              <SelectItem value="last30">Last 30 days</SelectItem>
              <SelectItem value="last7">Last 7 days</SelectItem>
              <SelectItem value="today">Today</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card className="p-0 border border-gray-100 shadow-sm">
          <Table>
            <TableHeader className="bg-gray-100 h-13">
              <TableRow className="border-b border-gray-200">
                <TableHead className="text-gray-600 my-5 ps-4">Item</TableHead>
                <TableHead className="text-gray-600 ps-5 md:ps-0">
                  Orders
                </TableHead>
                <TableHead className="text-gray-600">
                  Category
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedItems.map((item) => (
                <TableRow
                  key={item.id}
                  className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <TableCell className="py-4 ps-4">
                    <div className="flex items-center gap-4 w-fit">
                      <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden">
                        <Image
                          src={item.image}
                          alt={item.name}
                          width={80}
                          height={80}
                          className="object-cover w-full h-full"
                        />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-900 min-w-20 ps-5 md:ps-0 md:min-w-30 font-medium">
                    {item.orders}
                  </TableCell>
                  <TableCell className="text-gray-600 min-w-20 md:min-w-30">
                    {item.category}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Pagination */}
        <div className="flex items-center justify-center mx-2 gap-5 text-sm">
          <p className="text-gray-600 hidden md:block">
            Total{" "}
            <span>
              {filteredItems.length}
            </span>{" "}
            items
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
                    <span className="text-gray-500 px-2">...</span>
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
      </div>
    </div>
  );
}
