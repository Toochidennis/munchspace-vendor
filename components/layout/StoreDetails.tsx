"use client";

import React, { useState } from "react";
import { Card } from "../ui/card";
import Image from "next/image";
import { Button } from "../ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import { Switch } from "../ui/switch";
import { BrushCleaning, ChevronsUpDown, Check, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { Input } from "../ui/input";
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
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { X as XIcon } from "lucide-react";

const daysOfWeek = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const setupSchema = z.object({
  workingHours: z.record(
    z.string(),
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

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

const serviceOperationOptions = [
  { value: "take-out", label: "Take-Out" },
  { value: "take-in", label: "Take-In" },
  { value: "delivery", label: "Delivery" },
];

const storeTypeOptions = [
  { value: "casual-dining", label: "Casual Dining" },
  { value: "fast-casual", label: "Fast-Casual" },
  { value: "fine-dining", label: "Fine Dining" },
  { value: "cafe", label: "Cafe" },
  { value: "food-truck", label: "Food Truck" },
  { value: "bakery", label: "Bakery" },
];

const storeInfoSchema = z.object({
  storeName: z.string().min(1, "Store name is required"),
  email: z.string().email("Invalid email format"),
  phone: z.string().min(1, "Phone number is required"),
  establishedDate: z.string().min(1, "Established date is required"),
  storeAddress: z.string().min(1, "Store address is required"),
  businessStatus: z.string().min(1, "Business status is required"),
  storeTypes: z.array(z.string()).min(1, "At least one store type is required"),
  serviceOperations: z
    .array(z.string())
    .min(1, "At least one service operation is required"),
  website: z.string().optional(),
  activationCode: z.string().min(1, "Activation code is required"),
});

type StoreInfoValues = z.infer<typeof storeInfoSchema>;

const StoreDetails = () => {
  const [storeImage, setStoreImage] = useState("/images/store-placeholder.png");
  const [openDays, setOpenDays] = useState<Record<string, boolean>>({});
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [serviceOperationOpen, setServiceOperationOpen] = useState(false);
  const [storeTypeOpen, setStoreTypeOpen] = useState(false);
  const [storeInfo, setStoreInfo] = useState<StoreInfoValues>({
    storeName: "Bo Cafe",
    email: "bocafe1600@gmail.com",
    phone: "+123 456 7898",
    establishedDate: "04 Aug, 2009",
    storeAddress: "BLK 15 26 Ayoade Olubowale Cres. Lagos State",
    businessStatus: "Operational",
    storeTypes: ["casual-dining", "fast-casual"],
    serviceOperations: ["take-out", "take-in", "delivery"],
    website: "N/A",
    activationCode: "GH65TY",
  });

  const toggleOpen = (day: string) => {
    setOpenDays((prev) => ({ ...prev, [day]: !prev[day] }));
  };

  const form = useForm<SetupValues>({
    resolver: zodResolver(setupSchema),
    mode: "onChange",
    defaultValues: {
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

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const storeForm = useForm<StoreInfoValues>({
    resolver: zodResolver(storeInfoSchema),
    defaultValues: storeInfo,
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.size <= 2 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setStoreImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onPasswordSubmit = (data: PasswordFormValues) => {
    console.log("Password change submitted:", data);
    passwordForm.reset();
    setIsPasswordModalOpen(false);
  };

  const onStoreSubmit = (data: StoreInfoValues) => {
    setStoreInfo(data);
    storeForm.reset(data);
    setIsStoreModalOpen(false);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "PM" : "AM";
    const formattedHours = h % 12 || 12;
    return `${formattedHours}:${minutes} ${ampm}`;
  };

  const resetDay = (day: string) => {
    form.setValue(`workingHours.${day}.start`, "08:00");
    form.setValue(`workingHours.${day}.end`, "20:00");
  };

  return (
    <div>
      {/* Store Image Upload */}
      <Card className="p-4 md:p-8 bg-g border-gray-100 shadow-none">
        <div className="flex items-center gap-4">
          <div className="flex gap-8">
            <div className="relative group">
              <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-200">
                <Image
                  src={storeImage || "/images/store-placeholder.png"}
                  alt="Store"
                  width={100}
                  height={100}
                  className="object-cover w-full h-full"
                />
              </div>
            </div>
          </div>
          <label className="flex flex-col bg-opacity-40 cursor-pointer text-sm group-hover:opacity-100">
            <div className="flex gap-2 items-center">
              <Image
                src={"/images/frame.svg"}
                width={15}
                height={15}
                alt="frame"
              />
              <span className="text-blue-500 whitespace-nowrap">
                Click to upload store image
              </span>
            </div>
            <span className="text-sm mt-2 text-slate-700">
              PNG or JPEG (Max. File Size: 2MB)
            </span>
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>
        </div>
      </Card>

      {/* Store Information */}
      <div className="space-y-6">
        <Card className="p-8 border-gray-100 shadow-none">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-900">
              Store Information
            </h2>
            <Button
              variant="outline"
              className="border-gray-400 rounded-full text-gray-700"
              onClick={() => setIsStoreModalOpen(true)}
            >
              Update
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-base">
            <div>
              <p className="text-gray-500 mb-1 text-sm">Store Name</p>
              <p className="font-medium text-slate-700">
                {storeInfo.storeName}
              </p>
            </div>
            <div>
              <p className="text-gray-500 mb-1 text-sm">Email</p>
              <p className="font-medium text-slate-700">{storeInfo.email}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1 text-sm">Phone</p>
              <p className="font-medium text-slate-700">{storeInfo.phone}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1 text-sm">Established Date</p>
              <p className="font-medium text-slate-700">
                {storeInfo.establishedDate}
              </p>
            </div>
            <div>
              <p className="text-gray-500 mb-1 text-sm">Store Address</p>
              <p className="font-medium text-slate-700">
                {storeInfo.storeAddress}
              </p>
            </div>
            <div>
              <p className="text-gray-500 mb-1 text-sm">Business Status</p>
              <p className="font-medium text-slate-700">
                {storeInfo.businessStatus}
              </p>
            </div>
            <div>
              <p className="text-gray-500 mb-1 text-sm">Restaurant Type</p>
              <p className="font-medium text-slate-700">
                {storeInfo.storeTypes
                  .map(
                    (v) =>
                      storeTypeOptions.find((o) => o.value === v)?.label || v
                  )
                  .join(", ")}
              </p>
            </div>
            <div>
              <p className="text-gray-500 mb-1 text-sm">Service Operations</p>
              <p className="font-medium text-slate-700">
                {storeInfo.serviceOperations
                  .map(
                    (v) =>
                      serviceOperationOptions.find((o) => o.value === v)
                        ?.label || v
                  )
                  .join(", ")}
              </p>
            </div>
            <div>
              <p className="text-gray-500 mb-1 text-sm">Website</p>
              <p className="font-medium text-slate-700">{storeInfo.website}</p>
            </div>
            <div className="md:col-span-3">
              <p className="text-gray-500 mb-1 text-sm">
                Store Activation Code
              </p>
              <p className="font-medium text-slate-700">
                {storeInfo.activationCode}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Working Hours */}
      <Card className="md:p-8 p-2 py-4 border-gray-100 shadow-none">
        <Accordion type="single" collapsible>
          <AccordionItem value="working-hours">
            <AccordionTrigger className="text-xl font-bold text-gray-900">
              Working Hours
            </AccordionTrigger>
            <AccordionContent className="pb-6">
              <div className="space-y-4">
                {daysOfWeek.map((day) => {
                  const isEnabled = form.watch(`workingHours.${day}.enabled`);
                  const start = form.watch(`workingHours.${day}.start`);
                  const end = form.watch(`workingHours.${day}.end`);
                  const isOpen = openDays[day] || false;

                  return (
                    <div
                      key={day}
                      className="flex flex-col rounded-lg border p-2 py-4 md:p-4 space-y-3"
                    >
                      <div className="flex gap-2 md:gap-4 items-center">
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

                        <div className="flex justify-between whitespace-nowrap w-full items-center gap-3">
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
                              src={"/images/ChevronUp.svg"}
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
                              <p className="text-slate-500 mb-2">Start Time</p>
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
                              <p className="text-slate-500 mb-2">Close Time</p>
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
                              className="rounded-lg bg-accent px-2 cursor-pointer"
                              onClick={() => resetDay(day)}
                            >
                              <BrushCleaning className="text-munchprimary w-10 h-10 p-2" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    className="border-gray-400 rounded-full text-gray-700"
                  >
                    Update
                  </Button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>

      {/* Change Passwords */}
      <Card className="p-8 border-gray-100 shadow-none flex justify-between">
        <div className="flex justify-between items-center w-full">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Change Passwords
            </h2>
            <p className="text-gray-600 text-sm">
              Update your password from your old one
            </p>
          </div>
          <Button
            variant="outline"
            className="border-gray-400 text-gray-700 rounded-full"
            onClick={() => setIsPasswordModalOpen(true)}
          >
            Change
          </Button>
        </div>
      </Card>

      {/* Password Change Modal */}
      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Change Password
            </DialogTitle>
          </DialogHeader>

          <Form {...passwordForm}>
            <form
              onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
              className="space-y-6"
            >
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-normal text-slate-500">
                      Current Password
                      <span className="-ms-1 pt-1 text-xl text-munchred">
                        *
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter current password"
                        className="h-12"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-normal text-slate-500">
                      New Password
                      <span className="-ms-1 pt-1 text-xl text-munchred">
                        *
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter new password"
                        className="h-12"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-normal text-slate-500">
                      Confirm New Password
                      <span className="-ms-1 pt-1 text-xl text-munchred">
                        *
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Confirm new password"
                        className="h-12"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-6 bg-gray-100 h-10 text-black"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-munchprimary hover:bg-munchprimaryDark h-10 rounded-lg"
                >
                  Update Password
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Store Info Update Modal */}
      <div
        className={cn(
          "bg-black/50 z-50 w-full absolute right-0 top-0 h-screen overflow-hidden flex justify-center items-center",
          isStoreModalOpen ? "absolute" : "hidden"
        )}
      >
        <div className="w-85  md:w-xl bg-white font-rubik rounded-lg py-5 relative max-h-120 overflow-y-auto">
          <div className="flex justify-between px-3 md:px-6">
            <h1 className="text-xl font-semibold">Update Store Information</h1>
            <X
              className="text-gray-600"
              onClick={() => setIsStoreModalOpen(false)}
            />
          </div>
          <hr className="mt-3 mb-5" />
          <Form {...storeForm}>
            <form
              onSubmit={storeForm.handleSubmit(onStoreSubmit)}
              className="space-y-6 px-3 md:px-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={storeForm.control}
                  name="storeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-normal text-slate-500">
                        Store Name
                        <span className="-ms-1 pt-1 text-xl text-munchred">
                          *
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Store Name"
                          className="h-12"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={storeForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-normal text-slate-500">
                        Email
                        <span className="-ms-1 pt-1 text-xl text-munchred">
                          *
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Email"
                          className="h-12"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={storeForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-normal text-slate-500">
                        Phone
                        <span className="-ms-1 pt-1 text-xl text-munchred">
                          *
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Phone"
                          className="h-12"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={storeForm.control}
                  name="establishedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-normal text-slate-500">
                        Established Date
                        <span className="-ms-1 pt-1 text-xl text-munchred">
                          *
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Established Date"
                          className="h-12"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={storeForm.control}
                  name="storeAddress"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="font-normal text-slate-500">
                        Store Address
                        <span className="-ms-1 pt-1 text-xl text-munchred">
                          *
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Store Address"
                          className="h-12"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={storeForm.control}
                  name="businessStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-normal text-slate-500">
                        Business Status
                        <span className="-ms-1 pt-1 text-xl text-munchred">
                          *
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Business Status"
                          className="h-12"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={storeForm.control}
                  name="storeTypes"
                  render={() => (
                    <FormItem className="mb-5 md:col-span-2">
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
                                {storeForm.watch("storeTypes").length > 0
                                  ? `${
                                      storeForm.watch("storeTypes").length
                                    } selected`
                                  : "Select store types"}
                              </span>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-full p-0"
                          onOpenAutoFocus={(e) => e.preventDefault()}
                        >
                          <Command>
                            <CommandInput
                              autoFocus={false}
                              placeholder="Search store type..."
                            />
                            <CommandEmpty>No type found.</CommandEmpty>
                            <CommandGroup>
                              {storeTypeOptions.map((option) => (
                                <CommandItem
                                  key={option.value}
                                  onSelect={async () => {
                                    const current =
                                      storeForm.getValues("storeTypes");
                                    if (current.includes(option.value)) {
                                      storeForm.setValue(
                                        "storeTypes",
                                        current.filter(
                                          (v) => v !== option.value
                                        )
                                      );
                                    } else {
                                      storeForm.setValue("storeTypes", [
                                        ...current,
                                        option.value,
                                      ]);
                                    }
                                    await storeForm.trigger("storeTypes");
                                    setStoreTypeOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      storeForm
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
                      <div className="flex flex-wrap gap-2 mt-2">
                        {storeForm.watch("storeTypes").map((value) => {
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
                                className="ml-2 cursor-pointer"
                                onClick={() =>
                                  storeForm.setValue(
                                    "storeTypes",
                                    storeForm
                                      .getValues("storeTypes")
                                      .filter((v) => v !== value)
                                  )
                                }
                              >
                                <XIcon className="w-4 font-black" />
                              </span>
                            </Badge>
                          );
                        })}
                      </div>
                      <FormMessage className="" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={storeForm.control}
                  name="serviceOperations"
                  render={() => (
                    <FormItem className="mb-0 md:col-span-2">
                      <FormLabel className="font-normal text-slate-500">
                        Service Operations{" "}
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
                                {storeForm.watch("serviceOperations").length > 0
                                  ? `${
                                      storeForm.watch("serviceOperations")
                                        .length
                                    } selected`
                                  : "Select service operations"}
                              </span>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent
                          onOpenAutoFocus={(e) => e.preventDefault()}
                          className="w-full p-0"
                        >
                          <Command>
                            <CommandInput
                              autoFocus={false}
                              placeholder="Search operation..."
                            />
                            <CommandEmpty>No operation found.</CommandEmpty>
                            <CommandGroup>
                              {serviceOperationOptions.map((option) => (
                                <CommandItem
                                  key={option.value}
                                  onSelect={async () => {
                                    const current =
                                      storeForm.getValues("serviceOperations");
                                    if (current.includes(option.value)) {
                                      storeForm.setValue(
                                        "serviceOperations",
                                        current.filter(
                                          (v) => v !== option.value
                                        )
                                      );
                                    } else {
                                      storeForm.setValue("serviceOperations", [
                                        ...current,
                                        option.value,
                                      ]);
                                    }
                                    await storeForm.trigger(
                                      "serviceOperations"
                                    );
                                    setServiceOperationOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      storeForm
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
                      <div className="flex flex-wrap gap-2 mt-2">
                        {storeForm.watch("serviceOperations").map((value) => {
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
                                className="ml-2 cursor-pointer"
                                onClick={() =>
                                  storeForm.setValue(
                                    "serviceOperations",
                                    storeForm
                                      .getValues("serviceOperations")
                                      .filter((v) => v !== value)
                                  )
                                }
                              >
                                <XIcon className="w-4 font-black" />
                              </span>
                            </Badge>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={storeForm.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-normal text-slate-500">
                        Website
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Website"
                          className="h-12"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={storeForm.control}
                  name="activationCode"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="font-normal text-slate-500">
                        Store Activation Code
                        <span className="-ms-1 pt-1 text-xl text-munchred">
                          *
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Store Activation Code"
                          className="h-12"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsStoreModalOpen(false)}
                  className="px-6 bg-gray-100 h-10 text-black"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-munchprimary hover:bg-munchprimaryDark h-10 rounded-lg"
                >
                  Update
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default StoreDetails;
