"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  BatteryLow,
  Camera,
  MoveLeft,
  Search,
  Wifi,
  Workflow,
  Loader2,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getAccessToken, getBusinessId } from "@/app/lib/auth";
import { refreshAccessToken } from "@/app/lib/api";
import { cn } from "@/lib/utils";

// ────────────────────────────────────────────────
//  Authenticated fetch helpers
// ────────────────────────────────────────────────
const API_BASE = "https://dev.api.munchspace.io/api/v1";

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
    "x-api-key":
      "eH4u8eujRzIrLWE+xkqyUWg33ggZ1Ts5bAKi/Ze5l23dyc7aLZSVMEssML0vUvDHrhchMtyskMxzGW3c4jhQCA==",
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

type MenuItem = {
  id: string;
  name: string;
  description: string;
  image: string;
  price: number;
  finalPrice: number;
  hasDiscount: boolean;
  isSoldOut: boolean;
  quantityInStock: number;
};

type MenuGroup = {
  groupId: string | null;
  groupName: string;
  items: MenuItem[];
};

type BusinessPreview = {
  business: {
    id: string;
    displayName: string;
    coverImage: string | null;
    rating: number;
    totalOrders: number;
    openingTime: string;
    etaMinutes: number;
    deliveryFee: number;
  };
  menu: MenuGroup[];
};

export default function StorePreview() {
  const [storeName, setStoreName] = useState("");
  const [storeImage, setStoreImage] = useState<string | null>(null);
  const [nameError, setNameError] = useState("");
  const [imageError, setImageError] = useState("");
  const [previewData, setPreviewData] = useState<BusinessPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");

  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingImage, setIsSavingImage] = useState(false);

  // Fetch preview data on mount
  useEffect(() => {
    const fetchPreview = async () => {
      const businessId = getBusinessId();
      if (!businessId) {
        toast.error("Business ID not found");
        setLoading(false);
        return;
      }

      try {
        const url = `${API_BASE}/vendors/me/businesses/${businessId}/preview`;
        const res = await authenticatedFetch(url);

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        if (!json.success || !json.data) throw new Error("Invalid response");

        setPreviewData(json.data);

        // Initialize local state with server values
        setStoreName(json.data.business.displayName || "");
        setStoreImage(json.data.business.coverImage || null);
      } catch (err: any) {
        toast.error("Failed to load store preview", {
          description: err.message || "An unexpected error occurred.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, []);

  const refreshPreview = async () => {
    const businessId = getBusinessId();
    if (!businessId) return;

    try {
      const url = `${API_BASE}/vendors/me/businesses/${businessId}/preview`;
      const res = await authenticatedFetch(url);
      if (!res.ok) return;

      const json = await res.json();
      if (json.success && json.data) {
        setPreviewData(json.data);
        // Update local preview fields only if not currently editing
        if (!isSavingName) setStoreName(json.data.business.displayName || "");
        if (!isSavingImage)
          setStoreImage(json.data.business.coverImage || null);
      }
    } catch (err) {
      // silent fail - don't interrupt user
    }
  };

  const saveStoreName = async () => {
    if (storeName.trim().length < 3) {
      setNameError("Store name must be at least 3 characters long.");
      return;
    }

    setNameError("");

    const businessId = getBusinessId();
    if (!businessId) return toast.error("Business ID not found");

    setIsSavingName(true);
    try {
      const formData = new FormData();
      formData.append("displayName", storeName.trim());

      const res = await authenticatedFetch(
        `${API_BASE}/vendors/me/businesses/${businessId}/preview`,
        { method: "PATCH", body: formData },
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${res.status}`);
      }

      toast.success("Store name updated successfully");
      await refreshPreview(); // ← reflect real saved value
    } catch (err: any) {
      toast.error("Failed to update store name", {
        description: err.message || "Please try again.",
      });
    } finally {
      setIsSavingName(false);
    }
  };

  const saveStoreImage = async () => {
    if (!storeImage || !storeImage.startsWith("data:")) {
      setImageError("Please select a new store image.");
      return;
    }

    setImageError("");

    const businessId = getBusinessId();
    if (!businessId) return toast.error("Business ID not found");

    setIsSavingImage(true);
    try {
      const blob = await fetch(storeImage).then((r) => r.blob());
      const file = new File([blob], "cover.jpg", { type: "image/jpeg" });

      const formData = new FormData();
      formData.append("displayName", storeName.trim()); // required by API
      formData.append("coverImage", file);

      const res = await authenticatedFetch(
        `${API_BASE}/vendors/me/businesses/${businessId}/preview`,
        { method: "PATCH", body: formData },
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${res.status}`);
      }

      toast.success("Store image updated successfully");
      await refreshPreview(); // ← reflect real saved value + new URL
    } catch (err: any) {
      toast.error("Failed to update store image", {
        description: err.message || "Please try again.",
      });
    } finally {
      setIsSavingImage(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setStoreImage(reader.result as string);
        setImageError("");
      };
      reader.readAsDataURL(file);
    }
  };

  // Filter items based on selected tab
  const displayedItems =
    previewData?.menu.find((g) => g.groupName === activeTab)?.items || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-pulse">
            {/* Left side - Form skeleton */}
            <div className="space-y-8">
              <div className="space-y-3">
                <div className="h-10 w-64 bg-gray-200 rounded" />
                <div className="h-5 w-80 bg-gray-200 rounded" />
              </div>

              <div className="space-y-4">
                <div className="h-6 w-40 bg-gray-200 rounded" />
                <div className="flex gap-4">
                  <div className="h-10 flex-1 bg-gray-200 rounded" />
                  <div className="h-10 w-24 bg-gray-200 rounded" />
                </div>
                <div className="h-5 w-72 bg-gray-200 rounded" />
              </div>

              <div className="space-y-4">
                <div className="h-6 w-40 bg-gray-200 rounded" />
                <div className="h-64 w-full bg-gray-200 rounded-lg" />
                <div className="h-5 w-48 bg-gray-200 rounded ml-auto" />
              </div>
            </div>

            {/* Right side - Phone preview skeleton */}
            <div className="flex items-center justify-center">
              <div className="relative w-[400px] h-[800px]">
                <div className="absolute inset-0 top-12 bottom-12 left-6 right-6 rounded-3xl bg-gray-100 overflow-hidden">
                  {/* Status bar */}
                  <div className="h-10 bg-white px-4 flex justify-between items-center">
                    <div className="h-5 w-12 bg-gray-200 rounded" />
                    <div className="flex gap-3">
                      <div className="h-5 w-5 bg-gray-200 rounded-full" />
                      <div className="h-5 w-5 bg-gray-200 rounded-full" />
                      <div className="h-5 w-5 bg-gray-200 rounded-full" />
                    </div>
                  </div>

                  {/* Header */}
                  <div className="h-14 bg-white px-4 flex justify-between items-center">
                    <div className="h-8 w-8 bg-gray-200 rounded-full" />
                    <div className="h-7 w-40 bg-gray-200 rounded" />
                    <div className="h-8 w-8 bg-gray-200 rounded-full" />
                  </div>

                  {/* Cover image area */}
                  <div className="h-40 bg-gray-200" />

                  {/* Info */}
                  <div className="px-4 py-3 space-y-3">
                    <div className="flex gap-4">
                      <div className="h-5 w-32 bg-gray-200 rounded" />
                      <div className="h-5 w-40 bg-gray-200 rounded" />
                    </div>
                    <div className="h-5 w-56 bg-gray-200 rounded" />
                  </div>

                  {/* Tabs */}
                  <div className="px-4 py-3 flex gap-4 border-b border-gray-200">
                    <div className="h-8 w-16 bg-gray-200 rounded-full" />
                    <div className="h-8 w-20 bg-gray-200 rounded-full" />
                    <div className="h-8 w-20 bg-gray-200 rounded-full" />
                  </div>

                  {/* Menu items */}
                  <div className="p-4 space-y-6">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="w-24 h-24 bg-gray-200 rounded-xl" />
                        <div className="flex-1 space-y-3">
                          <div className="h-6 w-48 bg-gray-200 rounded" />
                          <div className="h-4 w-40 bg-gray-200 rounded" />
                          <div className="flex justify-between">
                            <div className="h-6 w-20 bg-gray-200 rounded" />
                            <div className="h-8 w-8 bg-gray-200 rounded-full" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Side - Form */}
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Store Personalization
              </h1>
              <p className="text-gray-600">
                Customize how your store appears to customers.
              </p>
            </div>

            {/* Store Name */}
            <div className="space-y-2">
              <Label className="text-lg">
                Store Name <span className="text-red-600">*</span>
              </Label>
              <div className="flex gap-4">
                <Input
                  placeholder="Enter your store name"
                  value={storeName}
                  onChange={(e) => {
                    setStoreName(e.target.value);
                    setNameError("");
                  }}
                  className="h-10 text-lg"
                />
                <Button
                  onClick={saveStoreName}
                  disabled={isSavingName}
                  className="bg-munchprimary text-white hover:bg-munchprimaryDark px-8 h-10 w-23"
                >
                  {isSavingName ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
              {nameError && (
                <p className="text-red-600 text-sm mt-2">{nameError}</p>
              )}
            </div>

            {/* Store Image */}
            <div className="space-y-2">
              <Label className="text-lg">
                Store Image <span className="text-red-600">*</span>
              </Label>
              <label className="block cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <div className="relative rounded-lg overflow-hidden bg-gray-900 h-64 flex items-center justify-center hover:opacity-90 transition">
                  {storeImage ? (
                    <img
                      src={storeImage}
                      alt="Store preview"
                      crossOrigin="anonymous"
                      className="object-cover w-full h-full object-center"
                    />
                  ) : (
                    <div className="text-center text-white">
                      <Camera className="h-12 w-12 mx-auto mb-4" />
                      <p className="text-lg">
                        Select an image from your media gallery
                      </p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                    <Camera className="h-16 w-16 text-white" />
                  </div>
                </div>
              </label>
              {imageError && (
                <p className="text-red-600 text-sm mt-2">{imageError}</p>
              )}
              <div className="flex justify-end mt-4">
                <Button
                  onClick={saveStoreImage}
                  disabled={isSavingImage}
                  className="bg-munchprimary text-white hover:bg-munchprimaryDark px-8 h-10 w-23"
                >
                  {isSavingImage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Right Side - Mobile Preview */}
          <div className="flex items-center justify-center">
            <div className="relative">
              <Image
                src={"/images/iPhone16.png"}
                alt="iPhone frame"
                width={400}
                height={800}
                className="relative z-20"
              />

              <div className="absolute inset-0 top-12 bottom-12 left-6 right-6 rounded-3xl overflow-hidden bg-white">
                {/* Status Bar */}
                <div className="bg-white px-2 py-3 flex justify-between items-center">
                  <span className="text-sm font-medium">9:41</span>
                  <div className="flex gap-2">
                    <Workflow className="w-4 h-4" strokeWidth={3} />
                    <Wifi className="w-4 h-4" strokeWidth={3} />
                    <BatteryLow className="w-4 h-4" strokeWidth={3} />
                  </div>
                </div>

                <div className="flex justify-between items-center mb-3 my-1 px-3">
                  <div className="bg-orange-100 rounded-full p-2">
                    <MoveLeft className="w-4 h-4" />
                  </div>
                  <h1 className="font-bold">
                    {storeName || "Your Store Name"} {/* ← live name preview */}
                  </h1>
                  <div className="bg-orange-100 rounded-full p-2">
                    <Search className="w-4 h-4" />
                  </div>
                </div>

                {/* Store Cover – live image preview */}
                <div className="relative h-38 overflow-hidden">
                  {storeImage || previewData?.business.coverImage ? (
                    <img
                      src={storeImage || previewData?.business.coverImage || ""}
                      alt="Store banner"
                      className="object-cover w-full h-full object-center"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div className="bg-gray-200 h-full flex items-center justify-center">
                      <p className="text-gray-500">Store Banner</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>

                <div className="px-4 text-xs">
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-yellow-400">
                      ★ {previewData?.business.rating.toFixed(1) || "—"} (
                      {previewData?.business.totalOrders || 0} orders)
                    </span>
                    <span>
                      Opens until {previewData?.business.openingTime || "—"}
                    </span>
                  </div>
                  <p className="text-xs mt-3">
                    {previewData?.business.etaMinutes || 17}–
                    {previewData?.business.etaMinutes
                      ? previewData.business.etaMinutes + 10
                      : 25}{" "}
                    min prep time • ₦
                    {(
                      (previewData?.business.deliveryFee ?? 80000) / 100
                    ).toLocaleString()}{" "}
                    delivery fee
                  </p>
                </div>

                {/* Fixed three tabs: All, Meals, Drinks */}
                <div className="flex gap-4 px-4 py-3 border-b border-gray-200">
                  {["All", "Meals", "Drinks"].map((tab) => (
                    <Button
                      key={tab}
                      variant={activeTab === tab ? "secondary" : "ghost"}
                      size="sm"
                      className={cn(
                        "rounded-full whitespace-nowrap",
                        activeTab === tab && "bg-munchprimary text-white",
                      )}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab}
                    </Button>
                  ))}
                </div>

                {/* Filtered Menu Items */}
                <div className="p-4 space-y-4">
                  {displayedItems.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">
                      No items available in this category
                    </p>
                  ) : (
                    displayedItems.slice(0, 6).map((item) => (
                      <div
                        key={item.id}
                        className="flex gap-4 pb-4 border-b border-gray-100 last:border-0"
                      >
                        <div className="bg-gray-200 border-2 border-dashed rounded-xl w-24 h-24 shrink-0 overflow-hidden relative">
                          <img
                            src={item.image}
                            alt={item.name}
                            crossOrigin="anonymous"
                            className="object-cover w-full h-full object-center"
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">{item.name}</h3>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {item.description}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-lg">
                                ₦{item.finalPrice.toLocaleString()}
                              </span>
                              {item.hasDiscount &&
                                item.finalPrice < item.price && (
                                  <span className="text-sm text-gray-500 line-through">
                                    ₦{item.price.toLocaleString()}
                                  </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                              {item.isSoldOut ? (
                                <span className="text-red-600 text-xs font-medium">
                                  Sold Out
                                </span>
                              ) : (
                                <Button
                                  size="sm"
                                  className="rounded-full bg-munchprimary hover:bg-munchprimaryDark text-white w-8 h-8"
                                >
                                  +
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
