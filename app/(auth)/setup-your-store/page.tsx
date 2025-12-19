"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { date, z } from "zod";
import { format } from "date-fns";
import Image from "next/image";
import {
  LoaderCircle,
  ArrowLeft,
  Check,
  ChevronsUpDown,
  X,
  BrushCleaning,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Toggle } from "@/components/ui/toggle";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

const setupSchema = z.object({
  storeImage: z.url().optional(),
  storeName: z.string().min(1, "Store name is required."),
  storeEmail: z.email("Invalid email address."),
  phoneNumber: z.string().min(10, "Valid phone number required."),
  establishedDate: z.date("Established date is required."),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters."),

  storeTypes: z.array(z.string()).min(1, "Select at least one store type."),
  serviceOperations: z
    .array(z.string())
    .min(1, "Select at least one service operation."),

  workingHours: z.record(
    z.string(), // Key type (day name: "Monday", etc.)
    z.object({
      enabled: z.boolean(),
      start: z.string(),
      end: z.string(),
    })
  ),

  country: z.string().min(1, "Country is required."),
  state: z.string().min(1, "State is required."),
  lga: z.string().min(1, "LGA is required."),
  streetName: z.string().min(1, "Street name is required."),
  fullAddress: z.string().min(1, "Full address is required."),
});

type SetupValues = z.infer<typeof setupSchema>;

const daysOfWeek = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const storeTypeOptions = [
  { value: "restaurant", label: "Restaurant" },
  { value: "cafe", label: "Cafe" },
  { value: "fast-food", label: "Fast Food" },
  { value: "bakery", label: "Bakery" },
  { value: "bar", label: "Bar" },
  // Add more as needed
];

const serviceOperationOptions = [
  { value: "dine-in", label: "Dine In" },
  { value: "takeaway", label: "Takeaway" },
  { value: "delivery", label: "Delivery" },
  { value: "pre-order", label: "Pre-Order" },
  { value: "catering", label: "Catering" },
  // Add more as needed
];

export default function SetupStorePage() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [storeTypeOpen, setStoreTypeOpen] = useState(false);
  const [serviceOperationOpen, setServiceOperationOpen] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  const form = useForm<SetupValues>({
    resolver: zodResolver(setupSchema),
    mode: "onChange",
    defaultValues: {
      storeTypes: [],
      serviceOperations: [],
      storeName: "",
      storeEmail: "",
      phoneNumber: "",
      description: "",
      country: "",
      state: "",
      lga: "",
      streetName: "",
      fullAddress: "",
      workingHours: {
        Monday: { enabled: true, start: "08:00", end: "20:00" },
        Tuesday: { enabled: true, start: "08:00", end: "20:00" },
        Wednesday: { enabled: true, start: "08:00", end: "20:00" },
        Thursday: { enabled: true, start: "08:00", end: "20:00" },
        Friday: { enabled: true, start: "08:00", end: "20:00" },
        Saturday: { enabled: false, start: "08:00", end: "20:00" },
        Sunday: { enabled: false, start: "08:00", end: "20:00" },
      },
    },
  });

  const progress = (step / 4) * 100;

  const validateCurrentStep = async () => {
    let fields: (keyof SetupValues)[] = [];

    if (step === 1)
      fields = [
        "storeName",
        "storeEmail",
        "phoneNumber",
        "establishedDate",
        "description",
      ];
    if (step === 2) fields = ["storeTypes", "serviceOperations"];
    if (step === 4)
      fields = ["country", "state", "lga", "streetName", "fullAddress"];

    return await form.trigger(fields);
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (!isValid) return;

    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setIsLoading(false);

    if (step < 4) setStep(step + 1);
    else {
      console.log("Store setup completed:", form.getValues());
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleCloudinaryUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2000000) {
      alert("File exceeds 2MB limit. Please select a smaller image.");
      return;
    }
    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      alert("Only PNG or JPEG images are allowed.");
      return;
    }

    setUploading(true);

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    form.setValue("storeImage", localPreview);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "property-maestro-unsigned"); // Replace with your exact unsigned preset name

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/property-meastro/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();
      console.log("Cloudinary response:", data); // Debug the full response

      if (data.secure_url) {
        form.setValue("storeImage", data.secure_url);
        setPreviewUrl(data.secure_url);
      } else {
        throw new Error(
          data.error?.message || "Upload failed – check console for details"
        );
      }
    } catch (error: any) {
      console.error("Cloudinary upload error:", error);
      alert(`Upload failed: ${error.message || "Please try again."}`);
    } finally {
      setUploading(false);
    }
  };

  const [openDays, setOpenDays] = useState<Record<string, boolean>>({});

  const toggleOpen = (day: string) => {
    setOpenDays((prev) => ({ ...prev, [day]: !prev[day] }));
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Left Background */}
      <div className="w-full relative hidden md:block">
        <div className="fixed w-1/2 pe-5">
          <Image
            src={"/images/logo.svg"}
            width={100}
            height={75}
            alt="logo"
            className="hidden md:block absolute z-20 ms-5 mt-5"
          />
          <Image
            src={"/images/auth/hero.png"}
            width={500}
            height={900}
            alt="hero"
            className="object-cover h-full max-h-screen w-full"
          />
        </div>
      </div>

      {/* Right Form */}
      <div className="flex items-center justify-center p-8  mt-10">
        <div className="w-full max-w-lg space-y-8">
          <Image
            src={"/images/logo.svg"}
            width={100}
            height={75}
            alt="logo"
            className="lg:hidden"
          />
          <div>
            <h2 className="text-2xl font-bold">Setup your Store</h2>
            <p className="text-muted-foreground mt-5 text-sm">
              Almost there! Enter your store info, hours, and address so your
              store is ready to go.
            </p>
            <div className="flex items-center gap-7 mt-5">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-right text-blue-600 whitespace-nowrap">
                {step === 1 && "Store Details (1/4)"}
                {step === 2 && "Store Type (2/4)"}
                {step === 3 && "Working Hours (3/4)"}
                {step === 4 && "Store Address (4/4)"}
              </p>
            </div>
          </div>

          <Form {...form}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleNext();
              }}
              className="space-y-8"
            >
              {/* Step 1: Store Details */}
              {step === 1 && (
                <>
                  {/* Direct Cloudinary Upload with Preview */}
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-8 items-start">
                      <div className="space-y-4">
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg"
                          onChange={handleCloudinaryUpload}
                          className="hidden"
                          id="cloudinary-direct-upload"
                          disabled={uploading}
                        />
                        <label htmlFor="cloudinary-direct-upload">
                          <Button
                            asChild
                            variant={"outline"}
                            className="w-full rounded-lg cursor-pointer border-0 justify-start py-10"
                            disabled={uploading}
                          >
                            <div className="flex gap-4">
                              {previewUrl ? (
                                <Image
                                  src={previewUrl}
                                  alt="Store preview"
                                  width={70}
                                  height={70}
                                  className="object-cover h-15 rounded"
                                />
                              ) : (
                                <Image
                                  src={"/images/auth/store.svg"}
                                  width={70}
                                  height={70}
                                  alt="store"
                                />
                              )}

                              <span>
                                <p className="text-xs text-center text-blue-600 flex gap-1">
                                  <Image
                                    src={"/images/icon/frame.svg"}
                                    width={15}
                                    height={15}
                                    alt="gallery"
                                  />
                                  Upload Store Image
                                </p>
                                <p className="text-xs text-center text-muted-foreground mt-2">
                                  PNG or JPEG (Max. File Size: 2MB)
                                </p>

                                {/* {uploading ? (
                                  <>
                                    <LoaderCircle className="h-8 w-8 animate-spin mx-auto" />
                                    <span>Uploading...</span>
                                  </>
                                ) : (
                                  <>
                                    <Upload className="h-8 w-8 mx-auto" />
                                    <span>
                                      {previewUrl
                                        ? "Change Image"
                                        : "Click to Upload"}
                                    </span>
                                  </>
                                )} */}
                              </span>
                            </div>
                          </Button>
                        </label>
                      </div>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="storeName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-normal text-slate-500">
                          Store Name <span className="text-munchred">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Store name"
                            className="h-12 placeholder:text-slate-400"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="storeEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-normal text-slate-500">
                          Store Email <span className="text-munchred">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Store email"
                            type="email"
                            className="h-12 placeholder:text-slate-400"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-normal text-slate-500">
                          Phone Number <span className="text-munchred">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Phone number"
                            className="h-12 placeholder:text-slate-400"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="establishedDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-normal text-slate-500">
                          Established Date{" "}
                          <span className="text-munchred">*</span>
                        </FormLabel>
                        <Popover
                          open={datePopoverOpen}
                          onOpenChange={setDatePopoverOpen}
                        >
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal h-12 hover:text-slate-400 text-slate-400 hover:bg-white",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value
                                  ? format(field.value, "PPP")
                                  : "Pick a date"}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => {
                                field.onChange(date);
                                setDatePopoverOpen(false);
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-normal text-slate-500">
                          Store Description{" "}
                          <span className="text-munchred">*</span>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe your store..."
                            className="h-25 placeholder:text-slate-400"
                            rows={9}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {/* Step 2: Store Types & Service Operations */}
              {step === 2 && (
                <div className="space-y-8">
                  {/* Store Type Multi-Select */}
                  <FormField
                    control={form.control}
                    name="storeTypes"
                    render={() => (
                      <FormItem className="mb-5">
                        <FormLabel className="font-normal text-slate-500">
                          Store Type <span className="text-munchred">*</span>
                        </FormLabel>
                        <Popover
                          open={storeTypeOpen}
                          onOpenChange={setStoreTypeOpen}
                        >
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between font-normal h-12 hover:text-slate-400 text-slate-400 hover:bg-white"
                              >
                                <span className="truncate">
                                  {form.watch("storeTypes").length > 0
                                    ? `${
                                        form.watch("storeTypes").length
                                      } selected`
                                    : "Select store types"}
                                </span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput placeholder="Search store type..." />
                              <CommandEmpty>No type found.</CommandEmpty>
                              <CommandGroup>
                                {storeTypeOptions.map((option) => (
                                  <CommandItem
                                    key={option.value}
                                    onSelect={async () => {
                                      const current =
                                        form.getValues("storeTypes");
                                      if (current.includes(option.value)) {
                                        form.setValue(
                                          "storeTypes",
                                          current.filter(
                                            (v) => v !== option.value
                                          )
                                        );
                                      } else {
                                        form.setValue("storeTypes", [
                                          ...current,
                                          option.value,
                                        ]);
                                      }
                                      await form.trigger("storeTypes");
                                      setStoreTypeOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        form
                                          .watch("storeTypes")
                                          .includes(option.value)
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    {option.label}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <div className="flex flex-wrap gap-2">
                          {form.watch("storeTypes").map((value) => {
                            const label =
                              storeTypeOptions.find((o) => o.value === value)
                                ?.label || value;
                            return (
                              <Badge
                                key={value}
                                variant="secondary"
                                className="bg-red-50 text-base px-3 py-1 font-medium items-center flex justify-between rounded-lg border-munchprimary"
                              >
                                {label}
                                <span
                                  className="ml-2 cursor-pointer text-2x"
                                  onClick={() =>
                                    form.setValue(
                                      "storeTypes",
                                      form
                                        .getValues("storeTypes")
                                        .filter((v) => v !== value)
                                    )
                                  }
                                >
                                  <X className="w-4 font-black" />
                                </span>
                              </Badge>
                            );
                          })}
                        </div>
                        <FormMessage className="" />
                      </FormItem>
                    )}
                  />

                  {/* Service Operation Multi-Select */}
                  <FormField
                    control={form.control}
                    name="serviceOperations"
                    render={() => (
                      <FormItem className="mb-0">
                        <FormLabel className="font-normal text-slate-500">
                          Service Operation{" "}
                          <span className="text-munchred">*</span>
                        </FormLabel>
                        <Popover
                          open={serviceOperationOpen}
                          onOpenChange={setServiceOperationOpen}
                        >
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between font-normal h-12 hover:text-slate-400 text-slate-400 hover:bg-white"
                              >
                                <span className="truncate">
                                  {form.watch("serviceOperations").length > 0
                                    ? `${
                                        form.watch("serviceOperations").length
                                      } selected`
                                    : "Select service operations"}
                                </span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput placeholder="Search operation..." />
                              <CommandEmpty>No operation found.</CommandEmpty>
                              <CommandGroup>
                                {serviceOperationOptions.map((option) => (
                                  <CommandItem
                                    key={option.value}
                                    onSelect={async () => {
                                      const current =
                                        form.getValues("serviceOperations");
                                      if (current.includes(option.value)) {
                                        form.setValue(
                                          "serviceOperations",
                                          current.filter(
                                            (v) => v !== option.value
                                          )
                                        );
                                      } else {
                                        form.setValue("serviceOperations", [
                                          ...current,
                                          option.value,
                                        ]);
                                      }
                                      await form.trigger("serviceOperations");
                                      setServiceOperationOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        form
                                          .watch("serviceOperations")
                                          .includes(option.value)
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    {option.label}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <div className="flex flex-wrap gap-2">
                          {form.watch("serviceOperations").map((value) => {
                            const label =
                              serviceOperationOptions.find(
                                (o) => o.value === value
                              )?.label || value;
                            return (
                              <Badge
                                key={value}
                                variant="secondary"
                                className="bg-red-50 text-base px-3 py-1 font-medium items-center flex justify-between rounded-lg border-munchprimary"
                              >
                                {label}
                                <span
                                  className="ml-2  cursor-pointer"
                                  onClick={() =>
                                    form.setValue(
                                      "storeTypes",
                                      form
                                        .getValues("storeTypes")
                                        .filter((v) => v !== value)
                                    )
                                  }
                                >
                                  <X className="w-4 font-black" />
                                </span>
                              </Badge>
                            );
                          })}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Step 3: Working Hours */}
              {step === 3 && (
                <div className="space-y-4">
                  {daysOfWeek.map((day) => {
                    const isEnabled = form.watch(`workingHours.${day}.enabled`);
                    const start = form.watch(`workingHours.${day}.start`);
                    const end = form.watch(`workingHours.${day}.end`);
                    const isOpen = openDays[day] || false;

                    // const openKey = `open_${day}`;
                    // const isOpen = form.watch(openKey) || false;

                    // const toggleOpen = () => {
                    //   form.setValue(openKey, !isOpen);
                    // };

                    const formatTime = (time: string) => {
                      const [hours, minutes] = time.split(":");
                      const h = parseInt(hours);
                      const ampm = h >= 12 ? "PM" : "AM";
                      const formattedHours = h % 12 || 12;
                      return `${formattedHours}:${minutes} ${ampm}`;
                    };

                    const resetDay = () => {
                      form.setValue(`workingHours.${day}.start`, "08:00");
                      form.setValue(`workingHours.${day}.end`, "20:00");
                    };

                    return (
                      <div
                        key={day}
                        className="flex flex-col rounded-lg border p-4 space-y-3"
                      >
                        <div className="flex gap-4 items-center">
                          <div className="flex items-center gap-4">
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={(checked) =>
                                form.setValue(
                                  `workingHours.${day}.enabled`,
                                  checked
                                )
                              }
                            />
                            <span className="font-medium">{day}</span>
                          </div>

                          <div className="flex justify-between w-full items-center gap-3">
                            <span className="text-sm text-muted-foreground">
                              {formatTime(start)} - {formatTime(end)}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleOpen(day)}
                            >
                              <Image
                                src={"/images/icon/ChevronUp.svg"}
                                width={15}
                                height={15}
                                alt="up arrow"
                                className={cn(
                                  "",
                                  isOpen &&
                                    "rotate-180 transition-transform duration-200 ease-in-out"
                                )}
                              />
                            </Button>
                          </div>
                        </div>

                        {isOpen && (
                          <div className="flex items-center gap-10 justify-between pt-3">
                            <div className="flex items-center gap-4 w-full">
                              <div className="w-full">
                                <p className="text-slate-500 mb-2">
                                  Start Time
                                </p>
                                <Input
                                  type="time"
                                  value={start}
                                  className="h-10 w-full"
                                  onChange={(e) =>
                                    form.setValue(
                                      `workingHours.${day}.start`,
                                      e.target.value
                                    )
                                  }
                                />
                              </div>
                              <div className="w-full">
                                <p className="text-slate-500 mb-2">
                                  Close Time
                                </p>
                                <Input
                                  type="time"
                                  value={end}
                                  className="h-10"
                                  onChange={(e) =>
                                    form.setValue(
                                      `workingHours.${day}.end`,
                                      e.target.value
                                    )
                                  }
                                />
                              </div>
                            </div>
                            <div>
                              <p className="mb-2 text-transparent">a</p>
                              <div
                                className="rounded-lg bg-accent px-2"
                                onClick={resetDay}
                              >
                                <BrushCleaning className="text-munchprimary w-10 h-10 p-2" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Step 4: Store Address */}
              {step === 4 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-normal text-slate-500">
                            Country <span className="text-munchred">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Nigeria"
                              className="h-12 placeholder:text-slate-400"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-normal text-slate-500">
                            State <span className="text-munchred">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Lagos"
                              className="h-12 placeholder:text-slate-400"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="lga"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-normal text-slate-500">
                          LGA <span className="text-munchred">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Select local government area"
                            className="h-12 placeholder:text-slate-400"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="streetName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-normal text-slate-500">
                          Street Name <span className="text-munchred">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter street name"
                            className="h-12 placeholder:text-slate-400"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fullAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-normal text-slate-500">
                          Full Address <span className="text-munchred">*</span>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter full address"
                            className="h-25 placeholder:text-slate-400"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between">
                {step > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    className="rounded-full h-12 basis-1/6"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                )}
                <div className="basis-5/6 ps-5">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="bg-munchprimary hover:bg-munchprimaryDark rounded-full px-12 py-6 w-full"
                  >
                    {isLoading ? (
                      <LoaderCircle className="animate-spin" />
                    ) : step === 4 ? (
                      "Register Store"
                    ) : (
                      "Continue"
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
