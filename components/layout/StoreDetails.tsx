"use client";

import React, { useState, useEffect } from "react";
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
import {
  BrushCleaning,
  ChevronsUpDown,
  Check,
  X,
  EyeOff,
  Eye,
} from "lucide-react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
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
import { Calendar } from "@/components/ui/calendar";
import { X as XIcon } from "lucide-react";
import { toast } from "sonner";
import { getAccessToken, getBusinessId, logout } from "@/app/lib/auth";
import { format } from "date-fns";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { useStore } from "../context/StoreContext";
import { Skeleton } from "../ui/skeleton";

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_MAP_API || " ";

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
    }),
  ),
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

const storeInfoEditSchema = z.object({
  storeName: z.string().min(1, "Store name is required"),
  email: z.string().email("Invalid email format"),
  phone: z.string().min(1, "Phone number is required"),
  establishedDate: z.date("Established date is required."),
  businessType: z.string().min(1, "Business type is required"),
  brandType: z.string().min(1, "Brand type is required"),
  serviceOperations: z
    .array(z.string())
    .min(1, "At least one service operation is required"),
});

type StoreInfoEditValues = z.infer<typeof storeInfoEditSchema>;

const addressEditSchema = z.object({
  country: z.string().min(1, "Country is required."),
  state: z.string().min(1, "State is required."),
  lga: z.string().min(1, "LGA is required."),
  streetName: z.string().min(1, "Street name is required."),
  city: z.string().min(1, "City is required."),
  postalCode: z.number().optional(),
  latitude: z.number(),
  longitude: z.number(),
});

type AddressEditValues = z.infer<typeof addressEditSchema>;

type MetaItem = {
  id: string;
  key: string;
  label: string;
};

type Address = {
  streetName?: string;
  city?: string;
  state?: string;
  country?: string;
  lga?: string;
  postalCode?: string;
};

type StoreInfoDisplayValues = {
  storeName: string;
  email: string;
  phone: string;
  establishedDate: Date;
  businessType: MetaItem | null;
  brandType: MetaItem | null;
  serviceOperations: MetaItem[];
  businessStatus: string;
  website: string;
  address: Address;
  latitude?: number;
  longitude?: number;
};

type Option = { value: string; label: string };

const API_BASE = "https://dev.api.munchspace.io/api/v1";
const API_KEY = process.env.NEXT_PUBLIC_MUNCHSPACE_API_KEY || "";

const StoreDetails = () => {
  const { storeImage, setStoreImage, setAddress } = useStore();
  const [previousLogoUrl, setPreviousLogoUrl] = useState<string | null>(null);
  const [openDays, setOpenDays] = useState<Record<string, boolean>>({});
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [businessTypeOpen, setBusinessTypeOpen] = useState(false);
  const [brandTypeOpen, setBrandTypeOpen] = useState(false);
  const [serviceOperationOpen, setServiceOperationOpen] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [updatingHours, setUpdatingHours] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Visibility states for eye icons
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [businessTypeOptions, setBusinessTypeOptions] = useState<MetaItem[]>(
    [],
  );
  const [brandTypeOptions, setBrandTypeOptions] = useState<MetaItem[]>([]);
  const [serviceOperationOptions, setServiceOperationOptions] = useState<
    MetaItem[]
  >([]);

  // Nigeria address meta
  const [nigeriaData, setNigeriaData] = useState<{
    country: { id: string; code: string; name: string };
    states: { id: string; code: string; name: string }[];
  } | null>(null);
  const [statesError, setStatesError] = useState("");
  const [statesLoading, setStatesLoading] = useState(true);
  const [lgas, setLgas] = useState<Option[]>([]);
  const [lgasLoading, setLgasLoading] = useState(false);
  const [lgasError, setLgasError] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const [stateOpen, setStateOpen] = useState(false);
  const [lgaOpen, setLgaOpen] = useState(false);

  const [storeInfo, setStoreInfo] = useState<StoreInfoDisplayValues>({
    storeName: "",
    email: "",
    phone: "",
    establishedDate: new Date(),
    businessType: null,
    brandType: null,
    serviceOperations: [],
    businessStatus: "",
    website: "",
    address: {},
  });

  const toggleOpen = (day: string) => {
    setOpenDays((prev) => ({ ...prev, [day]: !prev[day] }));
  };

  const form = useForm<SetupValues>({
    resolver: zodResolver(setupSchema),
    mode: "onChange",
    defaultValues: {
      workingHours: daysOfWeek.reduce(
        (acc, day) => ({
          ...acc,
          [day]: { enabled: false, start: "08:00", end: "20:00" },
        }),
        {} as Record<string, { enabled: boolean; start: string; end: string }>,
      ),
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

  const storeForm = useForm<StoreInfoEditValues>({
    resolver: zodResolver(storeInfoEditSchema),
    defaultValues: {
      storeName: "",
      email: "",
      phone: "",
      establishedDate: new Date(),
      businessType: "",
      brandType: "",
      serviceOperations: [],
    },
  });

  const addressForm = useForm<AddressEditValues>({
    resolver: zodResolver(addressEditSchema),
    defaultValues: {
      country: "",
      state: "",
      lga: "",
      streetName: "",
      city: "",
      postalCode: 0,
      latitude: 0,
      longitude: 0,
    },
  });

  useEffect(() => {
    if (!isAddressModalOpen) return;

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

        const newMarker = new google.maps.Marker({
          position: initialCenter,
          map: newMap,
          draggable: true,
        });

        newMarker.addListener("dragend", (e: any) => {
          if (e.latLng) {
            addressForm.setValue("latitude", e.latLng.lat());
            addressForm.setValue("longitude", e.latLng.lng());
          }
        });

        newMap.addListener("click", (e: any) => {
          if (e.latLng) {
            newMarker.setPosition(e.latLng);
            addressForm.setValue("latitude", e.latLng.lat());
            addressForm.setValue("longitude", e.latLng.lng());
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
              addressForm.setValue("latitude", place.geometry.location.lat());
              addressForm.setValue("longitude", place.geometry.location.lng());
            }
          });
        }
      } catch (err) {
        console.error("Google Maps init failed:", err);
        toast.error("Failed to load map. Please check your API key.");
      }
    }

    initMap();
  }, [isAddressModalOpen, addressForm]);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);

        const token = getAccessToken();
        if (!token) {
          toast.error("Authentication required");
          return;
        }

        const businessId = getBusinessId();
        if (!businessId) {
          toast.error("No business ID found");
          return;
        }

        const headers = {
          Authorization: `Bearer ${token}`,
          "x-api-key": API_KEY,
        };

        const [btRes, brRes, soRes, businessRes, nigeriaRes] =
          await Promise.all([
            fetch("https://dev.api.munchspace.io/api/v1/meta/business-types", {
              headers,
            }),
            fetch("https://dev.api.munchspace.io/api/v1/meta/brand-types", {
              headers,
            }),
            fetch(
              "https://dev.api.munchspace.io/api/v1/meta/service-operations",
              {
                headers,
              },
            ),
            fetch(
              `https://dev.api.munchspace.io/api/v1/vendors/me/businesses/${businessId}`,
              { headers },
            ),
            fetch(`https://dev.api.munchspace.io/api/v1/meta/nigeria-states`, {
              headers,
            }),
          ]);

        let btData = btRes.ok ? (await btRes.json()).data || [] : [];
        let brData = brRes.ok ? (await brRes.json()).data || [] : [];
        let soData = soRes.ok ? (await soRes.json()).data || [] : [];
        let nigeriaJson: any = null;

        setBusinessTypeOptions(btData);
        setBrandTypeOptions(brData);
        setServiceOperationOptions(soData);

        if (!businessRes.ok) {
          throw new Error("Failed to fetch business data");
        }

        const { data } = await businessRes.json();

        // console.log("Nigeria res is:", await nigeriaRes.json())

        if (nigeriaRes.ok) {
          const nigeriaR = await nigeriaRes.json();
          nigeriaJson = nigeriaR.data;
          console.log("Nig JSON:", nigeriaJson);
        }

        if (nigeriaJson?.country && Array.isArray(nigeriaJson.states)) {
          setNigeriaData(nigeriaJson);
          setStatesLoading(false);
        } else {
          setStatesError("Failed to load Nigerian states.");
        }

        const workingHours: Record<string, any> = {};
        daysOfWeek.forEach((uiDay) => {
          const apiDay = uiDay.toUpperCase();
          const hours = data.workingHours?.find((h: any) => h.day === apiDay);
          workingHours[uiDay] = {
            enabled: !!hours,
            start: hours?.openTime || "08:00",
            end: hours?.closeTime || "20:00",
          };
        });
        form.reset({ workingHours });

        const transformAddress = (apiAddr: any) => {
          if (!apiAddr) {
            return {
              country: "",
              state: "",
              lga: "",
              streetName: "",
              city: "",
              postalCode: undefined,
            };
          }

          return {
            country: apiAddr.country?.name || "",
            state: apiAddr.state?.name || "",
            lga: apiAddr.lga?.name || "",
            streetName: apiAddr.streetName || "",
            city: apiAddr.city || "",
            postalCode: apiAddr.postalCode || undefined,
            latitude: apiAddr.latitude,
            longitude: apiAddr.longitude,
          };
        };

        setStoreInfo({
          storeName: data.displayName || data.legalName || "",
          email: data.email || "",
          phone: data.phone || "",
          establishedDate: data.establishedAt
            ? new Date(data.establishedAt)
            : new Date(),
          businessType: data.businessType || null,
          brandType: data.brandType || null,
          serviceOperations: data.serviceOperations || [],
          businessStatus: data.isActive ? "Operational" : "Inactive",
          website: data.website || "N/A",
          address: transformAddress(data.address),
          latitude: data.address?.latitude,
          longitude: data.address?.longitude,
        });

        storeForm.reset({
          storeName: data.displayName || data.legalName || "",
          email: data.email || "",
          phone: data.phone || "",
          establishedDate: data.establishedAt
            ? new Date(data.establishedAt)
            : new Date(),
          businessType: data.businessType?.id || "",
          brandType: data.brandType?.id || "",
          serviceOperations:
            data.serviceOperations?.map((op: MetaItem) => op.id) || [],
        });

        addressForm.reset({
          country: "Nigeria",
          state: data.address?.state || "",
          lga: data.address?.lga || "",
          streetName: data.address?.streetName || "",
          city: data.address?.city || "",
          postalCode: data.address?.postalCode || "",
          latitude: data.latitude || 0,
          longitude: data.longitude || 0,
        });

        if (data.logoUrl) {
          setStoreImage(data.logoUrl);
        }
      } catch (err) {
        console.error("Fetch error:", err);
        toast.error("Could not load store information");
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [form, storeForm, addressForm]);

  useEffect(() => {
    const selectedStateId = addressForm.watch("state");

    // Immediately reset everything when state changes
    addressForm.setValue("lga", "");
    setLgas([]);
    setLgasError("");
    setLgasLoading(true); // show loading right away

    if (!selectedStateId || !nigeriaData?.states) {
      setLgasLoading(false);
      return;
    }

    // We'll use this to detect if this is still the relevant fetch
    let isCurrent = true;

    async function loadLgas() {
      try {
        const selectedState = nigeriaData?.states.find(
          (s) => s.id === selectedStateId,
        );
        if (!selectedState) throw new Error("State not found");

        const url = `${API_BASE}/meta/lgas?stateId=${encodeURIComponent(selectedState.id)}&stateCode=${encodeURIComponent(selectedState.code)}`;

        const response = await fetch(url, {
          headers: { "x-api-key": API_KEY },
        });

        if (!isCurrent) return; // ← prevent stale update

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
        setLgasError(""); // explicitly clear on success

        if (normalized.length === 1) {
          addressForm.setValue("lga", normalized[0].value);
        }
      } catch (err) {
        if (!isCurrent) return;
        console.error("LGA fetch failed:", err);
        // setLgasError("Could not load LGAs for the selected state.");
      } finally {
        if (isCurrent) {
          setLgasLoading(false);
        }
      }
    }

    loadLgas();

    // Cleanup: mark previous fetches as stale
    return () => {
      isCurrent = false;
    };
  }, [addressForm.watch("state"), nigeriaData]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size exceeds 2MB limit");
      return;
    }

    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      toast.error("Only PNG and JPEG images are allowed");
      return;
    }

    // Save current image for rollback
    setPreviousLogoUrl(storeImage);

    // Optimistic preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setStoreImage(reader.result as string);
    };
    reader.readAsDataURL(file);

    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Authentication required");

      const businessId = await getBusinessId();
      if (!businessId) throw new Error("No business ID found");

      const formData = new FormData();
      formData.append("logo", file);

      const res = await fetch(
        `https://dev.api.munchspace.io/api/v1/vendors/me/businesses/${businessId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "x-api-key": API_KEY,
          },
          body: formData,
        },
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to upload logo");
      }

      const responseData = await res.json();
      const newLogoUrl = responseData?.data?.logoUrl;

      if (newLogoUrl) {
        setStoreImage(newLogoUrl);
        toast.success("Store image updated successfully");
      } else {
        toast.warning("Image uploaded, but no new URL returned");
      }
    } catch (err) {
      console.error("Logo upload failed:", err);
      toast.error("Could not update store image");
      // Revert preview
      setStoreImage(previousLogoUrl ?? "/images/store-placeholder.png");
    }
  };

  const onPasswordSubmit = async (values: any) => {
    setIsSubmitting(true);
    try {
      const token = getAccessToken();
      const response = await fetch(
        "https://dev.api.munchspace.io/api/v1/auth/password/change",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "x-api-key": API_KEY,
          },
          body: JSON.stringify({
            currentPassword: values.currentPassword,
            newPassword: values.newPassword,
          }),
        },
      );

      const data = await response.json();
      console.log("Password change response:", data, values);

      if (!response.ok)
        throw new Error(data.message || "Failed to update password");

      toast.success("Password updated successfully");
      logout();
      setIsPasswordModalOpen(false);
      passwordForm.reset();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onStoreSubmit = async (data: StoreInfoEditValues) => {
    try {
      const token = await getAccessToken();
      if (!token) return toast.error("Authentication required");

      const businessId = await getBusinessId();
      if (!businessId) return toast.error("No business ID found");

      const formData = new FormData();

      formData.append("displayName", data.storeName);
      formData.append("email", data.email);
      formData.append("phone", data.phone);
      formData.append(
        "establishedAt",
        format(data.establishedDate, "yyyy-MM-dd"),
      );
      formData.append("businessTypeId", data.businessType);
      formData.append("brandTypeId", data.brandType);

      data.serviceOperations.forEach((id) => {
        formData.append("serviceOperationIds[]", id);
      });

      const res = await fetch(
        `https://dev.api.munchspace.io/api/v1/vendors/me/businesses/${businessId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "x-api-key": API_KEY,
          },
          body: formData,
        },
      );

      if (!res.ok) throw new Error("Update failed");

      toast.success("Store information updated successfully");

      setStoreInfo((prev) => ({
        ...prev,
        storeName: data.storeName,
        email: data.email,
        phone: data.phone,
        establishedDate: data.establishedDate,
        businessType:
          businessTypeOptions.find((o) => o.id === data.businessType) || null,
        brandType:
          brandTypeOptions.find((o) => o.id === data.brandType) || null,
        serviceOperations: serviceOperationOptions.filter((o) =>
          data.serviceOperations.includes(o.id),
        ),
      }));

      storeForm.reset(data);
      setIsStoreModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Could not save changes");
    }
  };

  const onAddressSubmit: SubmitHandler<AddressEditValues> = async (data) => {
    try {
      const token = getAccessToken();
      if (!token) return toast.error("Authentication required");

      const businessId = getBusinessId();
      if (!businessId) return toast.error("No business ID found");

      const formData = new FormData();

      formData.append("address[countryId]", "cmlzf6q8v004z01poe6yusjpr");
      formData.append("address[stateId]", data.state);
      formData.append("address[lgaId]", data.lga);
      formData.append("address[streetName]", data.streetName);
      formData.append("address[city]", data.city);
      if (data.postalCode)
        formData.append("address[postalCode]", data.postalCode.toString());

      formData.append("address[latitude]", data.latitude.toString());
      formData.append("address[longitude]", data.longitude.toString());

      const res = await fetch(
        `https://dev.api.munchspace.io/api/v1/vendors/me/businesses/${businessId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "x-api-key": API_KEY,
          },
          body: formData,
        },
      );

      const resData = await res.json();
      console.log("Address update response:", resData);

      if (!res.ok) throw new Error("Address update failed");

      const stateName =
        nigeriaData?.states.find((s) => s.id === data.state)?.name || "";
      const lgaName = lgas?.find((s) => s.value === data.lga)?.label || "";
      const formattedAddress = `${data.streetName}, ${data.city}, ${stateName}`;
      setAddress(formattedAddress);

      setStoreInfo((prev) => ({
        ...prev,
        address: {
          country: "Nigeria",
          state: stateName,
          lga: lgaName,
          streetName: data.streetName,
          city: data.city,
          postalCode:
            data.postalCode != null ? String(data.postalCode) : undefined,
        },
        latitude: data.latitude,
        longitude: data.longitude,
      }));
      toast.success("Address updated successfully");

      addressForm.reset(data);
      setIsAddressModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Could not update address");
    }
  };

  const handleUpdateWorkingHours = async () => {
    try {
      setUpdatingHours(true);

      const token = getAccessToken();
      if (!token) return toast.error("Authentication required");

      const businessId = getBusinessId();
      if (!businessId) return toast.error("No business ID found");

      const workingHoursData = form.getValues("workingHours");

      const apiWorkingHours = daysOfWeek
        .filter((day) => workingHoursData[day].enabled)
        .map((day) => ({
          day: day.toUpperCase(),
          openTime: workingHoursData[day].start,
          closeTime: workingHoursData[day].end,
        }));

      const formData = new FormData();

      apiWorkingHours.forEach((hour, index) => {
        formData.append(`workingHours[${index}][day]`, hour.day);
        formData.append(`workingHours[${index}][openTime]`, hour.openTime);
        formData.append(`workingHours[${index}][closeTime]`, hour.closeTime);
      });

      const res = await fetch(
        `https://dev.api.munchspace.io/api/v1/vendors/me/businesses/${businessId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "x-api-key": API_KEY,
          },
          body: formData,
        },
      );

      if (!res.ok) throw new Error("Failed to update working hours");

      toast.success("Working hours updated successfully");
    } catch (err) {
      console.error(err);
      toast.error("Could not update working hours");
    } finally {
      setUpdatingHours(false);
    }
  };

  const formatTime = (time: string) => {
    if (!time) return "—";
    const [hours, minutes] = time.split(":");
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    const formattedHours = h % 12 || 12;
    return `${formattedHours}:${minutes} ${ampm}`;
  };

  const resetDay = (day: string) => {
    form.setValue(`workingHours.${day}.start`, "08:00");
    form.setValue(`workingHours.${day}.end`, "20:00");
  };

  if (loading) {
    return <StoreSkeleton />;
  }

  return (
    <div>
      {/* Store Image Upload */}
      <Card className="p-4 md:p-8 bg-white border-gray-100 shadow-none">
        <div className="flex items-center gap-4">
          <div className="flex gap-8">
            <div className="relative group">
              <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-200">
                <img
                  src={storeImage}
                  alt="Store"
                  width={100}
                  height={100}
                  className="object-cover w-full h-full"
                  crossOrigin="anonymous"
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

      {/* Store Information Display */}
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
                {storeInfo.storeName || "—"}
              </p>
            </div>
            <div>
              <p className="text-gray-500 mb-1 text-sm">Email</p>
              <p className="font-medium text-slate-700">
                {storeInfo.email || "—"}
              </p>
            </div>
            <div>
              <p className="text-gray-500 mb-1 text-sm">Phone</p>
              <p className="font-medium text-slate-700">
                {storeInfo.phone || "—"}
              </p>
            </div>
            <div>
              <p className="text-gray-500 mb-1 text-sm">Established Date</p>
              <p className="font-medium text-slate-700">
                {storeInfo.establishedDate
                  ? format(storeInfo.establishedDate, "PPP")
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-gray-500 mb-1 text-sm">Business Status</p>
              <p className="font-medium text-slate-700">
                {storeInfo.businessStatus || "—"}
              </p>
            </div>
            <div>
              <p className="text-gray-500 mb-1 text-sm">Business Type</p>
              <p className="font-medium text-slate-700">
                {storeInfo.businessType?.label || "—"}
              </p>
            </div>
            <div>
              <p className="text-gray-500 mb-1 text-sm">Brand Type</p>
              <p className="font-medium text-slate-700">
                {storeInfo.brandType?.label || "—"}
              </p>
            </div>
            <div>
              <p className="text-gray-500 mb-1 text-sm">Service Operations</p>
              <p className="font-medium text-slate-700">
                {storeInfo.serviceOperations
                  ?.map((op) => op.label)
                  .join(", ") || "—"}
              </p>
            </div>
            <div>
              <p className="text-gray-500 mb-1 text-sm">Website</p>
              <p className="font-medium text-slate-700">
                {storeInfo.website || "N/A"}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-8 border-gray-100 shadow-none">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-900">Address</h2>
            <Button
              variant="outline"
              className="border-gray-400 rounded-full text-gray-700"
              onClick={() => setIsAddressModalOpen(true)}
            >
              Update
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-8 text-base mt-6">
            <div>
              <p className="text-gray-500 mb-1 text-sm">Full Address</p>
              <p className="font-medium text-slate-700">
                {[
                  storeInfo.address?.streetName,
                  storeInfo.address?.city,
                  storeInfo.address?.lga,
                  storeInfo.address?.state,
                  storeInfo.address?.country,
                  storeInfo.address?.postalCode,
                ]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </p>
            </div>
            {/* <div>
              <p className="text-gray-500 mb-1 text-sm">Coordinates</p>
              <p className="font-medium text-slate-700">
                {storeInfo.latitude && storeInfo.longitude
                  ? `${storeInfo.latitude.toFixed(6)}, ${storeInfo.longitude.toFixed(6)}`
                  : "—"}
              </p>
            </div> */}
          </div>
        </Card>
      </div>

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
                              <p className="text-slate-500 mb-2">Start Time</p>
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
                              <p className="text-slate-500 mb-2">Close Time</p>
                              <Input
                                type="time"
                                value={end}
                                className="h-10"
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
                    onClick={handleUpdateWorkingHours}
                    disabled={updatingHours}
                  >
                    {updatingHours ? "Updating..." : "Update"}
                  </Button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>

      <Card className="p-8 border-gray-100 shadow-none flex justify-between">
        <div className="flex justify-between items-center w-full">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Change Password</h2>
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

      {/* Password Modal */}
      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent
          className="max-w-md bg-white rounded-2xl border-none shadow-2xl overflow-hidden"
          // Applying your global preference for the backdrop overlay via data attributes or global CSS is recommended,
          // but here is the structure based on your provided JSX.
        >
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
              {/* Current Password */}
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
                      <div className="relative">
                        <Input
                          type={showCurrent ? "text" : "password"}
                          className="h-12 rounded-md pr-10"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrent(!showCurrent)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                        >
                          {showCurrent ? (
                            <EyeOff size={18} />
                          ) : (
                            <Eye size={18} />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* New Password */}
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
                      <div className="relative">
                        <Input
                          type={showNew ? "text" : "password"}
                          className="h-12 rounded-md pr-10"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNew(!showNew)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                        >
                          {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Confirm Password */}
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
                      <div className="relative">
                        <Input
                          type={showConfirm ? "text" : "password"}
                          className="h-12 rounded-md pr-10"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm(!showConfirm)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                        >
                          {showConfirm ? (
                            <EyeOff size={18} />
                          ) : (
                            <Eye size={18} />
                          )}
                        </button>
                      </div>
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
                  className="px-6 bg-gray-100 h-10 text-black rounded-md"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-munchprimary hover:bg-munchprimaryDark h-10 rounded-md"
                >
                  {isSubmitting ? "Updating..." : "Update Password"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Store Info Update Modal */}
      <Dialog open={isStoreModalOpen} onOpenChange={setIsStoreModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold">
              Update Store Information
            </DialogTitle>
          </DialogHeader>
          <Form {...storeForm}>
            <form
              onSubmit={storeForm.handleSubmit(onStoreSubmit)}
              className="space-y-6"
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
                      <Popover
                        open={datePopoverOpen}
                        onOpenChange={setDatePopoverOpen}
                      >
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full h-12 pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground",
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <ChevronsUpDown className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              field.onChange(date);
                              setDatePopoverOpen(false);
                            }}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Business Type */}
                <FormField
                  control={storeForm.control}
                  name="businessType"
                  render={({ field }) => (
                    <FormItem className="mb-5 md:col-span-2">
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
                            >
                              <span className="truncate">
                                {field.value
                                  ? businessTypeOptions.find(
                                      (o) => o.id === field.value,
                                    )?.label || "Select business type"
                                  : "Select business type"}
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
                              placeholder="Search business type..."
                            />
                            <CommandEmpty>No type found.</CommandEmpty>
                            <CommandGroup>
                              {businessTypeOptions.map((option) => (
                                <CommandItem
                                  key={option.id}
                                  onSelect={() => {
                                    field.onChange(option.id);
                                    setBusinessTypeOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === option.id
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

                {/* Brand Type */}
                <FormField
                  control={storeForm.control}
                  name="brandType"
                  render={({ field }) => (
                    <FormItem className="mb-5 md:col-span-2">
                      <FormLabel className="font-normal text-slate-500">
                        Brand Type <span className="text-munchred">*</span>
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
                            >
                              <span className="truncate">
                                {field.value
                                  ? brandTypeOptions.find(
                                      (o) => o.id === field.value,
                                    )?.label || "Select brand type"
                                  : "Select brand type"}
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
                              placeholder="Search brand type..."
                            />
                            <CommandEmpty>No type found.</CommandEmpty>
                            <CommandGroup>
                              {brandTypeOptions.map((option) => (
                                <CommandItem
                                  key={option.id}
                                  onSelect={() => {
                                    field.onChange(option.id);
                                    setBrandTypeOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === option.id
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

                {/* Service Operations */}
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
                                {(storeForm.watch("serviceOperations") ?? [])
                                  .length > 0
                                  ? `${(storeForm.watch("serviceOperations") ?? []).length} selected`
                                  : "Select service operations"}
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
                              placeholder="Search service operation..."
                            />
                            <CommandEmpty>No operation found.</CommandEmpty>
                            <CommandGroup>
                              {serviceOperationOptions.map((option) => (
                                <CommandItem
                                  key={option.id}
                                  onSelect={() => {
                                    const current =
                                      storeForm.getValues(
                                        "serviceOperations",
                                      ) ?? [];
                                    if (current.includes(option.id)) {
                                      storeForm.setValue(
                                        "serviceOperations",
                                        current.filter((v) => v !== option.id),
                                      );
                                    } else {
                                      storeForm.setValue("serviceOperations", [
                                        ...current,
                                        option.id,
                                      ]);
                                    }
                                    setServiceOperationOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      (
                                        storeForm.watch("serviceOperations") ??
                                        []
                                      ).includes(option.id)
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
                        {(storeForm.watch("serviceOperations") ?? []).map(
                          (value) => {
                            const label =
                              serviceOperationOptions.find(
                                (o) => o.id === value,
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
                                      (
                                        storeForm.getValues(
                                          "serviceOperations",
                                        ) ?? []
                                      ).filter((v) => v !== value),
                                    )
                                  }
                                >
                                  <XIcon className="w-4 font-black" />
                                </span>
                              </Badge>
                            );
                          },
                        )}
                      </div>
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
        </DialogContent>
      </Dialog>

      {/* Address Update Modal */}
      <Dialog open={isAddressModalOpen} onOpenChange={setIsAddressModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold">
              Update Address
            </DialogTitle>
          </DialogHeader>
          <Form {...addressForm}>
            <form
              onSubmit={addressForm.handleSubmit(onAddressSubmit)}
              className="space-y-6"
            >
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
                  control={addressForm.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-normal text-slate-500">
                        Country <span className="text-munchred">*</span>
                      </FormLabel>
                      <Popover open={countryOpen} onOpenChange={setCountryOpen}>
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
                  control={addressForm.control}
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
                                {addressForm.watch("state")
                                  ? nigeriaData?.states.find(
                                      (s) =>
                                        s.id === addressForm.watch("state"),
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
                                    addressForm.setValue("state", s.id);
                                    addressForm.clearErrors("state");
                                    setStateOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      addressForm.watch("state") === s.id
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
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={addressForm.control}
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
                                !addressForm.watch("state") ||
                                lgasLoading ||
                                lgas.length === 0 ||
                                statesLoading
                              }
                            >
                              <span className="truncate">
                                {lgasLoading
                                  ? "Loading LGAs..."
                                  : addressForm.watch("lga") &&
                                      lgas.some(
                                        (opt) =>
                                          opt.value ===
                                          addressForm.watch("lga"),
                                      )
                                    ? lgas.find(
                                        (opt) =>
                                          opt.value ===
                                          addressForm.watch("lga"),
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
                                    addressForm.setValue("lga", option.value);
                                    addressForm.clearErrors("lga");
                                    setLgaOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      addressForm.watch("lga") === option.value
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
                        <p className="text-sm text-red-500 mt-1">{lgasError}</p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addressForm.control}
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
                control={addressForm.control}
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
                control={addressForm.control}
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

              <DialogFooter className="gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddressModalOpen(false)}
                  className="px-6 bg-gray-100 h-10 text-black"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-munchprimary hover:bg-munchprimaryDark h-10 rounded-lg"
                >
                  Update Address
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StoreDetails;

const StoreSkeleton = () => {
  return (
    <div className="space-y-6">
      {/* Image Upload Card Skeleton */}
      <Card className="p-4 md:p-8 bg-white border-gray-100 shadow-none">
        <div className="flex items-center gap-4">
          <div className="flex gap-8">
            <div className="relative">
              <Skeleton className="w-24 h-24 rounded-xl" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2 items-center">
              <Skeleton className="h-4 w-40 rounded-md" />
            </div>
            <Skeleton className="h-3 w-32 rounded-md mt-1" />
          </div>
        </div>
      </Card>

      {/* Main Info Cards Skeleton */}
      <div className="space-y-6">
        {/* Store Information Card */}
        <Card className="p-8 border-gray-100 shadow-none">
          <div className="flex items-center justify-between mb-8">
            <Skeleton className="h-8 w-48 rounded-md" />
            <Skeleton className="h-10 w-24 rounded-full" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-20 rounded-md" />
                <Skeleton className="h-5 w-32 rounded-md" />
              </div>
            ))}
          </div>
        </Card>

        {/* Store Address Card */}
        <Card className="p-8 border-gray-100 shadow-none">
          <div className="flex items-center justify-between mb-8">
            <Skeleton className="h-8 w-40 rounded-md" />
            <Skeleton className="h-10 w-24 rounded-full" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-20 rounded-md" />
                <Skeleton className="h-5 w-32 rounded-md" />
              </div>
            ))}
          </div>
        </Card>

        {/* Operational Hours Accordion Skeleton */}
        <Card className="p-8 border-gray-100 shadow-none">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-8 w-56 rounded-md" />
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
