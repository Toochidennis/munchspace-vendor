"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { toast } from "sonner";
import { getAccessToken, getBusinessId } from "@/app/lib/auth";
import { refreshAccessToken } from "@/app/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ────────────────────────────────────────────────
//  Constants
// ────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_BASE_URL || "";
const API_KEY = process.env.NEXT_PUBLIC_MUNCHSPACE_API_KEY || "";

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

// Helper function to format date in natural words (e.g., "March 23, 2026")
const formatDateInWords = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// ────────────────────────────────────────────────
//  Component
// ────────────────────────────────────────────────

export default function OrderDetailsPage() {
  const params = useParams<{ slug: string }>();
  const orderId = params?.slug;
  const router = useRouter();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fetchNetworkError, setFetchNetworkError] = useState<string | null>(
    null,
  );

  // Status update modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusUpdate = async () => {
    if (!order || !newStatus) return;

    setIsUpdating(true);
    try {
      const BUSINESS_ID = getBusinessId();
      const currentOrderId = order.orderId;

      let endpoint = "";
      switch (newStatus.toLowerCase()) {
        case "confirm":
        case "pending":
          endpoint = `${API_BASE}/vendors/me/businesses/${BUSINESS_ID}/orders/${currentOrderId}/confirm`;
          break;
        case "ready":
          endpoint = `${API_BASE}/vendors/me/businesses/${BUSINESS_ID}/orders/${currentOrderId}/ready-for-pickup`;
          break;
        case "reject":
          endpoint = `${API_BASE}/vendors/me/businesses/${BUSINESS_ID}/orders/${currentOrderId}/reject`;
          break;
        case "cancel":
        case "cancelled":
          endpoint = `${API_BASE}/vendors/me/businesses/${BUSINESS_ID}/orders/${currentOrderId}/cancel`;
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

  useEffect(() => {
    const BUSINESS_ID = getBusinessId();
    if (!orderId || !BUSINESS_ID) return;

    const fetchOrder = async () => {
      setLoading(true);
      setFetchNetworkError(null);

      try {
        const url = `${API_BASE}/vendors/me/businesses/${BUSINESS_ID}/orders/${orderId}`;
        const response = await authenticatedFetch(url);

        if (!response.ok) {
          throw new Error(`Failed to fetch order: ${response.status}`);
        }

        const json = await response.json();

        if (!json.success || !json.data) {
          throw new Error("Invalid response format");
        }

        setOrder(json.data);
      } catch (err: any) {
        console.error("Order fetch error:", err);
        if (
          err.message?.includes("fetch") ||
          err.message?.includes("Network")
        ) {
          setFetchNetworkError(
            "Unable to load order details. Please check your internet connection.",
          );
        } else {
          toast.error("Failed to load order details", {
            description: err.message || "Please try again later.",
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

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

  // ====================== LOADING SKELETON ======================
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center p-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-5 w-full mt-14 md:mt-0 max-w-3xl">
          <span>Orders</span>
          <span>/</span>
          <span className="text-gray-900 font-medium">...</span>
        </div>

        <Card className="w-full max-w-3xl bg-white rounded-2xl pb-0 gap-0 animate-pulse">
          <CardHeader className="pb-4 mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-200 rounded-lg" />
              <div className="space-y-2 flex-1">
                <div className="h-5 w-20 bg-gray-200 rounded" />
                <div className="h-8 w-56 bg-gray-200 rounded" />
                <div className="h-4 w-48 bg-gray-200 rounded" />
              </div>
            </div>
          </CardHeader>

          <div className="mb-4">
            <div className="px-6 bg-gray-50 h-12 flex items-center">
              <div className="h-5 w-48 bg-gray-200 rounded" />
            </div>
            <div className="px-6 pt-6 pb-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-24 bg-gray-200 rounded" />
                    <div className="h-5 w-36 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Separator className="mb-4" />

          <div className="p-6 mb-4 space-y-6">
            <div className="h-7 w-40 bg-gray-200 rounded" />
            <div className="h-5 w-56 bg-gray-200 rounded" />
            <div className="space-y-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <div className="h-5 w-64 bg-gray-200 rounded" />
                  </div>
                  <div className="h-5 w-24 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          </div>

          <hr className="border-dashed" />

          <div className="p-6 bg-gray-50 py-9 space-y-6">
            <div className="h-7 w-32 bg-gray-200 rounded" />
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-5 w-40 bg-gray-200 rounded" />
                  <div className="h-5 w-28 bg-gray-200 rounded" />
                </div>
              ))}
              <div className="h-px bg-gray-200 my-3" />
              <div className="flex justify-between">
                <div className="h-6 w-40 bg-gray-200 rounded" />
                <div className="h-6 w-32 bg-gray-200 rounded" />
              </div>
            </div>
          </div>

          <div className="rounded-b-3xl px-6 py-6 flex justify-between items-center border-t">
            <div className="h-10 w-32 bg-gray-200 rounded" />
            <div className="h-10 w-32 bg-gray-200 rounded" />
          </div>
        </Card>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center p-6">
        <div className="w-full max-w-3xl text-center py-20 text-gray-500">
          Order not found
        </div>
      </div>
    );
  }

  const costSummary = order.costSummary || [];
  const previousOrderId = order.previousOrderId;
  const nextOrderId = order.nextOrderId;

  const displayData = {
    id: order.orderCode,
    status: order.status.replace(/_/g, " "),
    orderedDateInWords: formatDateInWords(order.placedAt), // ← Changed to words
    orderDate: new Date(order.placedAt).toLocaleString(),
    totalPrice: `₦${order.totals.total.toLocaleString()}`,
    paymentOption: order.payment?.channel || "N/A",
    orderChannel: order.orderChannel || "N/A",
    processedBy: order.processedBy || "N/A",
    customerName: order.customer?.name || "N/A",
    itemsCount: order.items.length,
    items: order.items.map((item: any) => ({
      quantity: `${item.quantity}x`,
      name: item.name,
      price: `₦${item.total.toLocaleString()}`,
      image: item.imageUrl,
    })),
    image: order.items[0]?.imageUrl || "/images/foods/egusi.png",
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-5 w-full mt-14 md:mt-0 max-w-3xl">
        <Link href="/restaurant/orders">Orders</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{displayData.id}</span>
      </div>

      <Card className="w-full max-w-3xl bg-white rounded-2xl pb-0 gap-0">
        {/* Header */}
        <CardHeader className="pb-4 mb-4">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden shrink-0">
                <img
                  src={displayData.image}
                  alt="Order item"
                  width={64}
                  height={64}
                  className="object-cover"
                  crossOrigin="anonymous"
                />
              </div>
              <div className="flex-1 min-w-0">
                <Badge
                  className={cn(
                    "rounded px-4 py-1 mb-1",
                    order.status.toLowerCase().includes("ready") &&
                      "bg-purple-100 text-purple-700 border border-purple-200",
                    order.status.toLowerCase().includes("complete") &&
                      "bg-green-100 text-green-500 border border-green-200",
                    order.status.toLowerCase().includes("pending") &&
                      "bg-blue-100 text-blue-500 border border-blue-200",
                    (order.status.toLowerCase().includes("cancel") ||
                      order.status.toLowerCase().includes("return")) &&
                      "bg-red-100 text-red-400 border border-red-200",
                    order.status.toLowerCase().includes("reject") &&
                      "bg-red-100 text-red-700 border border-red-200",
                    order.status.toLowerCase().includes("out_for_delivery") &&
                      "bg-teal-100 text-teal-700 border border-teal-200",
                    order.status.toLowerCase().includes("prepar") &&
                      "bg-yellow-100 text-yellow-700 border border-yellow-200",
                  )}
                >
                  {displayData.status}
                </Badge>
                <h2 className="text-xl font-bold text-gray-900">
                  Order {displayData.id}
                </h2>
                <p className="text-sm text-gray-500">
                  Ordered on {displayData.orderedDateInWords}
                </p>
              </div>
            </div>
            {!order.status.toLowerCase().includes("cancel") &&
              !order.status.toLowerCase().includes("completed") &&
              !order.status.toLowerCase().includes("out_for_delivery") &&
              !order.status.toLowerCase().includes("rejected") && (
                <Button
                  onClick={() => setIsModalOpen(true)}
                  variant="outline"
                  className="text-gray-900 rounded-md whitespace-nowrap shrink-0 h-10"
                >
                  Mark Order as...
                </Button>
              )}
          </div>
        </CardHeader>

        {/* Order Information Accordion */}
        <Accordion
          className="mb-4"
          type="single"
          collapsible
          defaultValue="item-1"
        >
          <AccordionItem value="item-1">
            <AccordionTrigger className="px-6 bg-gray-50 rounded-none mb-2">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Order Information
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="grid grid-cols-2 gap-6 text-sm">
                <div>
                  <p className="text-gray-500">Order Date</p>
                  <p className="font-medium text-gray-900">
                    {displayData.orderDate}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Total Price</p>
                  <p className="font-medium text-gray-900">
                    {displayData.totalPrice}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Payment Option</p>
                  <p className="font-medium text-gray-900">
                    {displayData.paymentOption}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Order Channel</p>
                  <p className="font-medium text-gray-900">
                    {displayData.orderChannel}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Processed By</p>
                  <p className="font-medium text-gray-900">
                    {displayData.processedBy}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Customer's Name</p>
                  <p className="font-medium text-gray-900">
                    {displayData.customerName}
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <Separator className="mb-4" />

        {/* Customer's Order */}
        <div className="p-6 mb-4">
          <h3 className="text-lg font-semibold text-orange-600 mb-4">
            Customer's Order
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            {displayData.itemsCount} product
            {displayData.itemsCount !== 1 ? "s" : ""} from Store
          </p>
          <div className="space-y-4">
            {displayData.items.map((item: any, index: number) => (
              <div key={index} className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-gray-900">
                    {item.quantity} {item.name}
                  </p>
                </div>
                <p className="font-medium text-gray-900">{item.price}</p>
              </div>
            ))}
          </div>
        </div>

        <hr className="border-dashed" />

        {/* Dynamic Summary */}
        <div className="p-6 bg-gray-50 py-9">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Summary</h3>
          <div className="space-y-3 text-sm">
            {costSummary.map(
              (item: { label: string; amount: number }, index: number) => (
                <div key={index} className="flex justify-between">
                  <span className="text-gray-600">{item.label}:</span>
                  <span className="font-medium text-gray-900">
                    ₦{item.amount.toLocaleString()}
                  </span>
                </div>
              ),
            )}

            <Separator className="my-2" />

            <div className="flex justify-between text-base font-bold">
              <span className="text-gray-900">Estimated total:</span>
              <span className="text-gray-900">
                ₦{order.totals.total.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="rounded-b-3xl px-6 py-6 flex justify-between items-center border-t">
          <Button
            variant="outline"
            className="gap-2"
            disabled={!previousOrderId}
            onClick={() =>
              previousOrderId &&
              router.push(`/restaurant/orders/${previousOrderId}`)
            }
          >
            <ChevronLeft className="h-4 w-4" />
            Prev Order
          </Button>

          <Button
            variant="outline"
            className="gap-2"
            disabled={!nextOrderId}
            onClick={() =>
              nextOrderId && router.push(`/restaurant/orders/${nextOrderId}`)
            }
          >
            Next Order
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Status Update Modal */}
      <CustomModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setNewStatus("");
        }}
        title="Mark order as ..."
        maxWidth="sm:max-w-md"
        footer={
          <>
            <Button
              variant="outline"
              className="rounded-md"
              onClick={() => {
                setIsModalOpen(false);
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
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Select New Status
            </label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger className="rounded-md h-12! w-full mt-2">
                <SelectValue placeholder="Choose a status" />
              </SelectTrigger>
              <SelectContent className="rounded-md">
                {order && order.status.toLowerCase().includes("pending") && (
                  <SelectItem value="confirm">Confirm</SelectItem>
                )}
                {order && order.status.toLowerCase().includes("preparing") && (
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
