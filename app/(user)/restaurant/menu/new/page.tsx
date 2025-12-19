"use client";

import { useState } from "react";
import Image from "next/image";
import { Camera, Plus, Trash2, Calendar } from "lucide-react";

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
import { Check, ChevronsUpDown, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type Size = { id: string; name: string; price: string };
type Extra = { id: string; name: string; price: string };
type Discount = {
  id: string;
  type: "percentage" | "flat" | "promo";
  value: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
};

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

export default function CreateMenuPage() {
  const [activeTab, setActiveTab] = useState("details");

  // Details tab
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [costPrice, setCostPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [remainingQuantity, setRemainingQuantity] = useState("");
  const [availability, setAvailability] = useState("available");

  // Validation errors
  const [errors, setErrors] = useState<{
    name?: string;
    description?: string;
    image?: string;
    categories?: string;
    costPrice?: string;
    sellingPrice?: string;
    quantity?: string;
    remainingQuantity?: string;
  }>({});

  // Sizes tab - start with one default item
  const [sizes, setSizes] = useState<Size[]>([
    { id: "default-size", name: "", price: "" },
  ]);

  const addSize = () => {
    setSizes([...sizes, { id: Date.now().toString(), name: "", price: "" }]);
  };

  const updateSize = (id: string, field: "name" | "price", value: string) => {
    setSizes(sizes.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const removeSize = (id: string) => {
    if (sizes.length > 1) {
      setSizes(sizes.filter((s) => s.id !== id));
    }
  };

  // Extras tab - start with one default item
  const [extras, setExtras] = useState<Extra[]>([
    { id: "default-extra", name: "", price: "" },
  ]);

  const addExtra = () => {
    setExtras([...extras, { id: Date.now().toString(), name: "", price: "" }]);
  };

  const updateExtra = (id: string, field: "name" | "price", value: string) => {
    setExtras(extras.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  };

  const removeExtra = (id: string) => {
    if (extras.length > 1) {
      setExtras(extras.filter((e) => e.id !== id));
    }
  };

  // Discounts tab
  const [discounts, setDiscounts] = useState<Discount[]>([]);

  const addDiscount = () => {
    setDiscounts([
      ...discounts,
      {
        id: Date.now().toString(),
        type: "percentage",
        value: "",
        startDate: undefined,
        endDate: undefined,
      },
    ]);
  };

  const updateDiscount = (
    id: string,
    field: "type" | "value" | "startDate" | "endDate",
    value: any
  ) => {
    setDiscounts(
      discounts.map((d) => (d.id === id ? { ...d, [field]: value } : d))
    );
  };

  const removeDiscount = (id: string) => {
    setDiscounts(discounts.filter((d) => d.id !== id));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
    setCategoryOpen(false);
  };

  const validateDetails = () => {
    const newErrors: typeof errors = {};

    if (!name.trim()) newErrors.name = "Name is required";
    if (!description.trim()) newErrors.description = "Description is required";
    if (!image) newErrors.image = "Image is required";
    if (selectedCategories.length === 0)
      newErrors.categories = "At least one category is required";
    if (!costPrice.trim()) newErrors.costPrice = "Cost price is required";
    if (!sellingPrice.trim())
      newErrors.sellingPrice = "Selling price is required";
    if (!quantity.trim()) newErrors.quantity = "Quantity is required";
    if (!remainingQuantity.trim())
      newErrors.remainingQuantity = "Remaining quantity is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (activeTab === "details") {
      if (!validateDetails()) return;
    }

    const currentIndex = tabOrder.indexOf(activeTab as any);
    if (currentIndex < tabOrder.length - 1) {
      setActiveTab(tabOrder[currentIndex + 1]);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    const currentIndex = tabOrder.indexOf(activeTab as any);
    if (currentIndex > 0) {
      setActiveTab(tabOrder[currentIndex - 1]);
    }
  };

  const handleSubmit = async () => {
    const payload = {
      name,
      description,
      categories: selectedCategories,
      costPrice,
      sellingPrice,
      quantity,
      remainingQuantity,
      availability,
      image,
      sizes: sizes.filter((s) => s.name.trim() && s.price.trim()),
      extras: extras.filter((e) => e.name.trim() && e.price.trim()),
      discounts,
    };

    try {
      const response = await fetch("/api/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert("Menu created successfully!");
      } else {
        alert("Failed to create menu");
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred");
    }
  };

  const isFirstTab = activeTab === "details";

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
              className="data-[state=active]:text-munchprimary data-[state=active]:border-b-2 data-[state=active]:border-munchprimary pb-4 flex-0 w-fit rounded-none"
            >
              Details
            </TabsTrigger>
            <TabsTrigger
              value="sizes"
              className="data-[state=active]:text-munchprimary data-[state=active]:border-b-2 data-[state=active]:border-munchprimary pb-4 flex-0 w-fit rounded-none"
            >
              Sizes
            </TabsTrigger>
            <TabsTrigger
              value="extras"
              className="data-[state=active]:text-munchprimary data-[state=active]:border-b-2 data-[state=active]:border-munchprimary pb-4 flex-0 w-fit rounded-none"
            >
              Extras
            </TabsTrigger>
            <TabsTrigger
              value="discounts"
              className="data-[state=active]:text-munchprimary data-[state=active]:border-b-2 data-[state=active]:border-munchprimary pb-4 flex-0 w-fit rounded-none"
            >
              Discounts
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>
                  Name <span className="text-red-600">*</span>
                </Label>
                <Input
                  placeholder="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12"
                />
                {errors.name && (
                  <p className="text-red-600 text-sm">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>
                  Description <span className="text-red-600">*</span>
                </Label>
                <Textarea
                  placeholder="Description"
                  className="min-h-32"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                {errors.description && (
                  <p className="text-red-600 text-sm">{errors.description}</p>
                )}
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label>
                  Image <span className="text-red-600">*</span>
                </Label>
                <label className="block cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <div className=" bg-gray-100 rounded-lg p-8 flex flex-col items-center justify-center gap-3 hover:border-gray-400 transition">
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
                  <p className="text-red-600 text-sm">{errors.image}</p>
                )}
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label>
                  Category <span className="text-red-600">*</span>
                </Label>
                <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={categoryOpen}
                      className="w-full justify-between h-12"
                    >
                      <span className="truncate">
                        {selectedCategories.length > 0
                          ? selectedCategories.join(", ")
                          : "Category"}
                      </span>
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
                  <p className="text-red-600 text-sm">{errors.categories}</p>
                )}
                {selectedCategories.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedCategories.map((cat) => (
                      <Badge key={cat} variant="secondary" className="text-sm">
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
                  <Label>
                    Cost price <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    placeholder="₦ 0.00"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="h-12"
                  />
                  {errors.costPrice && (
                    <p className="text-red-600 text-sm">{errors.costPrice}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>
                    Selling price <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    placeholder="₦ 0.00"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className="h-12"
                  />
                  {errors.sellingPrice && (
                    <p className="text-red-600 text-sm">
                      {errors.sellingPrice}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>
                    Quantity <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="h-12"
                  />
                  {errors.quantity && (
                    <p className="text-red-600 text-sm">{errors.quantity}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>
                    Remaining Quantity <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={remainingQuantity}
                    onChange={(e) => setRemainingQuantity(e.target.value)}
                    className="h-12"
                  />
                  {errors.remainingQuantity && (
                    <p className="text-red-600 text-sm">
                      {errors.remainingQuantity}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <Label>Availability</Label>
                <RadioGroup
                  value={availability}
                  onValueChange={setAvailability}
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
                      <RadioGroupItem value="unavailable" id="unavailable" />
                      <Label
                        htmlFor="unavailable"
                        className="font-normal cursor-pointer"
                      >
                        Unavailable
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </TabsContent>

          {/* Sizes Tab */}
          <TabsContent value="sizes" className="space-y-8">
            <p className="text-gray-600">Specify the sizes for this menu.</p>

            <div className="space-y-4">
              {sizes.map((size) => (
                <div key={size.id} className="flex items-center gap-4">
                  <Input
                    placeholder="Name"
                    value={size.name}
                    onChange={(e) =>
                      updateSize(size.id, "name", e.target.value)
                    }
                    className="h-12"
                  />
                  <Input
                    placeholder="Price"
                    value={size.price}
                    onChange={(e) =>
                      updateSize(size.id, "price", e.target.value)
                    }
                    className="h-12"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSize(size.id)}
                    className="text-red-600 hover:bg-red-50"
                    disabled={sizes.length === 1}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              ))}
            </div>

            <Button variant="outline" onClick={addSize} className="gap-2">
              <Plus className="h-5 w-5" />
              Add Size
            </Button>
          </TabsContent>

          {/* Extras Tab */}
          <TabsContent value="extras" className="space-y-8">
            <p className="text-gray-600">
              Add any additional extras to this menu item, if applicable.
            </p>

            <div className="space-y-4">
              {extras.map((extra) => (
                <div key={extra.id} className="flex items-center gap-4">
                  <Input
                    placeholder="Name"
                    value={extra.name}
                    onChange={(e) =>
                      updateExtra(extra.id, "name", e.target.value)
                    }
                    className="h-12"
                  />
                  <Input
                    placeholder="Price"
                    value={extra.price}
                    onChange={(e) =>
                      updateExtra(extra.id, "price", e.target.value)
                    }
                    className="h-12"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeExtra(extra.id)}
                    className="text-red-600 hover:bg-red-50"
                    disabled={extras.length === 1}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              ))}
            </div>

            <Button variant="outline" onClick={addExtra} className="gap-2">
              <Plus className="h-5 w-5" />
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
              {discounts.map((discount) => (
                <div
                  key={discount.id}
                  className="border border-gray-200 rounded-lg p-6 space-y-6 relative"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeDiscount(discount.id)}
                    className="absolute top-4 right-4 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>

                  <div className="space-y-4">
                    <Label>Discount Type</Label>
                    <RadioGroup
                      value={discount.type}
                      onValueChange={(value) =>
                        updateDiscount(
                          discount.id,
                          "type",
                          value as Discount["type"]
                        )
                      }
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
                  </div>

                  <div className="space-y-2">
                    <Label>Discount Value</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="0"
                        value={discount.value}
                        onChange={(e) =>
                          updateDiscount(discount.id, "value", e.target.value)
                        }
                        className="h-12"
                      />
                      <span className="text-gray-600">
                        {discount.type === "percentage"
                          ? "%"
                          : discount.type === "flat"
                          ? "₦"
                          : ""}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal h-12"
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {discount.startDate
                              ? format(discount.startDate, "dd/MM/yyyy")
                              : "DD/MM/YYYY"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CalendarComponent
                            mode="single"
                            selected={discount.startDate}
                            onSelect={(date) =>
                              updateDiscount(discount.id, "startDate", date)
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal h-12"
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {discount.endDate
                              ? format(discount.endDate, "dd/MM/yyyy")
                              : "DD/MM/YYYY"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CalendarComponent
                            mode="single"
                            selected={discount.endDate}
                            onSelect={(date) =>
                              updateDiscount(discount.id, "endDate", date)
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button variant="outline" onClick={addDiscount} className="gap-2">
              <Plus className="h-5 w-5" />
              Add Discount
            </Button>
          </TabsContent>
        </Tabs>

        {/* Footer Buttons */}
        <div className="flex justify-between items-center mt-12 pt-8 border-t border-gray-200">
          <div>
            {!isFirstTab && (
              <Button
                variant="outline"
                onClick={handleBack}
                className="gap-2 px-8"
              >
                <ArrowLeft className="h-5 w-5" />
                Back
              </Button>
            )}
          </div>
          <Button
            onClick={handleNext}
            className="bg-orange-500 hover:bg-munchprimary text-white px-8 rounded-full"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
