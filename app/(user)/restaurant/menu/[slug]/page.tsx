"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import {
  Camera,
  Plus,
  Trash2,
  Calendar,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
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
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { getAccessToken, getBusinessId } from "@/app/lib/auth";
import { refreshAccessToken } from "@/app/lib/api";

const tabOrder = ["details", "sizes", "extras", "discounts"] as const;

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  image: z.string().min(1, "Image is required"),
  categoryTypeId: z.string().min(1, "Category is required"),
  sellingPrice: z.number().gte(0, "Selling price cannot be less than 0"),
  quantityInStock: z
    .number()
    .int("Quantity must be a whole number")
    .gte(0, "Quantity cannot be less than 0"),
  isAvailable: z.enum(["available", "unavailable"]),
  variants: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      price: z.string(),
    }),
  ),
  addons: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      price: z.string(),
    }),
  ),
  discount: z
    .object({
      type: z.enum(["PERCENTAGE", "FLAT", "FIXED"]).optional(),
      value: z.string(),
      startsAt: z.date().optional(),
      endsAt: z.date().optional(),
    })
    .optional(),
});

type FormData = z.infer<typeof formSchema>;

type MenuCategory = {
  id: string;
  key: string;
  label: string;
  description: string;
};

const API_BASE = "https://dev.api.munchspace.io/api/v1";
const API_KEY =
  "eH4u8eujRzIrLWE+xkqyUWg33ggZ1Ts5bAKi/Ze5l23dyc7aLZSVMEssML0vUvDHrhchMtyskMxzGW3c4jhQCA==";

async function authenticatedFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  let token = getAccessToken();

  if (!token) {
    const refreshOk = await refreshAccessToken();
    if (!refreshOk) {
      throw new Error("Session expired - refresh failed");
    }
    token = getAccessToken();
    if (!token) {
      throw new Error("Refresh succeeded but no token available");
    }
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
      throw new Error("Session expired during request (refresh failed)");
    }

    token = getAccessToken();
    if (!token) {
      throw new Error("Refresh succeeded but no token available");
    }

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

export default function EditMenuPage() {
  const [activeTab, setActiveTab] = useState<
    "details" | "sizes" | "extras" | "discounts"
  >("details");
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      isAvailable: "available",
      variants: [{ name: "", description: "", price: "" }],
      addons: [{ name: "", description: "", price: "" }],
      sellingPrice: 0,
      quantityInStock: 0,
    },
  });

  const image = watch("image");

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

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      try {
        const res = await authenticatedFetch(
          `${API_BASE}/meta/menu-categories`,
          { method: "GET" },
        );
        if (!res.ok)
          throw new Error(`Failed to fetch categories: ${res.status}`);
        const { data } = await res.json();
        if (Array.isArray(data)) setCategories(data);
      } catch (err: any) {
        console.error("Failed to load categories:", err);
        const msg =
          err.message?.includes("expired") || err.message?.includes("refresh")
            ? "Your session has expired. Please sign in again."
            : "Failed to load categories. Please try again later.";
        toast.error(msg);
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  // Fetch menu item data
  useEffect(() => {
    if (!id) return;

    const fetchMenuItem = async () => {
      setIsLoading(true);
      try {
        const businessId = getBusinessId();
        if (!businessId) throw new Error("Business ID not found");

        const res = await authenticatedFetch(
          `${API_BASE}/vendors/me/businesses/${businessId}/menu/items/${id}`,
          { method: "GET" },
        );

        if (!res.ok)
          throw new Error(`Failed to fetch menu item: ${res.status}`);

        const { data } = await res.json();

        reset({
          name: data.name || "",
          description: data.description || "",
          image: data.imageUrl || "",
          categoryTypeId: data.categoryTypeId?.toString() || "",
          sellingPrice: Number(data.sellingPrice) || 0,
          quantityInStock: Number(data.quantityInStock) || 0,
          isAvailable: data.isAvailable ? "available" : "unavailable",
          variants: data.variants?.length
            ? data.variants.map((v: any) => ({
                name: v.name || "",
                description: v.description || "",
                price: v.price?.toString() || "",
              }))
            : [{ name: "", description: "", price: "" }],
          addons: data.addons?.length
            ? data.addons.map((a: any) => ({
                name: a.name || "",
                description: a.description || "",
                price: a.price?.toString() || "",
              }))
            : [{ name: "", description: "", price: "" }],
          discount: data.discount || undefined,
        });
      } catch (err: any) {
        console.error("Failed to load menu item:", err);
        const msg =
          err.message?.includes("expired") || err.message?.includes("refresh")
            ? "Your session has expired. Please sign in again."
            : "Failed to load menu item data. Please try again.";
        toast.error(msg);
        router.push("/restaurant/menu");
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

  const validateDetails = async () => {
    const fields = [
      "name",
      "description",
      "image",
      "categoryTypeId",
      "sellingPrice",
      "quantityInStock",
    ] as const;
    return await trigger(fields);
  };

  const handleNext = async () => {
    if (activeTab === "details" && !(await validateDetails())) return;

    const currentIndex = tabOrder.indexOf(activeTab);
    if (currentIndex < tabOrder.length - 1) {
      setActiveTab(tabOrder[currentIndex + 1]);
    } else {
      handleSubmit(onSubmit)();
    }
  };

  const handleBack = () => {
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

    data.variants.forEach((variant, index) => {
      if (variant.name.trim()) {
        formData.append(`variants[${index}][name]`, variant.name.trim());
        formData.append(
          `variants[${index}][description]`,
          variant.description.trim() || "",
        );
        formData.append(
          `variants[${index}][price]`,
          variant.price.trim() || "0",
        );
      }
    });

    data.addons.forEach((addon, index) => {
      if (addon.name.trim()) {
        formData.append(`addons[${index}][name]`, addon.name.trim());
        formData.append(
          `addons[${index}][description]`,
          addon.description.trim() || "",
        );
        formData.append(`addons[${index}][price]`, addon.price.trim() || "0");
      }
    });

    if (data.discount?.type && data.discount?.value?.trim()) {
      formData.append("discount[type]", data.discount.type);
      formData.append("discount[value]", data.discount.value.trim());
      if (data.discount.startsAt) {
        formData.append(
          "discount[startsAt]",
          format(data.discount.startsAt, "yyyy-MM-dd"),
        );
      }
      if (data.discount.endsAt) {
        formData.append(
          "discount[endsAt]",
          format(data.discount.endsAt, "yyyy-MM-dd"),
        );
      }
    }

    if (data.image.startsWith("data:image")) {
      const blob = await fetch(data.image).then((res) => res.blob());
      formData.append("file", blob, "menu-image.jpg");
    }

    const formDataObj = Object.fromEntries(formData.entries());
    console.log(formDataObj);

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
        let errorMsg = "Update failed";
        try {
          const errData = await res.json();
          errorMsg = errData.message || errData.error || errorMsg;
        } catch {}
        throw new Error(errorMsg);
      }

      toast.success("Menu item updated successfully");
      router.push("/restaurant/menu");
    } catch (err: any) {
      console.error("Update error:", err);
      const msg =
        err.message?.includes("expired") || err.message?.includes("refresh")
          ? "Your session has expired. Please sign in again."
          : err.message || "Failed to update menu item. Please try again.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const isFirstTab = activeTab === "details";
  const isLastTab = activeTab === "discounts";

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto p-8">
        <div className="mb-8 mt-10 md:mt-0">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-4">
            <ArrowLeft
              className="h-6 w-6 text-gray-600 hover:text-gray-900 cursor-pointer"
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

        <Tabs value={activeTab} className="w-full">
          <TabsList className="flex gap-10 rounded-none bg-transparent border-b border-gray-200 mb-12 pb-2 w-full justify-start">
            <TabsTrigger
              value="details"
              className="disabled:opacity-100 data-[state=active]:text-munchprimary data-[state=active]:border-b-2 data-[state=active]:border-munchprimary pb-4 flex-0 w-fit rounded-none cursor-default"
            >
              Details
            </TabsTrigger>
            <TabsTrigger
              value="sizes"
              className="disabled:opacity-100 data-[state=active]:text-munchprimary data-[state=active]:border-b-2 data-[state=active]:border-munchprimary pb-4 flex-0 w-fit rounded-none cursor-default"
            >
              Sizes
            </TabsTrigger>
            <TabsTrigger
              value="extras"
              className="disabled:opacity-100 data-[state=active]:text-munchprimary data-[state=active]:border-b-2 data-[state=active]:border-munchprimary pb-4 flex-0 w-fit rounded-none cursor-default"
            >
              Extras
            </TabsTrigger>
            <TabsTrigger
              value="discounts"
              className="disabled:opacity-100 data-[state=active]:text-munchprimary data-[state=active]:border-b-2 data-[state=active]:border-munchprimary pb-4 flex-0 w-fit rounded-none cursor-default"
            >
              Discounts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-8">
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
                    errors.name && "border-red-600 focus-visible:ring-red-600",
                  )}
                />
                {errors.name && (
                  <p className="text-red-600 text-sm">{errors.name.message}</p>
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
                  <p className="text-red-600 text-sm">{errors.image.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className={cn(errors.categoryTypeId && "text-red-600")}>
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
                  <Label className={cn(errors.sellingPrice && "text-red-600")}>
                    Selling price <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    type="number"
                    min={0}
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
                    Quantity in Stock <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    placeholder="0"
                    {...register("quantityInStock", { valueAsNumber: true })}
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
                          <RadioGroupItem value="available" id="available" />
                          <Label
                            htmlFor="available"
                            className="font-normal cursor-pointer text-munchprimary"
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
          </TabsContent>

          <TabsContent value="sizes" className="space-y-8">
            <p className="text-gray-600">
              Specify the sizes/variants for this menu item.
            </p>
            <div className="space-y-4">
              {variantFields.map((field, index) => (
                <div key={field.id} className="space-y-3 border-b pb-4">
                  <div className="flex items-center gap-4">
                    <Input
                      placeholder="Size name (e.g. Small)"
                      {...register(`variants.${index}.name`)}
                      className="h-12"
                    />
                    <Input
                      placeholder="Price"
                      {...register(`variants.${index}.price`)}
                      className="h-12"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeVariant(index)}
                      className="text-red-600 hover:bg-red-50"
                      disabled={variantFields.length === 1}
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
          </TabsContent>

          <TabsContent value="extras" className="space-y-8">
            <p className="text-gray-600">
              Add any additional items customers can choose with this menu item.
            </p>
            <div className="space-y-4">
              {addonFields.map((field, index) => (
                <div key={field.id} className="space-y-3 border-b pb-4">
                  <div className="flex items-center gap-4">
                    <Input
                      placeholder="Addon name (e.g. Extra Plantain)"
                      {...register(`addons.${index}.name`)}
                      className="h-12"
                    />
                    <Input
                      placeholder="Price"
                      {...register(`addons.${index}.price`)}
                      className="h-12"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAddon(index)}
                      className="text-red-600 hover:bg-red-50"
                      disabled={addonFields.length === 1}
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
          </TabsContent>

          <TabsContent value="discounts" className="space-y-8">
            <p className="text-gray-600">
              Offer a temporary price reduction to attract more orders for this
              item.
            </p>

            <div className="space-y-6 border border-gray-200 rounded-lg p-6">
              <div className="space-y-4">
                <Label>Discount Type</Label>
                <Controller
                  control={control}
                  name="discount.type"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select discount type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PERCENTAGE">
                          Percentage off
                        </SelectItem>
                        <SelectItem value="FLAT">Flat amount off</SelectItem>
                        <SelectItem value="FIXED">Fixed price</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label>Discount Value</Label>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="0"
                    {...register("discount.value")}
                    className="h-12"
                  />
                  <span className="text-gray-600">
                    {watch("discount.type") === "PERCENTAGE"
                      ? "%"
                      : watch("discount.type") === "FLAT"
                        ? "₦"
                        : ""}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Controller
                    control={control}
                    name="discount.startsAt"
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal h-12"
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {field.value
                              ? format(field.value, "dd/MM/yyyy")
                              : "DD/MM/YYYY"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CalendarComponent
                            mode="single"
                            selected={field.value ?? undefined}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Controller
                    control={control}
                    name="discount.endsAt"
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal h-12"
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {field.value
                              ? format(field.value, "dd/MM/yyyy")
                              : "DD/MM/YYYY"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CalendarComponent
                            mode="single"
                            selected={field.value ?? undefined}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-4 items-center mt-12 pt-8 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          {!isFirstTab && (
            <Button
              variant="outline"
              onClick={handleBack}
              className="px-8 bg-gray-100 hover:bg-gray-200 text-munchprimary"
              disabled={isSubmitting}
            >
              Back
            </Button>
          )}
          <Button
            onClick={handleNext}
            className="bg-orange-500 hover:bg-orange-600 text-white px-8 flex items-center gap-2"
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
