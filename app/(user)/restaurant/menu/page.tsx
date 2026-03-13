"use client";

import { useEffect, useState } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Settings2,
  X,
  Trash2,
  Plus,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getAccessToken,
  getBusinessId,
} from "@/app/lib/auth";
import { toast } from "sonner";
import { refreshAccessToken } from "@/app/lib/api";

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
  if (typeof window === "undefined") {
    return new Response(JSON.stringify({ success: false }), { status: 200 });
  }

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
//  Schema & Types (unchanged)
// ────────────────────────────────────────────────

const menuItemSchema = z.object({
  name: z.string().min(1, "Menu name is required"),
  description: z.string().min(1, "Description is required"),
  costPrice: z.string().min(1, "Cost price is required"),
  sellingPrice: z.string().min(1, "Selling price is required"),
});
type MenuItemFormValues = z.infer<typeof menuItemSchema>;

interface MenuItem {
  id: number;
  name: string;
  image: string;
  description: string;
  costPrice: string;
  sellingPrice: string;
  available: boolean;
}

// ────────────────────────────────────────────────
//  Custom Modal (kept as-is from your original)
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
        className="absolute inset-0 bg-black/40 animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative w-full bg-white shadow-xl overflow-hidden rounded animate-in zoom-in-95 duration-200",
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
//  Main Component
// ────────────────────────────────────────────────

export default function MenuPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [period, setPeriod] = useState<"last30" | "last7" | "today">("last30");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSearchMobile, setShowSearchMobile] = useState(false);

  // Delete states
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<MenuItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Availability toggle loading states (per item)
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());
  const [fetchNetworkError, setFetchNetworkError] = useState<string | null>(
    null,
  );

  const formatPrice = (rawValue: string): string => {
    if (!rawValue) return "₦0.00";
    const num = parseFloat(rawValue);
    if (isNaN(num)) return "₦0.00";
    return `₦${num.toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const form = useForm<MenuItemFormValues>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      name: "",
      description: "",
      costPrice: "",
      sellingPrice: "",
    },
  });

  // Fetch menu items
  useEffect(() => {
    const fetchMenuItems = async () => {
      setLoading(true);
      setError(null);
      setFetchNetworkError(null);

      try {
        const businessId = getBusinessId();
        if (!businessId) throw new Error("Business ID not found");

        const url = `${API_BASE}/vendors/me/businesses/${businessId}/menu/items`;

        const res = await authenticatedFetch(url, {
          method: "GET",
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error(`API error: ${res.status} ${res.statusText}`);
        }

        const data = await res.json();
        const mappedItems: MenuItem[] = (data.items || data.data || []).map(
          (apiItem: any) => ({
            id: apiItem.id || apiItem.menu_item_id,
            name: apiItem.name || apiItem.item_name || "Unnamed",
            image: apiItem.imageUrl || "/images/placeholder.png",
            description: apiItem.description || "No description",
            sellingPrice: String(
              apiItem.sellingPrice || apiItem.selling_price || "0.00",
            ),
            available: apiItem.available ?? apiItem.is_available ?? true,
          }),
        );
        setItems(mappedItems);
      } catch (err: any) {
        console.error("Menu fetch failed:", err);
        if (
          err.message?.includes("fetch") ||
          err.message?.includes("Network")
        ) {
          setFetchNetworkError(
            "Unable to load menu items. Please check your internet connection.",
          );
        } else {
          const msg =
            err.message?.includes("expired") || err.message?.includes("refresh")
              ? "Your session has expired. Please sign in again."
              : "Failed to load menu items. Please try again later.";
          setError(msg);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMenuItems();
  }, [period]);

  const handleToggleAvailability = async (id: number) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    const newAvailable = !item.available;

    setTogglingIds((prev) => new Set([...prev, id]));
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, available: newAvailable } : i)),
    );

    try {
      const businessId = getBusinessId();
      if (!businessId) throw new Error("Business ID not found");
      const url = `${API_BASE}/vendors/me/businesses/${businessId}/menu/items/${id}/availability`;

      const res = await authenticatedFetch(url, {
        method: "PATCH",
        body: JSON.stringify({ isAvailable: newAvailable }),
      });

      if (!res.ok) {
        throw new Error(`Failed to update availability: ${res.status}`);
      }

      toast.success(
        `Item ${newAvailable ? "enabled" : "disabled"} successfully`,
      );
    } catch (err: any) {
      console.error("Availability toggle failed:", err);
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, available: !newAvailable } : i)),
      );
      const msg =
        err.message?.includes("expired") || err.message?.includes("refresh")
          ? "Session expired. Please sign in again."
          : "Failed to update availability. Please try again.";
      toast.error(msg);
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const confirmDelete = async () => {
    if (!deleteCandidate) return;
    const itemId = deleteCandidate.id;
    const previousItems = [...items];

    setItems((prev) => prev.filter((i) => i.id !== itemId));
    setIsDeleting(true);

    try {
      const businessId = getBusinessId();
      if (!businessId) throw new Error("Business ID not found");
      const url = `${API_BASE}/vendors/me/businesses/${businessId}/menu/items/${itemId}`;

      const res = await authenticatedFetch(url, { method: "DELETE" });

      if (!res.ok) {
        throw new Error(`Delete failed: ${res.status}`);
      }

      toast.success("Menu item deleted successfully");
      setIsDeleteDialogOpen(false);
      setDeleteCandidate(null);
    } catch (err: any) {
      console.error("Delete error:", err);
      setItems(previousItems);
      const msg =
        err.message?.includes("expired") || err.message?.includes("refresh")
          ? "Session expired. Please sign in again."
          : "Failed to delete menu item.";
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filteredItems.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const handleDeleteClick = (item: MenuItem) => {
    setDeleteCandidate(item);
    setIsDeleteDialogOpen(true);
  };

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
    } else if (currentPage > 5 && currentPage < totalPages - 4) {
      pages.push(1);
      pages.push("...");
      pages.push(currentPage - 1, currentPage, currentPage + 1);
      pages.push("...");
      pages.push(totalPages);
    } else {
      pages.push(1);
      pages.push("...");
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    }

    return pages;
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
          <RefreshCw className="h-4 w-4" />
          Refresh Page
        </Button>
      </div>
    );
  }

  if (loading) {
    return <MenuSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen p-6 md:p-8 text-red-600 flex items-center justify-center">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen p-5 md:p-8 mt-10 md:mt-0 flex flex-col">
      <div className="max-w-7xl mx-auto space-y-8 flex-1 w-full">
        <div className="flex justify-between items-center mb-8 md:mb-15">
          <h1 className="text-3xl font-bold text-gray-900">Menu</h1>
          <div className="md:flex items-center hidden gap-6">
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 w-full h-12 md:min-w-90 rounded-md"
              />
            </div>
            <Link href="/restaurant/menu/new">
              <Button className="bg-orange-500 h-12 hover:bg-orange-600 text-white rounded-md">
                New Menu
              </Button>
            </Link>
          </div>
          <div
            onClick={() => setShowSearchMobile(!showSearchMobile)}
            className={cn(
              "border border-gray-300 items-center md:hidden rounded-md p-2 w-15 h-12 text-slate-800 flex justify-center cursor-pointer",
              showSearchMobile && "bg-munchprimary text-white",
            )}
          >
            <Settings2 />
          </div>
        </div>

        {showSearchMobile && (
          <div className="flex flex-col items-center gap-3 mb-6">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 w-full h-12 md:min-w-90 rounded-md"
              />
            </div>
            <Link href="/restaurant/menu/new" className="w-full">
              <Button className="bg-orange-500 h-12 w-full hover:bg-orange-600 text-white rounded-md">
                New Menu
              </Button>
            </Link>
          </div>
        )}

        <div className="min-h-[60vh]">
          {filteredItems.length > 0 ? (
            <>
              {/* Desktop Table */}
              <Card className="border hidden shadow-none md:block border-gray-200 py-0 rounded-md">
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
                            <div className="w-16 h-16 bg-gray-100 rounded-md overflow-hidden">
                              <img
                                src={item.image}
                                alt={item.name}
                                width={100}
                                height={100}
                                className="object-cover w-full h-full"
                                crossOrigin="anonymous"
                              />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900">
                                {item.name}
                              </span>
                              <span className="text-gray-500 text-xs">
                                {item.description}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-gray-900 font-medium">
                          {formatPrice(item.sellingPrice)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={item.available}
                            onCheckedChange={() =>
                              handleToggleAvailability(item.id)
                            }
                            disabled={togglingIds.has(item.id)}
                            className={cn(
                              item.available &&
                                "data-[state=checked]:bg-orange-500",
                              togglingIds.has(item.id) &&
                                "opacity-60 cursor-wait",
                            )}
                          />
                        </TableCell>
                        <TableCell className="text-right pe-2 gap-2">
                          <div className="flex items-center justify-end">
                            <Link href={`/restaurant/menu/${item.id}`}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="hover:bg-gray-100 rounded-md"
                              >
                                <Image
                                  src="/images/Edit.svg"
                                  alt="Edit"
                                  width={33}
                                  height={33}
                                />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="hover:bg-red-50 text-red-600 hover:text-red-700 rounded-md"
                              onClick={() => handleDeleteClick(item)}
                            >
                              <Trash2 className="h-5 w-5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>

              {/* Mobile Cards */}
              <div className="md:hidden">
                <Card className="border border-gray-200 rounded-md shadow-sm py-1">
                  <div className="p-4">
                    {paginatedItems.map((item, index) => (
                      <div
                        key={item.id}
                        className={cn(
                          "mb-4 pb-4 border-b flex gap-2 justify-between border-gray-200",
                          index === paginatedItems.length - 1 &&
                            "mb-0 pb-0 border-0",
                        )}
                      >
                        <div className="flex items-center gap-2 mb-2 flex-1">
                          <div className="w-18 h-18 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                            <img
                              src={item.image}
                              alt={item.name}
                              width={64}
                              height={64}
                              className="object-cover w-full h-full"
                              crossOrigin="anonymous"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="font-medium text-gray-900 text-sm block">
                              {item.name}
                            </span>
                            <span className="text-gray-500 text-xs block">
                              {item.description}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-3 items-end flex-shrink-0">
                          <span className="text-center text-gray-900 font-medium text-sm">
                            {formatPrice(item.sellingPrice)}
                          </span>
                          <Switch
                            checked={item.available}
                            onCheckedChange={() =>
                              handleToggleAvailability(item.id)
                            }
                            disabled={togglingIds.has(item.id)}
                            className={cn(
                              item.available &&
                                "data-[state=checked]:bg-orange-500",
                              togglingIds.has(item.id) &&
                                "opacity-60 cursor-wait",
                            )}
                          />
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="hover:bg-gray-100 h-8 w-8 p-0 rounded-md"
                            >
                              <Image
                                src="/images/Edit.svg"
                                alt="Edit"
                                width={30}
                                height={30}
                              />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="hover:bg-red-50 h-8 w-8 p-0 text-red-600 rounded-md"
                              onClick={() => handleDeleteClick(item)}
                            >
                              <Trash2 className="h-5 w-5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-6">
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
                  : "You don't have any menu added yet."}
              </h2>
              <p className="text-center text-gray-600 max-w-md">
                {searchTerm
                  ? `Your search for "${searchTerm}" does not match any items in your menu. Try a different keyword.`
                  : "You're just a few clicks away from setting up and running your store. Start by adding different menus."}
              </p>
              {!searchTerm && (
                <Link href={"/restaurant/menu/new"}>
                  <Button className="bg-munchprimary mt-8 hover:bg-munchprimaryDark text-white px-8 py-6 flex items-center justify-center gap-1 rounded-md">
                    <Plus strokeWidth={3} />
                    <span>Add a menu</span>
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>

        {filteredItems.length > 0 && (
          <div className="flex items-center justify-center mx-2 gap-5 text-sm py-8 border-t border-gray-100">
            <p className="text-gray-600 hidden md:block">
              Total <span>{filteredItems.length}</span> items
            </p>
            <div className="flex items-center gap-2 md:gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="hover:bg-gray-100 disabled:opacity-50 rounded-md"
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
                          "min-w-8 md:min-w-10 rounded-md",
                          currentPage === page &&
                            "border border-orange-500 text-munchprimary bg-white hover:bg-white",
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
                className="hover:bg-gray-100 disabled:opacity-50 rounded-md"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>

              <Select
                value={`${itemsPerPage}`}
                onValueChange={handleItemsPerPageChange}
              >
                <SelectTrigger className="w-32 bg-white border-gray-300 hidden md:flex rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  <SelectItem value="10">10 / page</SelectItem>
                  <SelectItem value="20">20 / page</SelectItem>
                  <SelectItem value="50">50 / page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      <CustomModal
        isOpen={isDeleteDialogOpen && !!deleteCandidate}
        onClose={() => setIsDeleteDialogOpen(false)}
        title="Confirm Deletion"
        maxWidth="sm:max-w-[450px]"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
              className="rounded-md"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
              className="rounded-md"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Are you sure you want to delete{" "}
            <strong>{deleteCandidate?.name}</strong>? This action cannot be
            undone.
          </p>
        </div>
      </CustomModal>
    </div>
  );
}

const MenuSkeleton = () => {
  return (
    <div className="min-h-screen p-6 md:p-8 mt-10 md:mt-0 max-w-7xl mx-auto space-y-8">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center mb-8 md:mb-15">
        <div className="h-10 w-32 bg-gray-200 animate-pulse rounded-md" />
        <div className="hidden md:flex gap-6">
          <div className="h-12 w-90 bg-gray-100 animate-pulse rounded-md" />
          <div className="h-12 w-32 bg-gray-200 animate-pulse rounded-md" />
        </div>
      </div>

      {/* Table Skeleton (Desktop) */}
      <div className="hidden md:block border border-gray-200 rounded-md overflow-hidden">
        <div className="h-12 bg-gray-50 border-b border-gray-200" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex items-center p-4 border-b border-gray-200 gap-4"
          >
            <div className="w-20 h-16 bg-gray-100 animate-pulse rounded-md" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-gray-200 animate-pulse rounded-md" />
              <div className="h-3 w-full bg-gray-100 animate-pulse rounded-md" />
            </div>
            <div className="h-4 w-20 bg-gray-200 animate-pulse rounded-md mx-auto" />
            <div className="h-8 w-12 bg-gray-100 animate-pulse rounded-md mx-auto" />
            <div className="h-8 w-20 bg-gray-100 animate-pulse rounded-md" />
          </div>
        ))}
      </div>

      {/* Card Skeleton (Mobile) */}
      <div className="md:hidden space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-4 border border-gray-200 rounded-md space-y-4"
          >
            <div className="flex gap-4">
              <div className="w-20 h-16 bg-gray-100 animate-pulse rounded-md" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-gray-200 animate-pulse rounded-md" />
                <div className="h-3 w-full bg-gray-100 animate-pulse rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
