"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import Link from "next/link";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { getAccessToken } from "@/app/lib/auth";

const setupSchema = z.object({
  storeImage: z.string().url().optional(),
  legalName: z.string().min(1, "Legal name is required."),
  displayName: z.string().min(1, "Display name is required."),
  storeEmail: z.string().email("Invalid email address."),
  phoneNumber: z.string().min(10, "Valid phone number required."),
  establishedDate: z.date("Established date is required."),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters."),
  socialLink: z.string().url({ message: "Invalid URL" }).optional(),

  businessType: z.string().min(1, "Select a business type."),
  brandType: z.string().optional(),
  serviceOperations: z
    .array(z.string())
    .min(1, "Select at least one service operation."),

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
  postalCode: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
});

type SetupValues = z.infer<typeof setupSchema>;

type Option = { value: string; label: string };

const daysOfWeek = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const API_BASE = "https://api.munchspace.io/api/v1";
const API_KEY =
  "eH4u8eujRzIrLWE+xkqyUWg33ggZ1Ts5bAKi/Ze5l23dyc7aLZSVMEssML0vUvDHrhchMtyskMxzGW3c4jhQCA==";

const GOOGLE_API_KEY = "AIzaSyDjoKEpZBTaQuO4dPjbN4W1tHEdxuacPFI";

export default function SetupStorePage() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [businessTypeOpen, setBusinessTypeOpen] = useState(false);
  const [brandTypeOpen, setBrandTypeOpen] = useState(false);
  const [serviceOperationOpen, setServiceOperationOpen] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  const [businessTypes, setBusinessTypes] = useState<Option[]>([]);
  const [brandTypes, setBrandTypes] = useState<Option[]>([]);
  const [serviceOperations, setServiceOperations] = useState<Option[]>([]);
  const [metaLoading, setMetaLoading] = useState(true);
  const [metaError, setMetaError] = useState("");

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);

  function getCookie(name: string): string | null {
    return (
      document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${name}=`))
        ?.split("=")[1] ?? null
    );
  }

  const form = useForm<SetupValues>({
    resolver: zodResolver(setupSchema),
    mode: "onChange",
    defaultValues: {
      businessType: "",
      brandType: "",
      serviceOperations: [],
      legalName: "",
      displayName: "",
      storeEmail: "",
      phoneNumber: "",
      description: "",
      country: "",
      state: "",
      lga: "",
      streetName: "",
      fullAddress: "",
      postalCode: "",
      latitude: 0,
      longitude: 0,
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

  useEffect(() => {
    async function fetchMeta() {
      setMetaLoading(true);
      setMetaError("");
      try {
        const [btRes, brRes, soRes] = await Promise.all([
          fetch(`${API_BASE}/meta/business-types`, {
            headers: { "x-api-key": API_KEY },
          }),
          fetch(`${API_BASE}/meta/brand-types`, {
            headers: { "x-api-key": API_KEY },
          }),
          fetch(`${API_BASE}/meta/service-operations`, {
            headers: { "x-api-key": API_KEY },
          }),
        ]);

        let btData: any = [];
        let brData: any = [];
        let soData: any = [];

        if (btRes.ok) {
          const json = await btRes.json();
          btData = Array.isArray(json) ? json : json.data || json.items || [];
        } else {
          throw new Error(`Business types: ${btRes.status}`);
        }

        if (brRes.ok) {
          const json = await brRes.json();
          brData = Array.isArray(json) ? json : json.data || json.items || [];
        } else {
          throw new Error(`Brand types: ${brRes.status}`);
        }

        if (soRes.ok) {
          const json = await soRes.json();
          soData = Array.isArray(json) ? json : json.data || json.items || [];
        } else {
          throw new Error(`Service operations: ${soRes.status}`);
        }

        const normalize = (arr: any[]) =>
          arr.map((item) => ({
            value: String(item.id),
            label: item.label || item.name || String(item),
          }));

        setBusinessTypes(normalize(btData));
        setBrandTypes(normalize(brData));
        setServiceOperations(normalize(soData));
      } catch (err: any) {
        console.error("Meta fetch error:", err);
        setMetaError(
          "Failed to load business types, brand types or service operations."
        );
      } finally {
        setMetaLoading(false);
      }
    }

    fetchMeta();
  }, []);

  useEffect(() => {
    if (step !== 4) return;

    async function initMap() {
      try {
        setOptions({
          key: GOOGLE_API_KEY,
          libraries: ["places"],
        });

        const [{ Map }, placesLib] = await Promise.all([
          importLibrary("maps"),
          importLibrary("places"),
        ]);

        const mapDiv = document.getElementById("map");
        if (!mapDiv) return;

        const initialCenter = { lat: 6.5244, lng: 3.3792 };

        const newMap = new Map(mapDiv, {
          center: initialCenter,
          zoom: 12,
        });
        setMap(newMap);

        const newMarker = new google.maps.Marker({
          position: initialCenter,
          map: newMap,
          draggable: true,
        });
        setMarker(newMarker);

        newMarker.addListener("dragend", (e: google.maps.MapMouseEvent) => {
          if (e.latLng) {
            form.setValue("latitude", e.latLng.lat());
            form.setValue("longitude", e.latLng.lng());
          }
        });

        newMap.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (e.latLng) {
            newMarker.setPosition(e.latLng);
            form.setValue("latitude", e.latLng.lat());
            form.setValue("longitude", e.latLng.lng());
          }
        });

        const searchInput = document.getElementById(
          "location-search"
        ) as HTMLInputElement;
        if (searchInput) {
          const autocomplete = new placesLib.Autocomplete(searchInput);

          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            if (place.geometry?.location) {
              newMap.setCenter(place.geometry.location);
              newMap.setZoom(15);
              newMarker.setPosition(place.geometry.location);
              form.setValue("latitude", place.geometry.location.lat());
              form.setValue("longitude", place.geometry.location.lng());
            }
          });
        }
      } catch (error) {
        console.error("Failed to load Google Maps:", error);
      }
    }

    initMap();
  }, [step, form]);

  const progress = (step / 4) * 100;

  const validateCurrentStep = async () => {
    let fields: (keyof SetupValues)[] = [];

    if (step === 1)
      fields = [
        "legalName",
        "displayName",
        "storeEmail",
        "phoneNumber",
        "establishedDate",
        "description",
      ];
    if (step === 2) fields = ["businessType", "serviceOperations"];
    if (step === 4)
      fields = [
        "country",
        "state",
        "lga",
        "streetName",
        "fullAddress",
        "latitude",
        "longitude",
      ];

    return await form.trigger(fields);
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (!isValid) return;

    if (step === 4) {
      setIsLoading(true);

      try {
        const values = form.getValues();

        const transformedWorkingHours = daysOfWeek
          .map((day) => ({
            day: day.toUpperCase(),
            openTime: values.workingHours[day].start,
            closeTime: values.workingHours[day].end,
          }))
          .filter((_, index) => values.workingHours[daysOfWeek[index]].enabled);

        // Prepare FormData for multipart/form-data
        const formData = new FormData();

        formData.append("legalName", values.legalName);
        formData.append("displayName", values.displayName);
        formData.append("email", values.storeEmail);
        formData.append("phone", values.phoneNumber);
        formData.append("description", values.description);

        if (values.socialLink) {
          formData.append("website", values.socialLink);
        }

        formData.append(
          "establishedAt",
          format(values.establishedDate, "yyyy-MM-dd")
        );

        if (values.businessType) {
          formData.append("businessTypeId", values.businessType);
        }
        if (values.brandType) {
          formData.append("brandTypeId", values.brandType);
        }

        // Send each service operation ID separately
        values.serviceOperations.forEach((id) => {
          formData.append("serviceOperationIds[]", id);
        });

        // Complex objects as JSON strings
        formData.append(
          "workingHours",
          JSON.stringify(transformedWorkingHours)
        );

        const addressObj = {
          country: values.country,
          state: values.state,
          lga: values.lga,
          streetName: values.streetName,
          fullAddress: values.fullAddress,
          postalCode: values.postalCode || null,
          latitude: Number(values.latitude),
          longitude: Number(values.longitude),
        };
        formData.append("address", JSON.stringify(addressObj));
        console.log(addressObj.latitude, addressObj.longitude)

        if (values.storeImage) {
          formData.append("imageUrl", values.storeImage);
        }

        const accessToken = getAccessToken();


        const response = await fetch(`${API_BASE}/vendors/me/businesses`, {
          method: "POST",
          headers: {
            // Do NOT set Content-Type → browser will handle multipart boundary
            "x-api-key": API_KEY,
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        });

        console.log("formData", [...formData.entries()]);

        const feedback = await response.json();
        // console.log("Server response:", feedback);

        if (response.ok) {
          console.log("Store created successfully!");
          // window.location.href = "/restaurant/dashboard";
        } else {
          console.error("Failed to create store:", feedback);
        }
      } catch (error) {
        console.error("Error submitting store:", error);
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(true);
      await new Promise((r) => setTimeout(r, 800));
      setIsLoading(false);
      setStep(step + 1);
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

    setUploading(true);

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    form.setValue("storeImage", localPreview);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "property-maestro-unsigned");

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/property-meastro/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (data.secure_url) {
        form.setValue("storeImage", data.secure_url);
        setPreviewUrl(data.secure_url);
      } else {
        throw new Error(data.error?.message || "Upload failed");
      }
    } catch (error: any) {
      console.error("Cloudinary upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  const [openDays, setOpenDays] = useState<Record<string, boolean>>({});

  const toggleOpen = (day: string) => {
    setOpenDays((prev) => ({ ...prev, [day]: !prev[day] }));
  };

  const formatBadgeLabel = (value: string, options: Option[]) => {
    const found = options.find((o) => o.value === value);
    return found ? found.label : value.replace(/_/g, " ");
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Left Background */}
      <div className="w-full relative hidden md:block">
        <div className="fixed w-1/2 pe-5">
          <Link href="/">
            <Image
              src={"/images/logo.svg"}
              width={100}
              height={75}
              alt="logo"
              className="hidden md:block absolute z-20 ms-5 mt-5"
            />
          </Link>
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
      <div className="flex items-center justify-center p-4 md:p-8 mt-10">
        <div className="w-full max-w-lg space-y-8">
          <Link href="/">
            <Image
              src={"/images/logo.svg"}
              width={100}
              height={75}
              alt="logo"
              className="lg:hidden"
            />
          </Link>
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
                {step === 2 && "Business Type (2/4)"}
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
                                    src={"/images/frame.svg"}
                                    width={15}
                                    height={15}
                                    alt="gallery"
                                  />
                                  Upload Store Image
                                </p>
                                <p className="text-xs text-center text-muted-foreground mt-2">
                                  PNG or JPEG (Max. File Size: 2MB)
                                </p>
                              </span>
                            </div>
                          </Button>
                        </label>
                      </div>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="legalName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-normal text-slate-500">
                          Legal Name <span className="text-munchred">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Legal name"
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
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-normal text-slate-500">
                          Display Name <span className="text-munchred">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Display name"
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
                                  "w-full justify-start text-left font-normal h-12 hover:text-slate-400 hover:bg-white",
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

                  <FormField
                    control={form.control}
                    name="socialLink"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-normal text-slate-500">
                          Website or Social Link (optional)
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://example.com"
                            className="h-12 placeholder:text-slate-400"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {/* Step 2: Business Type & Service Operations */}
              {step === 2 && (
                <div className="space-y-8">
                  {metaLoading && (
                    <p className="text-center">Loading options...</p>
                  )}
                  {metaError && (
                    <p className="text-center text-red-500">{metaError}</p>
                  )}

                  <FormField
                    control={form.control}
                    name="businessType"
                    render={() => (
                      <FormItem className="mb-5">
                        <FormLabel className="font-normal text-slate-500">
                          Business Type <span className="text-munchred">*</span>
                        </FormLabel>
                        <Popover
                          open={businessTypeOpen}
                          onOpenChange={setBusinessTypeOpen}
                        >
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between font-normal h-12 hover:text-slate-400 text-slate-400 hover:bg-white"
                                disabled={
                                  metaLoading || businessTypes.length === 0
                                }
                              >
                                <span className="truncate">
                                  {form.watch("businessType")
                                    ? formatBadgeLabel(
                                        form.watch("businessType"),
                                        businessTypes
                                      )
                                    : "Select business type"}
                                </span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-full p-0"
                            align="start"
                            side="bottom"
                          >
                            <Command className="max-h-72 overflow-y-auto">
                              <CommandInput placeholder="Search business type..." />
                              <CommandEmpty>No type found.</CommandEmpty>
                              <CommandGroup>
                                {businessTypes.map((option) => (
                                  <CommandItem
                                    key={option.value}
                                    onSelect={() => {
                                      form.setValue(
                                        "businessType",
                                        option.value
                                      );
                                      setBusinessTypeOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        form.watch("businessType") ===
                                          option.value
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="brandType"
                    render={() => {
                      const watchedBrandType = form.watch("brandType");

                      return (
                        <FormItem className="mb-5">
                          <FormLabel className="font-normal text-slate-500">
                            Brand Type (optional)
                          </FormLabel>
                          <Popover
                            open={brandTypeOpen}
                            onOpenChange={setBrandTypeOpen}
                          >
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className="w-full justify-between font-normal h-12 hover:text-slate-400 text-slate-400 hover:bg-white"
                                  disabled={
                                    metaLoading || brandTypes.length === 0
                                  }
                                >
                                  <span className="truncate">
                                    {watchedBrandType
                                      ? formatBadgeLabel(
                                          watchedBrandType,
                                          brandTypes
                                        )
                                      : "Select brand type"}
                                  </span>
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-full p-0"
                              align="start"
                              side="bottom"
                            >
                              <Command className="max-h-72 overflow-y-auto">
                                <CommandInput placeholder="Search brand type..." />
                                <CommandEmpty>No type found.</CommandEmpty>
                                <CommandGroup>
                                  {brandTypes.map((option) => (
                                    <CommandItem
                                      key={option.value}
                                      onSelect={() => {
                                        form.setValue(
                                          "brandType",
                                          watchedBrandType === option.value
                                            ? ""
                                            : option.value
                                        );
                                        setBrandTypeOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          watchedBrandType === option.value
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
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

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
                                disabled={
                                  metaLoading || serviceOperations.length === 0
                                }
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
                          <PopoverContent
                            className="w-full p-0"
                            align="start"
                            side="bottom"
                          >
                            <Command className="max-h-72 overflow-y-auto">
                              <CommandInput placeholder="Search operation..." />
                              <CommandEmpty>No operation found.</CommandEmpty>
                              <CommandGroup>
                                {serviceOperations.map((option) => (
                                  <CommandItem
                                    key={option.value}
                                    onSelect={() => {
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
                        <div className="flex flex-wrap gap-2 mt-2">
                          {form.watch("serviceOperations").map((value) => (
                            <Badge
                              key={value}
                              variant="secondary"
                              className="bg-red-50 text-base px-3 py-1 font-medium items-center flex justify-between rounded-lg border-munchprimary"
                            >
                              {formatBadgeLabel(value, serviceOperations)}
                              <span
                                className="ml-2 cursor-pointer"
                                onClick={() =>
                                  form.setValue(
                                    "serviceOperations",
                                    form
                                      .getValues("serviceOperations")
                                      .filter((v) => v !== value)
                                  )
                                }
                              >
                                <X className="w-4 font-black" />
                              </span>
                            </Badge>
                          ))}
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
                                  className="h-10 w-full"
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
                              <p className="mb-2 text-transparent">Reset</p>
                              <div
                                className="rounded-lg bg-accent px-2 cursor-pointer"
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
                  <FormItem>
                    <FormLabel className="font-normal text-slate-500">
                      Search Location
                    </FormLabel>
                    <Input
                      id="location-search"
                      placeholder="Search for a location..."
                      className="h-12"
                    />
                  </FormItem>

                  <div id="map" className="h-64 w-full rounded-lg border"></div>

                  <div className="grid md:grid-cols-2 gap-6">
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

                  <div className="grid md:grid-cols-2 gap-6">
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
                      name="postalCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-normal text-slate-500">
                            Postal Code (optional)
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. 100001"
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
                    disabled={
                      isLoading ||
                      (step === 2 &&
                        (metaLoading ||
                          businessTypes.length === 0 ||
                          serviceOperations.length === 0))
                    }
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
