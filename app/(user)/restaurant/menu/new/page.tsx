"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Camera,
  Plus,
  Trash2,
  Calendar,
  ArrowLeft,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";

import {
  useForm,
  useFieldArray,
  Controller,
  SubmitHandler,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const categories = [
  "Rice",
  "Swallow",
  "Protein",
  "Drinks",
  "Side Dish",
  "Dessert",
  "Soup",
  "Salad",
];

const tabOrder = ["details", "sizes", "extras", "discounts"] as const;

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  image: z.string().min(1, "Image is required"),
  categories: z.array(z.string()).min(1, "At least one category is required"),
  costPrice: z.number().gte(0, "Cost price cannot be less than 0"),
  sellingPrice: z.number().gte(0, "Selling price cannot be less than 0"),
  quantity: z.number()
    .int("Quantity must be a whole number")
    .gte(0, "Quantity cannot be less than 0"),
  remainingQuantity: z.number()
    .int("Remaining quantity must be a whole number")
    .gte(0, "Remaining quantity cannot be less than 0"),
  availability: z.enum(["available", "sold-out", "unavailable"]),
  sizes: z.array(
    z.object({
      name: z.string(),
      price: z.string(),
    })
  ),
  extras: z.array(
    z.object({
      name: z.string(),
      price: z.string(),
    })
  ),
  discounts: z.array(
    z.object({
      type: z.enum(["percentage", "flat", "promo"]),
      value: z.string(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    })
  ),
});

type FormData = z.infer<typeof formSchema>;

export default function CreateMenuPage() {
  const [activeTab, setActiveTab] = useState("details");
  const [categoryOpen, setCategoryOpen] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    trigger,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      availability: "available",
      categories: [],
      sizes: [{ name: "", price: "" }],
      extras: [{ name: "", price: "" }],
      discounts: [],
      costPrice: 0,
      sellingPrice: 0,
      quantity: 0,
      remainingQuantity: 0,
    },
  });

  const image = watch("image");

  const {
    fields: sizeFields,
    append: appendSize,
    remove: removeSize,
  } = useFieldArray({
    control,
    name: "sizes",
  });

  const {
    fields: extraFields,
    append: appendExtra,
    remove: removeExtra,
  } = useFieldArray({
    control,
    name: "extras",
  });

  const {
    fields: discountFields,
    append: appendDiscount,
    remove: removeDiscount,
  } = useFieldArray({
    control,
    name: "discounts",
  });

  const selectedCategories = watch("categories") || [];

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

  const toggleCategory = (category: string) => {
    const current = selectedCategories;
    const updated = current.includes(category)
      ? current.filter((c) => c !== category)
      : [...current, category];
    setValue("categories", updated, { shouldValidate: true });
    setCategoryOpen(false);
  };

  const validateDetails = async () => {
    const result = await trigger([
      "name",
      "description",
      "image",
      "categories",
      "costPrice",
      "sellingPrice",
      "quantity",
      "remainingQuantity",
    ]);
    return result;
  };

  const handleNext = async () => {
    if (activeTab === "details") {
      if (!(await validateDetails())) return;
    }

    const currentIndex = tabOrder.indexOf(activeTab as any);
    if (currentIndex < tabOrder.length - 1) {
      setActiveTab(tabOrder[currentIndex + 1]);
    } else {
      await handleSubmit(onSubmit)();
    }
  };

  const handleBack = () => {
    const currentIndex = tabOrder.indexOf(activeTab as any);
    if (currentIndex > 0) {
      setActiveTab(tabOrder[currentIndex - 1]);
    }
  };

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    const payload = {
      name: data.name,
      description: data.description,
      categories: data.categories,
      costPrice: data.costPrice.toString(),
      sellingPrice: data.sellingPrice.toString(),
      quantity: data.quantity.toString(),
      remainingQuantity: data.remainingQuantity.toString(),
      availability: data.availability,
      image: data.image,
      sizes: data.sizes.filter((s) => s.name.trim() && s.price.trim()),
      extras: data.extras.filter((e) => e.name.trim() && e.price.trim()),
      discounts: data.discounts,
    };

    console.log(payload)
    // try {
    //   const response = await fetch("/api/menu", {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify(payload),
    //   });

    //   if (response.ok) {
    //     alert("Menu created successfully!");
    //   } else {
    //     alert("Failed to create menu");
    //   }
    // } catch (error) {
    //   console.error(error);
    //   alert("An error occurred");
    // }
  };

  const isFirstTab = activeTab === "details";
  const isLastTab = activeTab === "discounts";

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8 mt-10 md:mt-0">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-4">
            <ArrowLeft className="h-6 w-6 text-gray-600 hover:text-gray-900" />
            Create Menu
          </h1>
        </div>

        {/* Menu Information */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-munchprimary">
            Menu Information
          </h2>
          <p className="text-gray-600 mt-2">
            This information will be displayed to customers on your menu.
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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

          {/* Details Tab */}
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
                    errors.name && "border-red-600 focus-visible:ring-red-600"
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
                      "border-red-600 focus-visible:ring-red-600"
                  )}
                  {...register("description")}
                />
                {errors.description && (
                  <p className="text-red-600 text-sm">
                    {errors.description.message}
                  </p>
                )}
              </div>

              {/* Image Upload */}
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
                      errors.image && "border-red-600"
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
                  <p className="text-red-600 text-sm">{errors.image.message}</p>
                )}
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label className={cn(errors.categories && "text-red-600")}>
                  Category <span className="text-red-600">*</span>
                </Label>
                <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={categoryOpen}
                      className={cn(
                        "w-full justify-between h-12",
                        errors.categories &&
                          "border-red-600 focus-visible:ring-red-600"
                      )}
                    >
                      <span className="truncate font-normal">Category</span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search category..." />
                      <CommandList>
                        <CommandEmpty>No category found.</CommandEmpty>
                        <CommandGroup>
                          {categories.map((category) => (
                            <CommandItem
                              key={category}
                              onSelect={() => toggleCategory(category)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedCategories.includes(category)
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {category}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {errors.categories && (
                  <p className="text-red-600 text-sm">
                    {errors.categories.message}
                  </p>
                )}
                {selectedCategories.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedCategories.map((cat) => (
                      <Badge
                        key={cat}
                        variant="secondary"
                        className="bg-red-50 text-base px-3 py-1 font-medium items-center flex justify-between rounded-lg border-munchprimary"
                      >
                        {cat}
                        <button
                          onClick={() => toggleCategory(cat)}
                          className="ml-2 hover:text-red-600"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className={cn(errors.costPrice && "text-red-600")}>
                    Cost price <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="0.00"
                    {...register("costPrice", { valueAsNumber: true })}
                    className={cn(
                      "h-12",
                      errors.costPrice &&
                        "border-red-600 focus-visible:ring-red-600"
                    )}
                  />
                  {errors.costPrice && (
                    <p className="text-red-600 text-sm">
                      {errors.costPrice.message}
                    </p>
                  )}
                </div>
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
                        "border-red-600 focus-visible:ring-red-600"
                    )}
                  />
                  {errors.sellingPrice && (
                    <p className="text-red-600 text-sm">
                      {errors.sellingPrice.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className={cn(errors.quantity && "text-red-600")}>
                    Quantity <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    placeholder="0"
                    {...register("quantity", { valueAsNumber: true })}
                    className={cn(
                      "h-12",
                      errors.quantity &&
                        "border-red-600 focus-visible:ring-red-600"
                    )}
                  />
                  {errors.quantity && (
                    <p className="text-red-600 text-sm">
                      {errors.quantity.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label
                    className={cn(errors.remainingQuantity && "text-red-600")}
                  >
                    Remaining Quantity <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    placeholder="0"
                    {...register("remainingQuantity", { valueAsNumber: true })}
                    className={cn(
                      "h-12",
                      errors.remainingQuantity &&
                        "border-red-600 focus-visible:ring-red-600"
                    )}
                  />
                  {errors.remainingQuantity && (
                    <p className="text-red-600 text-sm">
                      {errors.remainingQuantity.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <Label>Availability</Label>
                <Controller
                  control={control}
                  name="availability"
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
                          <RadioGroupItem value="sold-out" id="sold-out" />
                          <Label
                            htmlFor="sold-out"
                            className="font-normal cursor-pointer"
                          >
                            Sold out
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

          {/* Sizes Tab */}
          <TabsContent value="sizes" className="space-y-8">
            <p className="text-gray-600">Specify the sizes for this menu.</p>

            <div className="space-y-4">
              {sizeFields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-4">
                  <Input
                    placeholder="Name"
                    {...register(`sizes.${index}.name`)}
                    className="h-12"
                  />
                  <Input
                    placeholder="Price"
                    {...register(`sizes.${index}.price`)}
                    className="h-12"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSize(index)}
                    className="text-red-600 hover:bg-red-50"
                    disabled={sizeFields.length === 1}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              onClick={() => appendSize({ name: "", price: "" })}
              className="gap-2"
            >
              <Plus className="h-5 w-5 text-munchprimary" />
              Add Size
            </Button>
          </TabsContent>

          {/* Extras Tab */}
          <TabsContent value="extras" className="space-y-8">
            <p className="text-gray-600">
              Add any additional extras to this menu item, if applicable.
            </p>

            <div className="space-y-4">
              {extraFields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-4">
                  <Input
                    placeholder="Name"
                    {...register(`extras.${index}.name`)}
                    className="h-12"
                  />
                  <Input
                    placeholder="Price"
                    {...register(`extras.${index}.price`)}
                    className="h-12"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeExtra(index)}
                    className="text-red-600 hover:bg-red-50"
                    disabled={extraFields.length === 1}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              onClick={() => appendExtra({ name: "", price: "" })}
              className="gap-2"
            >
              <Plus className="h-5 w-5 text-munchprimary" />
              Add Extra
            </Button>
          </TabsContent>

          {/* Discounts Tab */}
          <TabsContent value="discounts" className="space-y-8">
            <p className="text-gray-600">
              Offer a temporary price reduction to attract more orders for this
              item.
            </p>

            <div className="space-y-8">
              {discountFields.map((field, index) => (
                <div
                  key={field.id}
                  className="border border-gray-200 rounded-lg p-6 space-y-6 relative"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeDiscount(index)}
                    className="absolute top-4 right-4 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>

                  <div className="space-y-4">
                    <Label>Discount Type</Label>
                    <Controller
                      control={control}
                      name={`discounts.${index}.type`}
                      render={({ field: discountField }) => (
                        <RadioGroup
                          value={discountField.value}
                          onValueChange={discountField.onChange}
                        >
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <RadioGroupItem value="percentage" />
                              <Label className="font-normal cursor-pointer">
                                Percentage off
                                <p className="text-sm text-gray-500">
                                  Reduce price by a percentage
                                </p>
                              </Label>
                            </div>
                            <div className="flex items-center gap-3">
                              <RadioGroupItem value="flat" />
                              <Label className="font-normal cursor-pointer">
                                Flat amount off
                                <p className="text-sm text-gray-500">
                                  ₦ amount off original price
                                </p>
                              </Label>
                            </div>
                            <div className="flex items-center gap-3">
                              <RadioGroupItem value="promo" />
                              <Label className="font-normal cursor-pointer">
                                Set promo price
                                <p className="text-sm text-gray-500">
                                  Sell at a new fixed price
                                </p>
                              </Label>
                            </div>
                          </div>
                        </RadioGroup>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Discount Value</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="0"
                        {...register(`discounts.${index}.value`)}
                        className="h-12"
                      />
                      <span className="text-gray-600">
                        {watch(`discounts.${index}.type`) === "percentage"
                          ? "%"
                          : watch(`discounts.${index}.type`) === "flat"
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
                        name={`discounts.${index}.startDate`}
                        render={({ field: dateField }) => (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal h-12"
                              >
                                <Calendar className="mr-2 h-4 w-4" />
                                {dateField.value
                                  ? format(dateField.value, "dd/MM/yyyy")
                                  : "DD/MM/YYYY"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <CalendarComponent
                                mode="single"
                                selected={dateField.value ?? undefined}
                                onSelect={dateField.onChange}
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
                        name={`discounts.${index}.endDate`}
                        render={({ field: dateField }) => (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal h-12"
                              >
                                <Calendar className="mr-2 h-4 w-4" />
                                {dateField.value
                                  ? format(dateField.value, "dd/MM/yyyy")
                                  : "DD/MM/YYYY"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <CalendarComponent
                                mode="single"
                                selected={dateField.value ?? undefined}
                                onSelect={dateField.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        )}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              onClick={() =>
                appendDiscount({
                  type: "percentage",
                  value: "",
                  startDate: undefined,
                  endDate: undefined,
                })
              }
              className="gap-2"
            >
              <Plus className="h-5 w-5 text-munchprimary" />
              Add Discount
            </Button>
          </TabsContent>
        </Tabs>

        {/* Footer Buttons */}
        <div className="flex justify-end gap-2 items-center mt-12 pt-8 border-t border-gray-200">
          <div>
            {!isFirstTab && (
              <Button
                onClick={handleBack}
                className="gap-2 px-8 bg-gray-100 hover:bg-gray-200 text-munchprimary"
              >
                Back
              </Button>
            )}
          </div>
          <Button
            onClick={handleNext}
            className="bg-orange-500 hover:bg-munchprimary text-white px-8"
          >
            {isLastTab ? "Add Menu" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}
