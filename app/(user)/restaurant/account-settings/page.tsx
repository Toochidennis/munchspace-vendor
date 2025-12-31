"use client";

import { useState } from "react";
import Image from "next/image";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge, BrushCleaning, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

// Charges imports
import { Search, Pencil, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import StorePreview from "@/components/layout/StorePreview";
import KycVerification from "@/components/layout/KycVerification";
import Charges from "@/components/layout/Charges";

const setupSchema = z.object({
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

// Charges tab section
interface Charge {
  id: number;
  name: string;
  type: "amount" | "percentage";
  value: string; // e.g., "₦200.00" or "5%"
  lastUpdated: string;
}

const initialCharges: Charge[] = [
  {
    id: 1,
    name: "Packaging Fee",
    type: "amount",
    value: "₦200.00",
    lastUpdated: "Dec 15, 2025",
  },
  {
    id: 2,
    name: "Service Charge",
    type: "percentage",
    value: "5%",
    lastUpdated: "Dec 10, 2025",
  },
  {
    id: 3,
    name: "Delivery Fee",
    type: "amount",
    value: "₦500.00",
    lastUpdated: "Dec 8, 2025",
  },
  {
    id: 4,
    name: "VAT",
    type: "percentage",
    value: "7.5%",
    lastUpdated: "Nov 30, 2025",
  },
  {
    id: 5,
    name: "Convenience Fee",
    type: "amount",
    value: "₦100.00",
    lastUpdated: "Nov 25, 2025",
  },
];

export default function AccountSettingsPage() {
  const [storeImage, setStoreImage] = useState("/images/store-placeholder.png");
  const [cacFile, setCacFile] = useState<File | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [safetyFile, setSafetyFile] = useState<File | null>(null);
  const [tin, setTin] = useState("");

  const handleFileUpload =
    (setter: (file: File | null) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && file.size <= 7 * 1024 * 1024) {
        setter(file);
      }
    };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.size <= 2 * 1024 * 1024) {
      // 2MB limit
      const reader = new FileReader();
      reader.onloadend = () => {
        setStoreImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // State to manage open days in working hours
  const [openDays, setOpenDays] = useState<Record<string, boolean>>({});
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
  

  return (
    <div className="min-h-screen p-6 md:p-8 mt-10 md:mt-0">
      <div className="max-w-7xl mx-auto">
        {/* Page Title */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-gray-600 text-sm mt-2">
            View and manage your account settings related to your store.
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="store-details" className="mt-10">
          <div className=" max-w-svw overflow-x-auto">
            <TabsList className="bg-transparent rounded-none md:w-fit shadow-none p-0 md:gap-4 border-b-2 border-gray-200">
              <TabsTrigger
                value="store-details"
                className="px-2 md:px-4 data-[state=active]:text-munchprimary data-[state=active]:font-medium data-[state=active]:border-b-2  data-[state=active]:border-munchprimary pb-1 md:pb-2 rounded-none text-base font-normal"
              >
                Store Details
              </TabsTrigger>
              <TabsTrigger
                value="kyc"
                className="px-2 md:px-4 data-[state=active]:text-munchprimary data-[state=active]:font-medium data-[state=active]:border-b-2 data-[state=active]:border-munchprimary pb-1 md:pb-2 rounded-none text-base font-normal"
              >
                KYC Verification
              </TabsTrigger>
              <TabsTrigger
                value="charges"
                className="px-2 md:px-4 data-[state=active]:text-munchprimary data-[state=active]:font-medium data-[state=active]:border-b-2 data-[state=active]:border-munchprimary pb-1 md:pb-2 rounded-none text-base font-normal"
              >
                Charges & Fees
              </TabsTrigger>
              <TabsTrigger
                value="preview"
                className="px-2 md:px-4 data-[state=active]:text-munchprimary data-[state=active]:font-medium data-[state=active]:border-b-2 data-[state=active]:border-munchprimary pb-1 md:pb-2 rounded-none text-base font-normal"
              >
                Store Preview
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="store-details" className="mt-5 space-y-12">
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
                  >
                    Update
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-base">
                  <div>
                    <p className="text-gray-500 mb-1 text-sm">Store Name</p>
                    <p className="font-medium text-slate-700">Bo Cafe</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1 text-sm">Email</p>
                    <p className="font-medium text-slate-700">
                      bocafe1600@gmail.com
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1 text-sm">Phone</p>
                    <p className="font-medium text-slate-700">+123 456 7898</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1 text-sm">
                      Established Date
                    </p>
                    <p className="font-medium text-slate-700">04 Aug, 2009</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1 text-sm">Store Address</p>
                    <p className="font-medium text-slate-700">
                      BLK 15 26 Ayoade Olubowale Cres. Lagos State
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1 text-sm">
                      Business Status
                    </p>
                    <p className="font-medium text-slate-700">Operational</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1 text-sm">
                      Restaurant Type
                    </p>
                    <p className="font-medium text-slate-700">
                      Casual Dining, Fast-Casual
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1 text-sm">
                      Service Options
                    </p>
                    <p className="font-medium text-slate-700">
                      Take-Out, Take-In, Delivery
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1 text-sm">Website</p>
                    <p className="font-medium text-slate-700">N/A</p>
                  </div>
                  <div className="md:col-span-3">
                    <p className="text-gray-500 mb-1 text-sm">
                      Store Activation Code
                    </p>
                    <p className="font-medium text-slate-700">GH65TY</p>
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
                        const isEnabled = form.watch(
                          `workingHours.${day}.enabled`
                        );
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
              <div className="flex justify-between items-center">
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
                >
                  Change
                </Button>
              </div>
            </Card>
          </TabsContent>
          <TabsContent value="kyc" className="mt-5 space-y-12">
            <KycVerification />
          </TabsContent>
          <TabsContent value="charges" className="mt-5 space-y-12">
            <Charges />
          </TabsContent>
          <TabsContent value="preview" className="mt-5 space-y-12">
            <StorePreview />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
