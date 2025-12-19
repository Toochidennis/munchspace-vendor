"use client";

import { useEffect, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import Image from "next/image";
import { cn } from "@/lib/utils";
import Link from "next/link";

// Mock data for different periods
const mockData = {
  last30: {
    items: Array.from({ length: 85 }, (_, i) => ({
      id: i + 1,
      name: "Pounded Yam With Egusi",
      image: "/images/foods/egusi.png",
      description:
        "a delightful blend of velvety pounded yam and flavorful Egusi soup.",
      costPrice: "N800.00",
      sellingPrice: "N1,200.00",
      available: Math.random() > 0.3,
    })),
  },
  last7: {
    items: Array.from({ length: 35 }, (_, i) => ({
      id: i + 1,
      name: "Pounded Yam With Egusi",
      image: "/images/foods/egusi.png",
      description:
        "a delightful blend of velvety pounded yam and flavorful Egusi soup.",
      costPrice: "N750.00",
      sellingPrice: "N1,100.00",
      available: Math.random() > 0.4,
    })),
  },
  today: {
    items: Array.from({ length: 12 }, (_, i) => ({
      id: i + 1,
      name: "Pounded Yam With Egusi",
      image: "/images/foods/egusi.png",
      description:
        "a delightful blend of velvety pounded yam and flavorful Egusi soup.",
      costPrice: "N700.00",
      sellingPrice: "N1,000.00",
      available: Math.random() > 0.5,
    })),
  },
};

export default function MenuPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [period, setPeriod] = useState<"last30" | "last7" | "today">("last30");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [items, setItems] = useState(mockData.last30.items);

  // Update items when period changes
  useEffect(() => {
    setItems(mockData[period].items);
    setCurrentPage(1);
  }, [period]);

  // Filter items based on search
  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filteredItems.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handleToggleAvailability = (id: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, available: !item.available } : item
      )
    );
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  // Pagination numbers logic (as per your exact specification)
  const getPageNumbers = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [];

    if (currentPage <= 5) {
      for (let i = 1; i <= 5; i++) {
        pages.push(i);
      }
      pages.push("...");
      pages.push(totalPages);
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
    <div className="min-h-screen bg-white">
      {mockData.last30.items.length > 0 ? (
        <div className="max-w-7xl mx-auto p-6 space-y-8">
          {/* Header with Search and New Menu Button */}
          <div className="flex justify-between items-center gap-6">
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>

            <Link href="/restaurant/menu/new">
              <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                New Menu
              </Button>
            </Link>
          </div>

          {/* Table */}
          <Card className="border border-gray-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-gray-700">Item</TableHead>
                  <TableHead className="text-gray-700 text-center">
                    Cost Price
                  </TableHead>
                  <TableHead className="text-gray-700 text-center">
                    Selling Price
                  </TableHead>
                  <TableHead className="text-gray-700 text-center">
                    Availability
                  </TableHead>
                  <TableHead className="text-gray-700 text-right">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((item) => (
                  <TableRow
                    key={item.id}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    <TableCell className="py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                          <Image
                            src={item.image}
                            alt={item.name}
                            width={64}
                            height={64}
                            className="object-cover w-full h-full"
                          />
                        </div>
                        <span className="font-medium text-gray-900">
                          {item.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-gray-900">
                      {item.costPrice}
                    </TableCell>
                    <TableCell className="text-center text-gray-900 font-medium">
                      {item.sellingPrice}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={item.available}
                        onCheckedChange={() =>
                          handleToggleAvailability(item.id)
                        }
                        className={cn(
                          item.available && "data-[state=checked]:bg-orange-500"
                        )}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-gray-100"
                      >
                        <Image
                          src="/images/icon/Edit.svg"
                          alt="Edit"
                          width={33}
                          height={33}
                        />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-8">
            <p className="text-sm text-gray-600">
              Total{" "}
              <span className="font-medium text-gray-900">
                {filteredItems.length}
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
      ) : (
        <div className="p-3">
          <h2 className="font-bold text-2xl">Menu</h2>
          <div className="flex items-center justify-center px-6">
            <div className="max-w-xl flex flex-col items-center">
              {/* Illustration */}
              <div className="relative mb-12 mt-10">
                <Image
                  src="/images/empty-menu-illustration.png"
                  alt="No menu added yet"
                  width={300}
                  height={250}
                  className="object-contain"
                  priority
                />
              </div>

              {/* Message */}
              <h2 className="text-2xl font-medium text-orange-500 mb-4">
                You don't have any menu added yet.
              </h2>
              <p>
                You're just a few clicks away from setting up and running your
                store. Start by adding different menus for your products.
              </p>

              {/* Call to Action */}
              <Button className="bg-orange-500 mt-8 hover:bg-orange-600 text-white px-8 py-6 text-lg flex items-center gap-3">
                <span className="text-2xl">+</span>
                Add a Menu
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
