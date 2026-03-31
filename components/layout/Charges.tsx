"use client";

import {
  LoaderCircle,
  Pencil,
  Search,
  Trash2,
  X,
  Check,
  ChevronsUpDown,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import Image from "next/image";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import { Switch } from "../ui/switch";
import { toast } from "sonner";
import { getAccessToken, getBusinessId, logout } from "@/app/lib/auth";
import { Skeleton } from "../ui/skeleton";
import { refreshAccessToken } from "@/app/lib/api";

// ────────────────────────────────────────────────
//  Custom Modal Component
// ────────────────────────────────────────────────

function CustomModal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = "sm:max-w-[640px]",
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative w-full bg-white shadow-xl overflow-hidden rounded-md animate-in zoom-in-95 duration-200",
          maxWidth,
        )}
      >
        <div className="flex border-b items-center justify-between px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            className="text-gray-400 hover:text-gray-600 transition-colors"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
        {footer && (
          <div className="flex justify-end gap-3 px-6 py-4 border-t bg-white">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

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
    if (!refreshOk) {
      await logout();
      throw new Error("Session expired");
    }
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
    if (!refreshOk) {
      await logout();
      throw new Error("Session expired");
    }
    token = getAccessToken();
    response = await fetch(url, {
      ...init,
      headers: { ...headers, Authorization: `Bearer ${token}` },
    });
  }

  return response;
}

// ────────────────────────────────────────────────
//  Types & Schema
// ────────────────────────────────────────────────

interface ChargeType {
  id: string;
  label: string;
  isPercentage: boolean;
  isActive: boolean;
}

interface ServiceOperation {
  id: string;
  key: string;
  label: string;
}

interface Charge {
  id: string;
  chargeTypeId: string;
  amount: number;
  isEnabled: boolean;
  serviceOperations?: ServiceOperation[];
  name?: string;
  formattedValue?: string;
  lastUpdated?: string;
  createdAt: string;
  updatedAt?: string;
  chargeType?: {
    label: string;
    isPercentage: boolean;
  };
}

const chargesFormSchema = z.object({
  chargeTypeId: z.string().optional(),
  amount: z
    .string()
    .min(1, "Amount is required")
    .regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format"),
  serviceOperationIds: z
    .array(z.string())
    .min(1, "Select at least one service"),
});

type ChargesFormType = z.infer<typeof chargesFormSchema>;

// ────────────────────────────────────────────────
//  Main Component
// ────────────────────────────────────────────────

const Charges = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [charges, setCharges] = useState<Charge[]>([]);
  const [chargeTypes, setChargeTypes] = useState<ChargeType[]>([]);
  const [serviceOperations, setServiceOperations] = useState<
    ServiceOperation[]
  >([]);
  const [editingCharge, setEditingCharge] = useState<Charge | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<Charge | null>(null);
  const [serviceOperationOpen, setServiceOperationOpen] = useState(false);
  const [fetchNetworkError, setFetchNetworkError] = useState<string | null>(
    null,
  );

  const businessId = getBusinessId();

  const form = useForm<ChargesFormType>({
    resolver: zodResolver(chargesFormSchema),
    defaultValues: {
      chargeTypeId: "",
      amount: "",
      serviceOperationIds: [],
    },
  });

  const fetchData = async () => {
    if (!businessId) {
      toast.error("No business ID found");
      return;
    }

    setIsDataLoading(true);
    setFetchNetworkError(null);

    try {
      const [typesRes, servicesRes, chargesRes] = await Promise.all([
        authenticatedFetch(`${API_BASE}/meta/charge-types`),
        authenticatedFetch(
          `${API_BASE}/vendors/me/businesses/${businessId}/services`,
        ),
        authenticatedFetch(
          `${API_BASE}/vendors/me/businesses/${businessId}/charges`,
        ),
      ]);

      const typesData = await typesRes.json();
      const servicesData = await servicesRes.json();
      const chargesData = await chargesRes.json();

      const activeTypes = (typesData.data || []).filter((t: any) => t.isActive);
      setChargeTypes(activeTypes);
      setServiceOperations(servicesData.data || []);

      const enriched = (chargesData.data || []).map((c: any) => {
        const typeLabel =
          c.chargeType?.label ||
          activeTypes.find((t: any) => t.id === c.chargeTypeId)?.label;
        const isPercentage =
          c.chargeType?.isPercentage ??
          activeTypes.find((t: any) => t.id === c.chargeTypeId)?.isPercentage ??
          false;

        return {
          ...c,
          name: typeLabel || "Unknown Charge",
          formattedValue: isPercentage
            ? `${c.amount}%`
            : `₦${Number(c.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          lastUpdated: new Date(c.updatedAt || c.createdAt).toLocaleDateString(
            "en-GB",
            { day: "numeric", month: "short", year: "numeric" },
          ),
        };
      });

      setCharges(enriched);
    } catch (err: any) {
      console.error("Data fetch error:", err);
      if (err.message?.includes("fetch") || err.message?.includes("Network")) {
        setFetchNetworkError(
          "Unable to load charges data. Please check your internet connection.",
        );
      } else {
        toast.error("Failed to load data. Please try again.");
      }
    } finally {
      setIsDataLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [businessId]);

  const handleEdit = (charge: Charge) => {
    setEditingCharge(charge);
    const operationIds = charge.serviceOperations?.map((op) => op.id) || [];
    form.reset({
      chargeTypeId: charge.chargeTypeId,
      amount: charge.amount.toString(),
      serviceOperationIds: operationIds,
    });
    setIsDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteCandidate) return;
    setIsLoading(true);

    try {
      const res = await authenticatedFetch(
        `${API_BASE}/vendors/me/businesses/${businessId}/charges/${deleteCandidate.id}`,
        { method: "DELETE", body: JSON.stringify({}) },
      );

      if (!res.ok) throw new Error("Delete failed");

      setCharges((prev) => prev.filter((c) => c.id !== deleteCandidate.id));
      setIsDeleteDialogOpen(false);
      toast.success("Charge deleted successfully");
    } catch (err) {
      toast.error("Failed to delete charge");
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (values: ChargesFormType) => {
    setIsLoading(true);

    try {
      const url = editingCharge
        ? `${API_BASE}/vendors/me/businesses/${businessId}/charges/${editingCharge.id}`
        : `${API_BASE}/vendors/me/businesses/${businessId}/charges`;

      let requestBody: any;
      if (editingCharge) {
        const { chargeTypeId, ...rest } = values;
        requestBody = {
          ...rest,
          amount: parseFloat(values.amount),
        };
      } else {
        requestBody = {
          ...values,
          amount: parseFloat(values.amount),
          isEnabled: true,
        };
      }

      const res = await authenticatedFetch(url, {
        method: editingCharge ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to save charge");
      }

      toast.success(
        editingCharge
          ? "Charge updated successfully"
          : "Charge added successfully",
      );
      setIsDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save charge");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedType = chargeTypes.find(
    (t) => t.id === (editingCharge?.chargeTypeId || form.watch("chargeTypeId")),
  );
  const isPercentage = selectedType?.isPercentage ?? false;

  if (fetchNetworkError) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="h-16 w-16 text-red-500 mb-6" />
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Connection Error
        </h2>
        <p className="text-gray-600 max-w-md mb-8">{fetchNetworkError}</p>
        <Button
          onClick={() => window.location.reload()}
          className="gap-2 bg-orange-500 hover:bg-orange-600 text-white"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Page
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white text-gray-900">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-2xl font-bold">Charges & Fees</h1>
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search charges..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 border-gray-300 rounded-md"
              />
            </div>
            <Button
              onClick={() => {
                setEditingCharge(null);
                form.reset({
                  chargeTypeId: "",
                  amount: "",
                  serviceOperationIds: [],
                });
                setIsDialogOpen(true);
              }}
              className="bg-orange-500 hover:bg-orange-600 text-white h-10 px-6 rounded-md"
            >
              + Add New Charge
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-md border border-gray-200 overflow-hidden">
          {isDataLoading ? (
            <ChargesSkeleton />
          ) : charges.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Image
                src="/images/empty.png"
                width={160}
                height={160}
                className="mx-auto mb-6 opacity-70"
                alt="No charges"
              />
              <p className="text-lg">No charges configured yet</p>
              <p className="text-sm mt-2">
                Click "+ Add New Charge" to get started.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="ps-6">Name</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead className="text-right pe-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {charges
                  .filter((c) =>
                    c.name?.toLowerCase().includes(searchTerm.toLowerCase()),
                  )
                  .map((charge) => (
                    <TableRow key={charge.id} className="hover:bg-gray-50">
                      <TableCell className="ps-6 font-medium">
                        {charge.name}
                      </TableCell>
                      <TableCell>{charge.formattedValue}</TableCell>
                      <TableCell className="text-gray-500">
                        {charge.lastUpdated}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={charge.isEnabled}
                          onCheckedChange={async (v) => {
                            try {
                              const res = await authenticatedFetch(
                                `${API_BASE}/vendors/me/businesses/${businessId}/charges/${charge.id}/toggle`,
                                {
                                  method: "PATCH",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({ isEnabled: v }),
                                },
                              );

                              if (!res.ok) throw new Error();

                              setCharges((prev) =>
                                prev.map((c) =>
                                  c.id === charge.id
                                    ? { ...c, isEnabled: v }
                                    : c,
                                ),
                              );
                              toast.success("Status updated");
                            } catch {
                              toast.error("Failed to update status");
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-right pe-6">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(charge)}
                            className="rounded-md"
                          >
                            <Pencil className="h-4 w-4 text-gray-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDeleteCandidate(charge);
                              setIsDeleteDialogOpen(true);
                            }}
                            className="rounded-md"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Main Modal */}
      <CustomModal
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={editingCharge ? `Edit ${editingCharge.name}` : "Add New Charge"}
        maxWidth="sm:max-w-lg"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="rounded-md"
              onClick={() => setIsDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              form="charge-form"
              type="submit"
              disabled={isLoading}
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-md min-w-[100px]"
            >
              {isLoading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : editingCharge ? (
                "Update"
              ) : (
                "Add"
              )}
            </Button>
          </>
        }
      >
        <Form {...form}>
          <form
            id="charge-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
          >
            {!editingCharge && (
              <FormField
                control={form.control}
                name="chargeTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Charge Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11! w-full rounded-md">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-md">
                        {chargeTypes.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                        {isPercentage ? "%" : "₦"}
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        className="pl-10 h-11 rounded-md"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="serviceOperationIds"
              render={({ field }) => (
                <FormItem className="mb-0">
                  <FormLabel className="font-normal text-slate-500">
                    Applicable Services <span className="text-red-600">*</span>
                  </FormLabel>
                  <Popover
                    open={serviceOperationOpen}
                    onOpenChange={setServiceOperationOpen}
                  >
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className="w-full justify-between font-normal h-12 text-slate-400 hover:bg-white rounded-md"
                        >
                          {field.value && field.value.length > 0
                            ? `${field.value.length} selected`
                            : "Select services"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent
                      side="top"
                      className="w-[var(--radix-popover-trigger-width)] p-1 rounded-md"
                      align="start"
                    >
                      <div className="max-h-60 overflow-y-auto">
                        {serviceOperations.length === 0 && (
                          <div className="p-2 text-sm text-center text-slate-500">
                            No services found
                          </div>
                        )}
                        {serviceOperations.map((op) => (
                          <div
                            key={op.id}
                            className="flex items-center gap-2 px-2 py-2 hover:bg-slate-50 cursor-pointer rounded-md text-sm"
                            onClick={() => {
                              const current = field.value || [];
                              const updated = current.includes(op.id)
                                ? current.filter((id) => id !== op.id)
                                : [...current, op.id];
                              field.onChange(updated);
                            }}
                          >
                            <div
                              className={cn(
                                "h-4 w-4 border rounded-sm flex items-center justify-center",
                                field.value?.includes(op.id)
                                  ? "bg-orange-500 border-orange-500"
                                  : "border-slate-300",
                              )}
                            >
                              {field.value?.includes(op.id) && (
                                <Check className="h-3 w-3 text-white" />
                              )}
                            </div>
                            {op.label}
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>

                  <div className="flex flex-wrap gap-2 mt-2">
                    {field.value?.map((id) => {
                      const operation = serviceOperations.find(
                        (op) => op.id === id,
                      );
                      return (
                        <Badge
                          key={id}
                          variant="secondary"
                          className="bg-red-50 text-base px-3 py-1 font-medium items-center flex justify-between rounded-lg border-munchprimary"
                        >
                          {operation?.label}
                          <span
                            className="ml-2 cursor-pointer"
                            onClick={() => {
                              field.onChange(
                                field.value.filter((val) => val !== id),
                              );
                            }}
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
          </form>
        </Form>
      </CustomModal>

      {/* Delete Confirmation Modal */}
      <CustomModal
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        title="Confirm Deletion"
        maxWidth="sm:max-w-md"
        footer={
          <>
            <Button
              variant="outline"
              className="rounded-md"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-md"
              onClick={confirmDelete}
              disabled={isLoading}
            >
              {isLoading ? "Deleting..." : "Delete"}
            </Button>
          </>
        }
      >
        <p className="text-gray-700">
          Are you sure you want to delete{" "}
          <strong>{deleteCandidate?.name}</strong>? This action cannot be
          undone.
        </p>
      </CustomModal>
    </div>
  );
};

export default Charges;

const ChargesSkeleton = () => {
  return (
    <div className="bg-white text-gray-900">
      <div className="max-w-7xl mx-auto space-y-8 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <Skeleton className="h-8 w-48 rounded-md" />
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <Skeleton className="h-10 w-full md:w-60 rounded-md" />
            <Skeleton className="h-10 w-40 rounded-md" />
          </div>
        </div>

        <div className="bg-white rounded-md border border-gray-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="ps-6">
                  <Skeleton className="h-4 w-20" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-16" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-24" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-16" />
                </TableHead>
                <TableHead className="text-right pe-6">
                  <Skeleton className="h-4 w-20 ml-auto" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="ps-6">
                    <Skeleton className="h-5 w-32 rounded-md" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20 rounded-md" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-24 rounded-md" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-10 rounded-full" />
                  </TableCell>
                  <TableCell className="text-right pe-6">
                    <div className="flex justify-end gap-2">
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};
