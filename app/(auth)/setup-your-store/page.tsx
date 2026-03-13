"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  LoaderCircle,
  ArrowLeft,
  Check,
  ChevronsUpDown,
  X,
  BrushCleaning,
  AlertCircle,
  RefreshCw,
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
import { getAccessToken, hasBusiness, setBusinessId } from "@/app/lib/auth";
import { refreshAccessToken } from "@/app/lib/api";

// ────────────────────────────────────────────────
//  Authenticated Fetch (same as in orders page)
// ────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_MUNCHSPACE_API_BASE || "";
const API_KEY = process.env.NEXT_PUBLIC_MUNCHSPACE_API_KEY || "";
const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_MAP_API || "";

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
      headers: { ...headers, Authorization: `Bearer ${token}` },
    });
  }

  return response;
}

const setupSchema = z.object({
  storeImage: z.any().optional(), // not used in form, just for type safety
  legalName: z.string().min(1, "Legal name is required."),
  displayName: z.string().min(1, "Display name is required."),
  storeEmail: z.string().email("Invalid email address."),
  phoneNumber: z.string().min(10, "Valid phone number required."),
  establishedDate: z.date("Established date is required."),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters."),
  socialLink: z.string().optional(),

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
    }),
  ),

  country: z.string().min(1, "Country is required."),
  state: z.string().min(1, "State is required."),
  lga: z.string().min(1, "LGA is required."),
  streetName: z.string().min(1, "Street name is required."),
  city: z.string().min(1, "City is required."),
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

export default function SetupStorePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [businessTypeOpen, setBusinessTypeOpen] = useState(false);
  const [brandTypeOpen, setBrandTypeOpen] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [businessTypes, setBusinessTypes] = useState<Option[]>([]);
  const [brandTypes, setBrandTypes] = useState<Option[]>([]);
  const [serviceOperations, setServiceOperations] = useState<Option[]>([]);
  const [metaLoading, setMetaLoading] = useState(true);
  const [metaError, setMetaError] = useState("");
  const [fetchNetworkError, setFetchNetworkError] = useState<string | null>(
    null,
  );
  const [nigeriaData, setNigeriaData] = useState<{
    country: { id: string; code: string; name: string };
    states: { id: string; code: string; name: string }[];
  } | null>(null);
  const [statesLoading, setStatesLoading] = useState(true);
  const [statesError, setStatesError] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const [stateOpen, setStateOpen] = useState(false);
  const [lgas, setLgas] = useState<Option[]>([]);
  const [lgasLoading, setLgasLoading] = useState(false);
  const [lgasError, setLgasError] = useState("");
  const [lgaOpen, setLgaOpen] = useState(false);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);

  const form = useForm<SetupValues>({
    resolver: zodResolver(setupSchema),
    mode: "onChange",
    defaultValues: {
      legalName: "",
      displayName: "",
      storeEmail: "",
      phoneNumber: "",
      description: "",
      socialLink: "",
      country: "Nigeria",
      state: "",
      lga: "",
      streetName: "",
      city: "",
      postalCode: "",
      latitude: 0,
      longitude: 0,
      businessType: "",
      brandType: "",
      serviceOperations: [],
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
      setFetchNetworkError(null);

      try {
        const [btRes, brRes, soRes, nigeriaRes] = await Promise.all([
          authenticatedFetch(`${API_BASE}/meta/business-types`),
          authenticatedFetch(`${API_BASE}/meta/brand-types`),
          authenticatedFetch(`${API_BASE}/meta/service-operations`),
          authenticatedFetch(`${API_BASE}/meta/nigeria-states`),
        ]);

        const btJson = await btRes.json();
        const brJson = await brRes.json();
        const soJson = await soRes.json();
        const nigeriaJson = await nigeriaRes.json();

        const normalize = (arr: any[]) =>
          arr.map((item) => ({
            value: String(item.id),
            label: item.label || item.name || String(item),
          }));

        setBusinessTypes(normalize(btJson.data || btJson || []));
        setBrandTypes(normalize(brJson.data || brJson || []));
        setServiceOperations(normalize(soJson.data || soJson || []));

        if (
          nigeriaJson?.data?.country &&
          Array.isArray(nigeriaJson.data.states)
        ) {
          setNigeriaData(nigeriaJson.data);
        } else {
          setStatesError("Failed to load Nigerian states data structure.");
        }
      } catch (err: any) {
        console.error("Meta fetch error:", err);
        if (
          err.message?.includes("fetch") ||
          err.message?.includes("Network")
        ) {
          setFetchNetworkError(
            "Unable to load required data. Please check your internet connection.",
          );
        } else {
          setMetaError("Failed to load metadata. Please try again.");
        }
      } finally {
        setMetaLoading(false);
        setStatesLoading(false);
      }
    }

    fetchMeta();
  }, []);

  useEffect(() => {
    const selectedStateId = form.watch("state");
    form.setValue("lga", "");
    setLgas([]);
    setLgasError("");
    setLgasLoading(true);

    if (!selectedStateId || !nigeriaData?.states) {
      setLgasLoading(false);
      return;
    }

    let isCurrent = true;

    async function loadLgas() {
      try {
        const selectedState = nigeriaData?.states.find(
          (s) => s.id === selectedStateId,
        );
        if (!selectedState) throw new Error("State not found");

        const url = `${API_BASE}/meta/lgas?stateId=${encodeURIComponent(selectedState.id)}&stateCode=${encodeURIComponent(selectedState.code)}`;
        const response = await authenticatedFetch(url);

        if (!isCurrent) return;

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const json = await response.json();
        const rawArray = Array.isArray(json)
          ? json
          : (json.data ?? json.lgas ?? json.items ?? []);
        const normalized = rawArray
          .map((item: any) => ({
            value: String(item.id || item.lgaId || item.code || ""),
            label: item.name || item.lgaName || item.label || String(item),
          }))
          .filter((opt: any) => opt.value && opt.label.trim());

        if (!isCurrent) return;

        setLgas(normalized);
        setLgasError("");
        if (normalized.length === 1) {
          form.setValue("lga", normalized[0].value);
        }
      } catch (err: any) {
        if (!isCurrent) return;
        console.error("LGA fetch failed:", err);
        if (
          err.message?.includes("fetch") ||
          err.message?.includes("Network")
        ) {
          setFetchNetworkError(
            "Unable to load LGA data. Please check your connection.",
          );
        } else {
          setLgasError("Could not load LGAs for the selected state.");
        }
      } finally {
        if (isCurrent) setLgasLoading(false);
      }
    }

    loadLgas();

    return () => {
      isCurrent = false;
    };
  }, [form.watch("state"), nigeriaData, form]);

  // Google Maps initialization remains unchanged
  useEffect(() => {
    if (step !== 4) return;

    async function initMap() {
      try {
        setOptions({ key: GOOGLE_API_KEY, libraries: ["places"] });
        const [{ Map }, placesLib] = await Promise.all([
          importLibrary("maps"),
          importLibrary("places"),
        ]);

        const mapDiv = document.getElementById("map");
        if (!mapDiv) return;

        const initialCenter = { lat: 6.5244, lng: 3.3792 };
        const newMap = new Map(mapDiv, { center: initialCenter, zoom: 12 });
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
          "location-search",
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
        "city",
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
        let normalizedPhone = values.phoneNumber.trim();
        if (normalizedPhone.startsWith("0")) {
          normalizedPhone = normalizedPhone.substring(1);
        }
        if (!normalizedPhone.startsWith("+")) {
          normalizedPhone = "+234" + normalizedPhone;
        }

        const formData = new FormData();
        formData.append("legalName", values.legalName);
        formData.append("displayName", values.displayName);
        formData.append("email", values.storeEmail);
        formData.append("phone", normalizedPhone);
        formData.append("description", values.description);
        formData.append(
          "establishedAt",
          format(values.establishedDate, "yyyy-MM-dd"),
        );

        if (values.businessType)
          formData.append("businessTypeId", values.businessType);
        if (values.brandType) formData.append("brandTypeId", values.brandType);

        values.serviceOperations.forEach((id) => {
          formData.append("serviceOperationIds[]", id);
        });

        const enabledDays = daysOfWeek.filter(
          (day) => values.workingHours[day]?.enabled,
        );
        enabledDays.forEach((day, index) => {
          formData.append(`workingHours[${index}][day]`, day.toUpperCase());
          formData.append(
            `workingHours[${index}][openTime]`,
            values.workingHours[day].start,
          );
          formData.append(
            `workingHours[${index}][closeTime]`,
            values.workingHours[day].end,
          );
        });

        const addressObj = {
          countryId: nigeriaData?.country?.id || "",
          stateId: values.state,
          lgaId: values.lga,
          streetName: values.streetName,
          city: values.city,
          postalCode: values.postalCode || null,
          latitude: Number(values.latitude),
          longitude: Number(values.longitude),
        };
        formData.append("address", JSON.stringify(addressObj));

        if (selectedImageFile) {
          formData.append("image", selectedImageFile);
        }

        const response = await authenticatedFetch(
          `${API_BASE}/vendors/me/businesses`,
          {
            method: "POST",
            body: formData,
          },
        );

        const feedback = await response.json();

        if (response.ok) {
          setBusinessId(feedback.data.businessId);
          hasBusiness(true);
          toast.success("Store created successfully!", {
            description: "Redirecting to dashboard...",
            duration: 3000,
          });
          setTimeout(() => {
            router.push("/restaurant/dashboard");
          }, 1500);
        } else {
          toast.error("Failed to create store", {
            description:
              feedback.message || "Please check your input and try again.",
          });
        }
      } catch (error) {
        toast.error("An error occurred", {
          description: "Something went wrong while creating the store.",
        });
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    setSelectedImageFile(file);
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
  };

  const [openDays, setOpenDays] = useState<Record<string, boolean>>({});
  const toggleOpen = (day: string) => {
    setOpenDays((prev) => ({ ...prev, [day]: !prev[day] }));
  };

  const formatBadgeLabel = (value: string, options: Option[]) => {
    const found = options.find((o) => o.value === value);
    return found ? found.label : value.replace(/_/g, " ");
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
              {step === 1 && (
                <>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-8 items-start">
                      <div className="space-y-4">
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg"
                          onChange={handleImageChange}
                          className="hidden"
                          id="cloudinary-direct-upload"
                        />
                        <label htmlFor="cloudinary-direct-upload">
                          <Button
                            asChild
                            variant={"outline"}
                            className="w-full rounded-lg cursor-pointer border-0 justify-start py-10"
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
                                  !field.value && "text-muted-foreground",
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
                              initialFocus
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
                          Description <span className="text-munchred">*</span>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe your store"
                            className="h-25 placeholder:text-slate-400"
                            rows={3}
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
                          Social Media Link (optional)
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. https://instagram.com/store"
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

              {step === 2 && (
                <div className="space-y-6">
                  {metaError && (
                    <p className="text-red-500 text-center">{metaError}</p>
                  )}
                  {metaLoading ? (
                    <div className="flex justify-center py-10">
                      <LoaderCircle className="animate-spin" />
                    </div>
                  ) : (
                    <>
                      <FormField
                        control={form.control}
                        name="businessType"
                        render={() => (
                          <FormItem className="mb-5">
                            <FormLabel className="font-normal text-slate-500">
                              Business Type{" "}
                              <span className="text-munchred">*</span>
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
                                            businessTypes,
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
                                  <CommandInput placeholder="Search type..." />
                                  <CommandEmpty>No type found.</CommandEmpty>
                                  <CommandGroup>
                                    {businessTypes.map((option) => (
                                      <CommandItem
                                        key={option.value}
                                        onSelect={() => {
                                          form.setValue(
                                            "businessType",
                                            option.value,
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
                                              : "opacity-0",
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
                                              brandTypes,
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
                                                : option.value,
                                            );
                                            setBrandTypeOpen(false);
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              watchedBrandType === option.value
                                                ? "opacity-100"
                                                : "opacity-0",
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
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className="w-full justify-between font-normal h-12 hover:text-slate-400 text-slate-400 hover:bg-white"
                                    disabled={
                                      metaLoading ||
                                      serviceOperations.length === 0
                                    }
                                  >
                                    <span className="truncate">
                                      {form.watch("serviceOperations").length >
                                      0
                                        ? `${
                                            form.watch("serviceOperations")
                                              .length
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
                                  <CommandEmpty>
                                    No operation found.
                                  </CommandEmpty>
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
                                                (v) => v !== option.value,
                                              ),
                                            );
                                          } else {
                                            form.setValue("serviceOperations", [
                                              ...current,
                                              option.value,
                                            ]);
                                          }
                                          // setServiceOperationOpen(false);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            form
                                              .watch("serviceOperations")
                                              .includes(option.value)
                                              ? "opacity-100"
                                              : "opacity-0",
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
                                          .filter((v) => v !== value),
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
                    </>
                  )}
                </div>
              )}

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
                                  checked,
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
                                    "rotate-180 transition-transform duration-200 ease-in-out",
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
                                      e.target.value,
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
                                      e.target.value,
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

                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-normal text-slate-500">
                          Country <span className="text-munchred">*</span>
                        </FormLabel>
                        <Popover
                          open={countryOpen}
                          onOpenChange={setCountryOpen}
                        >
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between h-12 font-normal"
                                disabled={true} // or remove disabled if you want to allow change later
                              >
                                {nigeriaData?.country.name || "Nigeria"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                        </Popover>
                        {/* Hidden input to satisfy form */}
                        <input
                          type="hidden"
                          {...field}
                          value={nigeriaData?.country.name || "Nigeria"}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={() => (
                      <FormItem>
                        <FormLabel className="font-normal text-slate-500">
                          State <span className="text-munchred">*</span>
                        </FormLabel>
                        <Popover open={stateOpen} onOpenChange={setStateOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between h-12 font-normal"
                                disabled={
                                  statesLoading || !nigeriaData?.states?.length
                                }
                              >
                                <span className="truncate">
                                  {form.watch("state")
                                    ? nigeriaData?.states.find(
                                        (s) => s.id === form.watch("state"),
                                      )?.name || "Select state"
                                    : statesLoading
                                      ? "Loading states..."
                                      : "Select state"}
                                </span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0" align="start">
                            <Command className="max-h-72 overflow-hidden">
                              <CommandInput placeholder="Search state..." />
                              <CommandEmpty>No state found.</CommandEmpty>
                              <CommandGroup className="max-h-80 overflow-y-auto overscroll-contain p-1">
                                {nigeriaData?.states?.map((s) => (
                                  <CommandItem
                                    key={s.id}
                                    value={s.name}
                                    onSelect={() => {
                                      form.setValue("state", s.id);
                                      form.clearErrors("state");
                                      setStateOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        form.watch("state") === s.id
                                          ? "opacity-100"
                                          : "opacity-0",
                                      )}
                                    />
                                    {s.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        {statesError && (
                          <p className="text-sm text-red-500 mt-1">
                            {statesError}
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="lga"
                      render={() => (
                        <FormItem>
                          <FormLabel className="font-normal text-slate-500">
                            LGA <span className="text-munchred">*</span>
                          </FormLabel>

                          <Popover open={lgaOpen} onOpenChange={setLgaOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className="w-full justify-between h-12 font-normal"
                                  disabled={
                                    !form.watch("state") ||
                                    lgasLoading ||
                                    lgas.length === 0 ||
                                    statesLoading
                                  }
                                >
                                  <span className="truncate">
                                    {lgasLoading
                                      ? "Loading LGAs..."
                                      : form.watch("lga") &&
                                          lgas.some(
                                            (opt) =>
                                              opt.value === form.watch("lga"),
                                          )
                                        ? lgas.find(
                                            (opt) =>
                                              opt.value === form.watch("lga"),
                                          )!.label
                                        : "Select LGA"}
                                  </span>
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>

                            <PopoverContent
                              className="w-full p-0 max-h-[min(400px,80vh)] overflow-hidden"
                              align="start"
                            >
                              <Command className="overflow-hidden rounded-lg">
                                <CommandInput placeholder="Search LGA..." />
                                <CommandEmpty>
                                  {lgas.length === 0 && !lgasLoading
                                    ? "No LGAs found for this state"
                                    : "Searching..."}
                                </CommandEmpty>
                                <CommandGroup className="max-h-80 overflow-y-auto overscroll-contain p-1">
                                  {lgas.map((option) => (
                                    <CommandItem
                                      key={option.value}
                                      value={option.label}
                                      onSelect={() => {
                                        form.setValue("lga", option.value);
                                        form.clearErrors("lga");
                                        setLgaOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          form.watch("lga") === option.value
                                            ? "opacity-100"
                                            : "opacity-0",
                                        )}
                                      />
                                      {option.label}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </Command>
                            </PopoverContent>
                          </Popover>

                          {lgasError && (
                            <p className="text-sm text-red-500 mt-1">
                              {lgasError}
                            </p>
                          )}
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
                              value={field.value ?? ""}
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
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-normal text-slate-500">
                          City <span className="text-munchred">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter city name"
                            className="h-12 placeholder:text-slate-400"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

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
