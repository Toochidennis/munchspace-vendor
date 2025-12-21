"use client";

import { useEffect, useState } from "react";
import { Search, ChevronLeft, ChevronRight, Settings2 } from "lucide-react";

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
  const [showSearchMobile, setShowSearchMobile] = useState(false);

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
    <div className="min-h-screen p-6 md:p-8 mt-10 md:mt-0">
      {mockData.last30.items.length > 0 ? (
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex justify-between items-center mb-8 md:mb-15">
            <h1 className="text-3xl font-bold text-gray-900">Menu</h1>
            {/* Search and Period Filter */}
            <div className="md:flex items-center hidden  gap-6">
              <div className="relative flex-1 max-w-lg">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10 w-full h-12 md:min-w-90"
                />
              </div>
              <Link href="/restaurant/menu/new">
                <Button className="bg-orange-500 h-12 hover:bg-orange-600 text-white">
                  New Menu
                </Button>
              </Link>
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
                  placeholder="Search"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10 w-full h-12 md:min-w-90"
                />
              </div>
              <Link href="/restaurant/menu/new" className="w-full">
                <Button className="bg-orange-500 h-12 w-full hover:bg-orange-600 text-white">
                  New Menu
                </Button>
              </Link>
            </div>
          )}

          {/* Table - Desktop Version */}
          <Card className="border hidden md:block border-gray-200 py-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead
                    className="text-gray-700 ps-4"
                    style={{ paddingTop: "15px", paddingBottom: "15px" }}
                  >
                    Item
                  </TableHead>
                  <TableHead
                    className="text-gray-700 text-center"
                    style={{ paddingTop: "15px", paddingBottom: "15px" }}
                  >
                    Cost Price
                  </TableHead>
                  <TableHead
                    className="text-gray-700 text-center"
                    style={{ paddingTop: "15px", paddingBottom: "15px" }}
                  >
                    Selling Price
                  </TableHead>
                  <TableHead
                    className="text-gray-700 text-center"
                    style={{ paddingTop: "15px", paddingBottom: "15px" }}
                  >
                    Availability
                  </TableHead>
                  <TableHead
                    className="text-gray-700 text-right pe-4"
                    style={{ paddingTop: "15px", paddingBottom: "15px" }}
                  >
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
                    <TableCell className="py-4 ps-4">
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
                        <div className="flex flex-col max-w-40">
                          <span className="font-medium text-gray-900">
                            {item.name}
                          </span>
                          <span className="text-gray-500 text-xs">
                            {item.description}
                          </span>
                        </div>
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
                    <TableCell className="text-right pe-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-gray-100"
                      >
                        <Image
                          src="/images/Edit.svg"
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

          {/* Table - Mobile Version */}
          <div className="md:hidden">
            <Card className="border border-gray-200 rounded-lg shadow-sm py-1">
              <div className="p-4">
                {paginatedItems.map((item, index) => (
                  <div
                    key={item.id}
                    className={cn(
                      "mb-4 pb-4 border-b flex gap-2 justify-between border-gray-200",
                      index === paginatedItems.length - 1 && "mb-0 pb-0 border-0")}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-29 h-16 bg-gray-100 rounded-lg overflow-hidden">
                        <Image
                          src={item.image}
                          alt={item.name}
                          width={64}
                          height={64}
                          className="object-cover w-full h-full"
                        />
                      </div>
                      <div>
                        <span className="font-medium text-gray-900 text-sm">
                          {item.name}
                        </span>
                        <span className="text-gray-500 text-xs block">
                          {item.description}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 items-end">
                      <span className="text-center text-gray-900 font-medium">
                        {item.sellingPrice}
                      </span>
                      <Switch
                        checked={item.available}
                        onCheckedChange={() =>
                          handleToggleAvailability(item.id)
                        }
                        className={cn(
                          item.available && "data-[state=checked]:bg-orange-500"
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Pagination */}
          {paginatedItems.length > 0 && (
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
