"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import {
  Camera,
  Plus,
  Trash2,
  CalendarIcon,
  ArrowLeft,
  Loader2,
  AlertCircle,
  RefreshCw,
  FileText,
  Package,
  Zap,
  Tag,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import {
  useForm,
  useFieldArray,
  Controller,
  SubmitHandler,
  Control,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { getAccessToken, getBusinessId, logout } from "@/app/lib/auth";
import { refreshAccessToken } from "@/app/lib/api";

// ────────────────────────────────────────────────
//  Constants from .env
// ────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_BASE_URL || "";
const API_KEY = process.env.NEXT_PUBLIC_MUNCHSPACE_API_KEY || "";

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
    if (!refreshOk) {
      await logout();
      throw new Error("Session expired");
    }
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
    if (!refreshOk) {
      await logout();
      throw new Error("Session expired");
    }
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
//  Schema & Types
// ────────────────────────────────────────────────

const tabOrder = ["details", "sizes", "extras", "discounts"] as const;

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  image: z.string().min(1, "Please upload an image"),
  categoryTypeId: z.string().min(1, "Category is required"),
  sellingPrice: z
    .number("Selling price is required")
    .min(1, "Selling price must be at least 1")
    .positive("Selling price must be greater than 0"),
  quantityInStock: z
    .number("Quantity in stock is required")
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1"),
  isAvailable: z.enum(["available", "unavailable"]),

  variants: z
    .array(
      z.object({
        name: z.string().min(1, "Size name is required"),
        description: z.string().optional(),
        price: z
          .string()
          .min(1, "Price is required")
          .refine((val) => !isNaN(Number(val)) && Number(val) >= 1, {
            message: "Price must be at least 1",
          }),
      }),
    )
    .optional()
    .refine(
      (variants) => {
        if (!variants || variants.length === 0) return true;
        return variants.every((v) => v.name.trim() && v.price.trim());
      },
      {
        message: "All added variants must have a name and valid price",
        path: [],
      },
    ),

  addons: z
    .array(
      z.object({
        name: z.string().min(1, "Addon name is required"),
        description: z.string().optional(),
        price: z
          .string()
          .min(1, "Price is required")
          .refine((val) => !isNaN(Number(val)) && Number(val) >= 1, {
            message: "Price must be at least 1",
          }),
      }),
    )
    .optional()
    .refine(
      (addons) => {
        if (!addons || addons.length === 0) return true;
        return addons.every((a) => a.name.trim() && a.price.trim());
      },
      {
        message: "All added extras must have a name and valid price",
        path: [],
      },
    ),

  discount: z
    .object({
      type: z.enum(["PERCENTAGE", "FLAT", "FIXED_PRICE"]).optional(),
      value: z.string().optional(),
      startsAt: z.date().optional(),
      endsAt: z.date().optional(),
    })
    .optional()
    .refine((data) => !data?.type || !!data?.value?.trim(), {
      message: "Discount value is required",
      path: ["value"],
    })
    .refine(
      (data) => {
        if (!data?.type) return true;
        const val = Number(data.value);
        if (isNaN(val) || val <= 0) return false;
        if (data.type === "PERCENTAGE") return val <= 100;
        return true;
      },
      {
        message:
          "Discount value must be greater than 0 (max 100% for percentage)",
        path: ["value"],
      },
    )
    .refine((data) => !data?.type || !!data?.startsAt, {
      message: "Start date is required",
      path: ["startsAt"],
    })
    .refine((data) => !data?.type || !!data?.endsAt, {
      message: "End date is required",
      path: ["endsAt"],
    })
    .refine(
      (data) => {
        if (!data?.startsAt || !data?.endsAt) return true;
        return data.endsAt >= data.startsAt;
      },
      {
        message: "End date & time cannot be before start date & time",
        path: ["endsAt"],
      },
    ),
});

type FormData = z.infer<typeof formSchema>;

type MenuCategory = {
  id: string;
  key: string;
  label: string;
  description: string;
};

// ────────────────────────────────────────────────
//  Date + Time Picker Component
// ────────────────────────────────────────────────

type DateTimePickerFieldProps = {
  control: Control<any>;
  name: string;
  minDate?: Date;
  error?: any;
};

function DateTimePickerField({
  control,
  name,
  minDate = new Date(),
  error,
}: DateTimePickerFieldProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const value = field.value as Date | undefined;

        const handleDateSelect = (selectedDate: Date | undefined) => {
          if (!selectedDate) return;

          const newDate = new Date(selectedDate);

          // Preserve existing time if any
          if (value) {
            newDate.setHours(value.getHours(), value.getMinutes(), 0, 0);
          } else {
            newDate.setHours(0, 0, 0, 0);
          }

          // For end field: same-day selection → ensure time is not earlier than start
          if (name === "discount.endsAt") {
            const startValue = control._formValues.discount?.startsAt as
              | Date
              | undefined;
            if (startValue) {
              const startDayStart = new Date(startValue);
              startDayStart.setHours(0, 0, 0, 0);

              const selectedDayStart = new Date(selectedDate);
              selectedDayStart.setHours(0, 0, 0, 0);

              if (
                selectedDayStart.getTime() === startDayStart.getTime() &&
                newDate < startValue
              ) {
                newDate.setHours(
                  startValue.getHours(),
                  startValue.getMinutes(),
                  0,
                  0,
                );
              }
            }
          }

          field.onChange(newDate);
        };

        const handleTimeChange = (part: "hours" | "minutes", val: string) => {
          if (!value) return;
          const newDate = new Date(value);
          if (part === "hours") newDate.setHours(Number(val));
          if (part === "minutes") newDate.setMinutes(Number(val));
          field.onChange(newDate);
        };

        return (
          <>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-12",
                    !value && "text-muted-foreground",
                    error && "border-red-600 focus-visible:ring-red-600",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {value
                    ? format(value, "dd/MM/yyyy HH:mm")
                    : "Pick date & time"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="flex divide-x">
                  <Calendar
                    mode="single"
                    selected={value}
                    onSelect={handleDateSelect}
                    initialFocus
                    disabled={(date) => {
                      const minDay = new Date(minDate);
                      minDay.setHours(0, 0, 0, 0);
                      return date < minDay;
                    }}
                    className="rounded-md"
                  />
                  <div className="p-3 flex flex-col gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Hour</Label>
                      <Select
                        value={
                          value
                            ? String(value.getHours()).padStart(2, "0")
                            : "00"
                        }
                        onValueChange={(v) => handleTimeChange("hours", v)}
                      >
                        <SelectTrigger className="w-20 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => (
                            <SelectItem
                              key={i}
                              value={String(i).padStart(2, "0")}
                            >
                              {String(i).padStart(2, "0")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Minute</Label>
                      <Select
                        value={
                          value
                            ? String(value.getMinutes()).padStart(2, "0")
                            : "00"
                        }
                        onValueChange={(v) => handleTimeChange("minutes", v)}
                      >
                        <SelectTrigger className="w-20 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => i * 5).map(
                            (m) => (
                              <SelectItem
                                key={m}
                                value={String(m).padStart(2, "0")}
                              >
                                {String(m).padStart(2, "0")}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            {error && (
              <p className="text-red-600 text-sm mt-1">{error.message}</p>
            )}
          </>
        );
      }}
    />
  );
}

function MenuEditSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto p-8">
        <div className="mb-8 mt-10 md:mt-0">
          <Skeleton className="h-10 w-48 rounded-md" />
        </div>

        <div className="mb-8">
          <Skeleton className="h-8 w-64 mb-2 rounded-md" />
          <Skeleton className="h-4 w-full max-w-md rounded-md" />
        </div>

        <div className="flex gap-10 border-b border-gray-200 mb-12 pb-2">
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>

        <div className="space-y-8">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20 rounded-md" />
            <Skeleton className="h-12 w-full rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="h-32 w-full rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16 rounded-md" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-12 w-full rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="h-12 w-full rounded-md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EditMenuPage() {
  const [activeTab, setActiveTab] = useState<
    "details" | "sizes" | "extras" | "discounts" | undefined
  >("details");
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showDiscountForm, setShowDiscountForm] = useState(false);
  const [fetchNetworkError, setFetchNetworkError] = useState<string | null>(
    null,
  );

  const router = useRouter();
  const params = useParams();
  const id = params.slug as string;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    trigger,
    reset,
    resetField,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      isAvailable: "available",
    },
  });

  const image = watch("image");
  const discountType = watch("discount.type");
  const startDate = watch("discount.startsAt");
  const name = watch("name");
  const sellingPrice = watch("sellingPrice");
  const variants = watch("variants");
  const addons = watch("addons");
  const discount = watch("discount");

  const {
    fields: variantFields,
    append: appendVariant,
    remove: removeVariant,
  } = useFieldArray({ control, name: "variants" });

  const {
    fields: addonFields,
    append: appendAddon,
    remove: removeAddon,
  } = useFieldArray({ control, name: "addons" });

  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      setFetchNetworkError(null);

      try {
        const res = await authenticatedFetch(
          `${API_BASE}/meta/menu-categories`,
          { method: "GET" },
        );

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const response = await res.json();
        if (response.success && Array.isArray(response.data)) {
          setCategories(response.data);
        } else {
          setCategories([]);
        }
      } catch (err: any) {
        console.error("Failed to load categories:", err);
        if (
          err.message?.includes("fetch") ||
          err.message?.includes("Network")
        ) {
          setFetchNetworkError(
            "Unable to load menu categories. Please check your internet connection.",
          );
        } else {
          toast.error("Failed to load categories. Please try again later.");
        }
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    if (!id) return;

    const fetchMenuItem = async () => {
      setIsLoading(true);
      setFetchNetworkError(null);

      try {
        const businessId = getBusinessId();
        if (!businessId) throw new Error("Business ID not found");

        const res = await authenticatedFetch(
          `${API_BASE}/vendors/me/businesses/${businessId}/menu/items/${id}/compose`,
          { method: "GET" },
        );

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const { data } = await res.json();
        console.log("Fetched menu item data:", data);

        const hasDiscount = !!data.discount?.type;

        reset({
          name: data.name || "",
          description: data.description || "",
          image: data.imageUrl || "",
          categoryTypeId: data.categoryType?.id || "",
          sellingPrice:
            data.sellingPrice != null ? Number(data.sellingPrice) : undefined,
          quantityInStock:
            data.quantityInStock != null
              ? Number(data.quantityInStock)
              : undefined,
          isAvailable: data.isAvailable ? "available" : "unavailable",

          variants:
            Array.isArray(data.variants) && data.variants.length > 0
              ? data.variants.map((v: any) => ({
                  name: v.name || "",
                  description: v.description || "",
                  price: v.price != null ? String(v.price) : "",
                }))
              : [],

          addons:
            Array.isArray(data.addons) && data.addons.length > 0
              ? data.addons.map((a: any) => ({
                  name: a.name || "",
                  description: a.description || "",
                  price: a.price != null ? String(a.price) : "",
                }))
              : [],

          discount: hasDiscount
            ? {
                type: data.discount.type,
                value:
                  data.discount.value != null
                    ? String(data.discount.value)
                    : "",
                startsAt: data.discount.startsAt
                  ? new Date(data.discount.startsAt)
                  : undefined,
                endsAt: data.discount.endsAt
                  ? new Date(data.discount.endsAt)
                  : undefined,
              }
            : undefined,
        });

        setShowDiscountForm(hasDiscount);
      } catch (err: any) {
        console.error("Failed to load menu item:", err);
        if (
          err.message?.includes("fetch") ||
          err.message?.includes("Network")
        ) {
          setFetchNetworkError(
            "Unable to load menu item data. Please check your internet connection.",
          );
        } else {
          const msg = err.message?.includes("expired")
            ? "Your session has expired. Please sign in again."
            : "Failed to load menu item data. Redirecting...";
          toast.error(msg);
          router.push("/restaurant/menu");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchMenuItem();
  }, [id, reset, router]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setValue("image", reader.result as string, { shouldValidate: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const validateCurrentTab = async () => {
    if (!activeTab) return true;
    if (activeTab === "details") {
      return await trigger([
        "name",
        "description",
        "image",
        "categoryTypeId",
        "sellingPrice",
        "quantityInStock",
      ]);
    }
    if (activeTab === "sizes") return await trigger("variants");
    if (activeTab === "extras") return await trigger("addons");
    if (activeTab === "discounts") return await trigger("discount");
    return true;
  };

  const handleNext = async () => {
    const isValid = await validateCurrentTab();
    if (!isValid) return;

    if (!activeTab) {
      setActiveTab("details");
      return;
    }

    const currentIndex = tabOrder.indexOf(activeTab);
    if (currentIndex < tabOrder.length - 1) {
      setActiveTab(tabOrder[currentIndex + 1]);
    } else {
      await handleSubmit(onSubmit)();
    }
  };

  const handleBack = () => {
    if (!activeTab) {
      setActiveTab("details");
      return;
    }

    const currentIndex = tabOrder.indexOf(activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabOrder[currentIndex - 1]);
    }
  };

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setIsSubmitting(true);

    const formData = new FormData();

    formData.append("name", data.name.trim());
    formData.append("description", data.description.trim());
    formData.append("categoryTypeId", data.categoryTypeId);
    formData.append("sellingPrice", data.sellingPrice.toString());
    formData.append("quantityInStock", data.quantityInStock.toString());
    formData.append(
      "isAvailable",
      data.isAvailable === "available" ? "true" : "false",
    );

    if (data.variants && data.variants.length > 0) {
      data.variants.forEach((variant, index) => {
        if (variant.name?.trim()) {
          formData.append(`variants[${index}][name]`, variant.name.trim());
          formData.append(
            `variants[${index}][description]`,
            variant.description || "",
          );
          formData.append(`variants[${index}][price]`, variant.price || "0");
        }
      });
    }

    if (data.addons && data.addons.length > 0) {
      data.addons.forEach((addon, index) => {
        if (addon.name?.trim()) {
          formData.append(`addons[${index}][name]`, addon.name.trim());
          formData.append(
            `addons[${index}][description]`,
            addon.description || "",
          );
          formData.append(`addons[${index}][price]`, addon.price || "0");
        }
      });
    }

    if (data.discount?.type && data.discount?.value?.trim()) {
      formData.append("discount[type]", data.discount.type);
      formData.append("discount[value]", data.discount.value.trim());
      if (data.discount.startsAt) {
        formData.append(
          "discount[startsAt]",
          data.discount.startsAt.toISOString(),
        );
      }
      if (data.discount.endsAt) {
        formData.append("discount[endsAt]", data.discount.endsAt.toISOString());
      }
    }

    if (data.image.startsWith("data:image")) {
      const blob = await fetch(data.image).then((res) => res.blob());
      formData.append("file", blob, "menu-image.jpg");
    }

    const businessId = getBusinessId();

    try {
      const res = await authenticatedFetch(
        `${API_BASE}/vendors/me/businesses/${businessId}/menu/items/${id}/compose`,
        {
          method: "PATCH",
          body: formData,
        },
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.message || errorData.error || "Update failed",
        );
      }

      const json = await res.json();
      // const formObject = Object.fromEntries(formData.entries());
      // console.log("FormData as Object:", formObject);
      // console.log("Update API response:", json);

      toast.success("Menu item updated successfully");
      // router.push("/restaurant/menu");
    } catch (err: any) {
      console.error("Update error:", err);
      const msg = err.message?.includes("expired")
        ? "Your session has expired. Please sign in again."
        : "Failed to update menu item. Please try again.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
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

  if (isLoading) {
    return <MenuEditSkeleton />;
  }

  const isFirstTab = activeTab === "details";
  const isLastTab = activeTab === "discounts";

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto p-5 md:p-8">
        <div className="mb-8 mt-10 md:mt-0">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-4">
            <ArrowLeft
              className="h-7 w-7 text-gray-600 hover:text-gray-900 cursor-pointer"
              onClick={() => router.back()}
            />
            Edit Menu
          </h1>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-munchprimary">
            Menu Information
          </h2>
          <p className="text-gray-600 mt-2">
            This information will be displayed to customers on your menu.
          </p>
        </div>

        <Accordion
          type="single"
          collapsible
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(
              value
                ? (value as "details" | "sizes" | "extras" | "discounts")
                : undefined,
            );
          }}
          className="space-y-4"
        >
          {/* Details Section */}
          <Card className="border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-white to-gray-50/50">
            <AccordionItem value="details" className="border-0">
              <AccordionTrigger className="hover:no-underline px-4 py-3 group">
                <div className="flex items-center gap-3 w-full">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-100 group-hover:bg-orange-200 transition-colors">
                    <FileText className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Item Details
                    </h3>
                    {activeTab === "details" ? (
                      <p className="text-sm text-gray-500">
                        Name, description, price and availability
                      </p>
                    ) : (
                      <p className="text-sm text-gray-600 font-medium">
                        {name
                          ? `${name} • ₦${sellingPrice?.toLocaleString() || "0"}`
                          : "No item details added"}
                      </p>
                    )}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-6 px-4 pb-4 pt-3 border-t border-gray-100 bg-gray-50/30">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className={cn(errors.name && "text-red-600")}>
                      Name <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      placeholder="Name"
                      {...register("name")}
                      className={cn(
                        "h-12",
                        errors.name &&
                          "border-red-600 focus-visible:ring-red-600",
                      )}
                    />
                    {errors.name && (
                      <p className="text-red-600 text-sm">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className={cn(errors.description && "text-red-600")}>
                      Description <span className="text-red-600">*</span>
                    </Label>
                    <Textarea
                      placeholder="Description"
                      className={cn(
                        "min-h-32",
                        errors.description &&
                          "border-red-600 focus-visible:ring-red-600",
                      )}
                      {...register("description")}
                    />
                    {errors.description && (
                      <p className="text-red-600 text-sm">
                        {errors.description.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className={cn(errors.image && "text-red-600")}>
                      Image <span className="text-red-600">*</span>
                    </Label>
                    <label className="block cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <div
                        className={cn(
                          "bg-gray-100 rounded-lg p-8 flex flex-col items-center justify-center gap-3 hover:border-gray-400 transition",
                          errors.image && "border-red-600",
                        )}
                      >
                        {image ? (
                          <img
                            src={image}
                            alt="Menu item"
                            width={300}
                            height={200}
                            className="rounded-lg object-cover max-h-64"
                            crossOrigin="anonymous"
                          />
                        ) : (
                          <>
                            <Camera className="h-12 w-12 text-orange-500" />
                            <p className="text-gray-600 text-center">
                              Select an image from your media gallery
                            </p>
                          </>
                        )}
                      </div>
                    </label>
                    {errors.image && (
                      <p className="text-red-600 text-sm">
                        {errors.image.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      className={cn(errors.categoryTypeId && "text-red-600")}
                    >
                      Category <span className="text-red-600">*</span>
                    </Label>
                    <Controller
                      control={control}
                      name="categoryTypeId"
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger
                            className={cn(
                              "h-12! w-full",
                              errors.categoryTypeId &&
                                "border-red-600 focus-visible:ring-red-600",
                            )}
                          >
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent className="w-full">
                            {loadingCategories ? (
                              <div className="p-4 text-center text-gray-500">
                                Loading categories...
                              </div>
                            ) : categories.length > 0 ? (
                              categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.label}
                                </SelectItem>
                              ))
                            ) : (
                              <div className="p-4 text-center text-gray-500">
                                No categories available
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.categoryTypeId && (
                      <p className="text-red-600 text-sm">
                        {errors.categoryTypeId.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label
                        className={cn(errors.sellingPrice && "text-red-600")}
                      >
                        Selling price <span className="text-red-600">*</span>
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        step="0.01"
                        placeholder="0.00"
                        {...register("sellingPrice", { valueAsNumber: true })}
                        className={cn(
                          "h-12",
                          errors.sellingPrice &&
                            "border-red-600 focus-visible:ring-red-600",
                        )}
                      />
                      {errors.sellingPrice && (
                        <p className="text-red-600 text-sm">
                          {errors.sellingPrice.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label
                        className={cn(errors.quantityInStock && "text-red-600")}
                      >
                        Quantity in Stock{" "}
                        <span className="text-red-600">*</span>
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        placeholder="0"
                        {...register("quantityInStock", {
                          valueAsNumber: true,
                        })}
                        className={cn(
                          "h-12",
                          errors.quantityInStock &&
                            "border-red-600 focus-visible:ring-red-600",
                        )}
                      />
                      {errors.quantityInStock && (
                        <p className="text-red-600 text-sm">
                          {errors.quantityInStock.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label>Availability</Label>
                    <Controller
                      control={control}
                      name="isAvailable"
                      render={({ field }) => (
                        <RadioGroup
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <div className="flex items-center gap-8">
                            <div className="flex items-center gap-3">
                              <RadioGroupItem
                                value="available"
                                id="available"
                              />
                              <Label
                                htmlFor="available"
                                className="font-normal cursor-pointer"
                              >
                                Available
                              </Label>
                            </div>
                            <div className="flex items-center gap-3">
                              <RadioGroupItem
                                value="unavailable"
                                id="unavailable"
                              />
                              <Label
                                htmlFor="unavailable"
                                className="font-normal cursor-pointer"
                              >
                                Unavailable
                              </Label>
                            </div>
                          </div>
                        </RadioGroup>
                      )}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Card>

          {/* Sizes Section */}
          <Card className="border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-white to-gray-50/50">
            <AccordionItem value="sizes" className="border-0">
              <AccordionTrigger className="hover:no-underline px-4 py-3 group">
                <div className="flex items-center gap-3 w-full">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 group-hover:bg-blue-200 transition-colors">
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Sizes
                    </h3>
                    {activeTab === "sizes" ? (
                      <p className="text-sm text-gray-500">
                        Specify sizes/variants (optional)
                      </p>
                    ) : (
                      <p className="text-sm text-gray-600 font-medium">
                        {variants && variants.length > 0
                          ? `${variants.length} size${variants.length > 1 ? "s" : ""} added`
                          : "No sizes added"}
                      </p>
                    )}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-6 px-4 pb-4 pt-3 border-t border-gray-100 bg-gray-50/30">
                <p className="text-gray-600">
                  Specify the sizes/variants for this menu item (optional).
                </p>

                {errors.variants &&
                  typeof errors.variants.message === "string" && (
                    <p className="text-red-600 text-sm text-center">
                      {errors.variants.message}
                    </p>
                  )}

                <div className="space-y-4">
                  {variantFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="bg-white border border-gray-100 rounded-lg p-4 space-y-3 hover:border-blue-200 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <Input
                            placeholder="Size name (e.g. Small)"
                            {...register(`variants.${index}.name`)}
                            className="h-12"
                          />
                          {errors.variants?.[index]?.name && (
                            <p className="text-red-600 text-sm mt-1">
                              {errors.variants[index]?.name?.message}
                            </p>
                          )}
                        </div>
                        <div className="w-32">
                          <Input
                            placeholder="Price"
                            {...register(`variants.${index}.price`)}
                            className="h-12"
                          />
                          {errors.variants?.[index]?.price && (
                            <p className="text-red-600 text-sm mt-1">
                              {errors.variants[index]?.price?.message}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeVariant(index)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                      <Input
                        placeholder="Description (optional)"
                        {...register(`variants.${index}.description`)}
                        className="h-12"
                      />
                    </div>
                  ))}
                </div>

                <div className="text-center">
                  <Button
                    variant="outline"
                    onClick={() =>
                      appendVariant({ name: "", description: "", price: "" })
                    }
                    className="gap-2"
                  >
                    <Plus className="h-5 w-5 text-munchprimary" />
                    Add Variant
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Card>

          {/* Extras Section */}
          <Card className="border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-white to-gray-50/50">
            <AccordionItem value="extras" className="border-0">
              <AccordionTrigger className="hover:no-underline px-4 py-3 group">
                <div className="flex items-center gap-3 w-full">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-100 group-hover:bg-purple-200 transition-colors">
                    <Zap className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Extras
                    </h3>
                    {activeTab === "extras" ? (
                      <p className="text-sm text-gray-500">
                        Add optional items customers can choose (optional)
                      </p>
                    ) : (
                      <p className="text-sm text-gray-600 font-medium">
                        {addons && addons.length > 0
                          ? `${addons.length} extra${addons.length > 1 ? "s" : ""} added`
                          : "No extras added"}
                      </p>
                    )}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-6 px-4 pb-4 pt-3 border-t border-gray-100 bg-gray-50/30">
                <p className="text-gray-600">
                  Add any additional items customers can choose with this menu
                  item (optional).
                </p>

                {errors.addons && typeof errors.addons.message === "string" && (
                  <p className="text-red-600 text-sm text-center">
                    {errors.addons.message}
                  </p>
                )}

                <div className="space-y-4">
                  {addonFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="bg-white border border-gray-100 rounded-lg p-4 space-y-3 hover:border-purple-200 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <Input
                            placeholder="Addon name (e.g. Extra Plantain)"
                            {...register(`addons.${index}.name`)}
                            className="h-12"
                          />
                          {errors.addons?.[index]?.name && (
                            <p className="text-red-600 text-sm mt-1">
                              {errors.addons[index]?.name?.message}
                            </p>
                          )}
                        </div>
                        <div className="w-32">
                          <Input
                            placeholder="Price"
                            {...register(`addons.${index}.price`)}
                            className="h-12"
                          />
                          {errors.addons?.[index]?.price && (
                            <p className="text-red-600 text-sm mt-1">
                              {errors.addons[index]?.price?.message}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeAddon(index)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                      <Input
                        placeholder="Description (optional)"
                        {...register(`addons.${index}.description`)}
                        className="h-12"
                      />
                    </div>
                  ))}
                </div>

                <div className="text-center">
                  <Button
                    variant="outline"
                    onClick={() =>
                      appendAddon({ name: "", description: "", price: "" })
                    }
                    className="gap-2"
                  >
                    <Plus className="h-5 w-5 text-munchprimary" />
                    Add Extra
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Card>

          {/* Discounts Section */}
          <Card className="border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-white to-gray-50/50">
            <AccordionItem value="discounts" className="border-0">
              <AccordionTrigger className="hover:no-underline px-4 py-3 group">
                <div className="flex items-center gap-3 w-full">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-100 group-hover:bg-green-200 transition-colors">
                    <Tag className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Discounts
                    </h3>
                    {activeTab === "discounts" ? (
                      <p className="text-sm text-gray-500">
                        Offer temporary price reductions (optional)
                      </p>
                    ) : (
                      <p className="text-sm text-gray-600 font-medium">
                        {discount?.type
                          ? `${discount.type === "PERCENTAGE" ? discount.value + "%" : "₦" + discount.value} off`
                          : "No discount added"}
                      </p>
                    )}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-6 px-4 pb-4 pt-3 border-t border-gray-100 bg-gray-50/30">
                <p className="text-gray-600">
                  Offer a temporary price reduction to attract more orders for
                  this item (optional).
                </p>

                {!showDiscountForm ? (
                  <div className="text-center">
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => {
                        setShowDiscountForm(true);
                        setValue("discount.type", "PERCENTAGE");
                      }}
                    >
                      <Plus className="h-5 w-5 text-munchprimary" />
                      Add Discount
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6 border border-green-100 bg-green-50/30 rounded-lg p-6 relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-4 right-4 text-red-600 hover:bg-red-50"
                      onClick={() => {
                        setShowDiscountForm(false);
                        resetField("discount");
                      }}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>

                    {errors.discount &&
                      typeof errors.discount.message === "string" && (
                        <p className="text-red-600 text-sm text-center">
                          {errors.discount.message}
                        </p>
                      )}

                    <div className="space-y-6">
                      <div className="space-y-4">
                        <Label className="font-semibold">Discount Type</Label>
                        <Controller
                          control={control}
                          name="discount.type"
                          render={({ field }) => (
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value ?? ""}
                              className="flex flex-col gap-4"
                            >
                              <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-white/50 transition-colors">
                                <RadioGroupItem
                                  value="PERCENTAGE"
                                  id="percentage"
                                  className="mt-1"
                                />
                                <div>
                                  <Label
                                    htmlFor="percentage"
                                    className="cursor-pointer font-medium"
                                  >
                                    Percentage off
                                  </Label>
                                  <p className="text-sm text-gray-600">
                                    Reduce price by a percentage
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-white/50 transition-colors">
                                <RadioGroupItem
                                  value="FLAT"
                                  id="flat"
                                  className="mt-1"
                                />
                                <div>
                                  <Label
                                    htmlFor="flat"
                                    className="cursor-pointer font-medium"
                                  >
                                    Flat amount off
                                  </Label>
                                  <p className="text-sm text-gray-600">
                                    ₦ amount off original price
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-white/50 transition-colors">
                                <RadioGroupItem
                                  value="FIXED_PRICE"
                                  id="fixed"
                                  className="mt-1"
                                />
                                <div>
                                  <Label
                                    htmlFor="fixed"
                                    className="cursor-pointer font-medium"
                                  >
                                    Set promo price
                                  </Label>
                                  <p className="text-sm text-gray-600">
                                    Sell at a new fixed price
                                  </p>
                                </div>
                              </div>
                            </RadioGroup>
                          )}
                        />
                      </div>

                      {discountType && (
                        <div className="space-y-2">
                          <Label>Discount Value</Label>
                          <div className="flex items-center gap-3">
                            <Input
                              type="text"
                              placeholder="0"
                              {...register("discount.value")}
                              className="h-12 max-w-[200px]"
                            />
                            <span className="text-gray-700 font-medium min-w-[50px]">
                              {discountType === "PERCENTAGE" ? "%" : "₦"}
                            </span>
                          </div>
                          {errors.discount?.value && (
                            <p className="text-red-600 text-sm mt-1">
                              {errors.discount.value.message}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label
                            className={cn(
                              errors.discount?.startsAt && "text-red-600",
                            )}
                          >
                            Start Date & Time{" "}
                            <span className="text-red-600">*</span>
                          </Label>
                          <DateTimePickerField
                            control={control}
                            name="discount.startsAt"
                            minDate={new Date()}
                            error={errors.discount?.startsAt}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label
                            className={cn(
                              errors.discount?.endsAt && "text-red-600",
                            )}
                          >
                            End Date & Time{" "}
                            <span className="text-red-600">*</span>
                          </Label>
                          <DateTimePickerField
                            control={control}
                            name="discount.endsAt"
                            minDate={startDate ?? new Date()}
                            error={errors.discount?.endsAt}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Card>
        </Accordion>

        <div className="flex justify-end gap-2 items-center mt-12 pt-8">
          {!isFirstTab && (
            <Button
              onClick={handleBack}
              className="gap-2 px-8 bg-gray-100 hover:bg-gray-200 text-munchprimary"
              disabled={isSubmitting}
            >
              Back
            </Button>
          )}
          <Button
            onClick={handleNext}
            className="bg-orange-500 hover:bg-munchprimary text-white px-8 flex items-center gap-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {isLastTab ? "Updating..." : "Saving..."}
              </>
            ) : isLastTab ? (
              "Update Menu"
            ) : (
              "Next"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
