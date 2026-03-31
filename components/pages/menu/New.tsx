"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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

import {
  useForm,
  useFieldArray,
  Controller,
  SubmitHandler,
  Control,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { getAccessToken, getBusinessId } from "@/app/lib/auth";
import Link from "next/link";
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
                      // Allow same day, disable only dates before the min day
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

export default function CreateMenuPage() {
  const [activeTab, setActiveTab] = useState<
    "details" | "sizes" | "extras" | "discounts" | undefined
  >("details");
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiscountForm, setShowDiscountForm] = useState(false);
  const [fetchNetworkError, setFetchNetworkError] = useState<string | null>(
    null,
  );

  const router = useRouter();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    trigger,
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

  // Reset endsAt when startsAt becomes later
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === "discount.startsAt") {
        const newStart = value.discount?.startsAt as Date | undefined;
        const currentEnd = value.discount?.endsAt as Date | undefined;

        if (newStart && currentEnd && currentEnd < newStart) {
          setValue("discount.endsAt", undefined, {
            shouldValidate: true,
            shouldDirty: true,
          });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [watch, setValue]);

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
          const msg = err.message?.includes("expired")
            ? "Your session has expired. Please sign in again."
            : "Failed to load categories. Please try again later.";
          toast.error(msg);
          setCategories([]);
        }
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

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

    formData.append("menuItem[name]", data.name);
    formData.append("menuItem[description]", data.description);
    formData.append("menuItem[sellingPrice]", data.sellingPrice.toString());
    formData.append(
      "menuItem[quantityInStock]",
      data.quantityInStock.toString(),
    );
    formData.append("menuItem[categoryTypeId]", data.categoryTypeId);
    formData.append(
      "menuItem[isAvailable]",
      data.isAvailable === "available" ? "true" : "false",
    );

    data.variants?.forEach((v, i) => {
      if (v.name.trim()) {
        formData.append(`variants[${i}][name]`, v.name);
        formData.append(`variants[${i}][description]`, v.description || "");
        formData.append(`variants[${i}][price]`, v.price);
      }
    });

    data.addons?.forEach((a, i) => {
      if (a.name.trim()) {
        formData.append(`addons[${i}][name]`, a.name);
        formData.append(`addons[${i}][description]`, a.description || "");
        formData.append(`addons[${i}][price]`, a.price);
      }
    });

    if (data.discount?.type && data.discount.value?.trim()) {
      formData.append("discount[type]", data.discount.type);
      formData.append("discount[value]", data.discount.value);
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

    if (data.image?.startsWith("data:image")) {
      const blob = await fetch(data.image).then((res) => res.blob());
      formData.append("file", blob, "menu-image.jpg");
    }

    const businessId = getBusinessId();

    try {
      const res = await authenticatedFetch(
        `${API_BASE}/vendors/me/businesses/${businessId}/menu/items/compose`,
        { method: "POST", body: formData },
      );

      const responseData = await res.json();

      if (res.ok) {
        toast.success("Menu item created successfully");
        router.push("/restaurant/menu");
      } else {
        toast.error(responseData?.error || "Failed to create menu item");
      }
    } catch (err: any) {
      console.error("Create error:", err);
      const msg = err.message?.includes("expired")
        ? "Your session has expired. Please sign in again."
        : "An unexpected error occurred.";
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

  const isFirstTab = activeTab === "details";
  const isLastTab = activeTab === "discounts";

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto p-5 md:p-8">
        <div className="mb-8 mt-14 md:mt-0">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-4">
            <Link
              href="/restaurant/menu"
              className="text-gray-400 hover:text-gray-600"
            >
              <ArrowLeft className="h-7 w-7" />
            </Link>
            Create Menu
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
          className="space-y-6"
        >
          <Card className="border border-gray-200 shadow-sm">
            <AccordionItem value="details" className="border-0">
              <AccordionTrigger className="hover:no-underline px-6 py-4 text-lg font-semibold text-gray-900">
                Details
              </AccordionTrigger>
              <AccordionContent className="space-y-8 px-6 pb-6 pt-4 border-t border-gray-200">
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
                          <Image
                            src={image}
                            alt="Menu item"
                            width={300}
                            height={200}
                            className="rounded-lg object-cover max-h-64"
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
                          defaultValue={field.value}
                        >
                          <SelectTrigger
                            className={cn(
                              "h-12 w-full",
                              errors.categoryTypeId &&
                                "border-red-600 focus-visible:ring-red-600",
                            )}
                          >
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
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

          <Card className="border border-gray-200 shadow-sm">
            <AccordionItem value="sizes" className="border-0">
              <AccordionTrigger className="hover:no-underline px-6 py-4 text-lg font-semibold text-gray-900">
                Sizes
              </AccordionTrigger>
              <AccordionContent className="space-y-8 px-6 pb-6 pt-4 border-t border-gray-200">
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
                    <div key={field.id} className="space-y-3 border-b pb-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-1 space-y-1">
                          <Input
                            placeholder="Size name (e.g. Small)"
                            {...register(`variants.${index}.name`)}
                            className="h-12"
                          />
                          {errors.variants?.[index]?.name && (
                            <p className="text-red-600 text-xs">
                              {errors.variants[index]?.name?.message}
                            </p>
                          )}
                        </div>
                        <div className="w-32 space-y-1">
                          <Input
                            placeholder="Price"
                            {...register(`variants.${index}.price`)}
                            className="h-12"
                          />
                          {errors.variants?.[index]?.price && (
                            <p className="text-red-600 text-xs">
                              {errors.variants[index]?.price?.message}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeVariant(index)}
                          className="text-red-600 hover:bg-red-50 mt-6"
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

          <Card className="border border-gray-200 shadow-sm">
            <AccordionItem value="extras" className="border-0">
              <AccordionTrigger className="hover:no-underline px-6 py-4 text-lg font-semibold text-gray-900">
                Extras
              </AccordionTrigger>
              <AccordionContent className="space-y-8 px-6 pb-6 pt-4 border-t border-gray-200">
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
                    <div key={field.id} className="space-y-3 border-b pb-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-1 space-y-1">
                          <Input
                            placeholder="Addon name (e.g. Extra Plantain)"
                            {...register(`addons.${index}.name`)}
                            className="h-12"
                          />
                          {errors.addons?.[index]?.name && (
                            <p className="text-red-600 text-xs">
                              {errors.addons[index]?.name?.message}
                            </p>
                          )}
                        </div>
                        <div className="w-32 space-y-1">
                          <Input
                            placeholder="Price"
                            {...register(`addons.${index}.price`)}
                            className="h-12"
                          />
                          {errors.addons?.[index]?.price && (
                            <p className="text-red-600 text-xs">
                              {errors.addons[index]?.price?.message}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeAddon(index)}
                          className="text-red-600 hover:bg-red-50 mt-6"
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

          <Card className="border border-gray-200 shadow-sm">
            <AccordionItem value="discounts" className="border-0">
              <AccordionTrigger className="hover:no-underline px-6 py-4 text-lg font-semibold text-gray-900">
                Discounts
              </AccordionTrigger>
              <AccordionContent className="space-y-8 px-6 pb-6 pt-4 border-t border-gray-200">
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
                  <div className="space-y-6 border border-gray-200 rounded-lg p-6 relative">
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
                        <Label>Discount Type</Label>
                        <Controller
                          control={control}
                          name="discount.type"
                          render={({ field }) => (
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value ?? ""}
                              className="flex flex-col gap-4"
                            >
                              <div className="flex items-start space-x-3">
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

                              <div className="flex items-start space-x-3">
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

                              <div className="flex items-start space-x-3">
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

        <div className="flex justify-end gap-2 items-center mt-12 pt-8 border-t border-gray-200">
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
                Saving...
              </>
            ) : isLastTab ? (
              "Add Menu"
            ) : (
              "Next"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
