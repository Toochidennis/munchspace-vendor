import { LoaderCircle, Pencil, Search, Trash2, X } from "lucide-react";
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
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { getAccessToken, getBusinessId } from "@/app/lib/auth";

interface ChargeType {
  id: string;
  key: string;
  label: string;
  description: string;
  isPercentage: boolean;
  isComputed: boolean;
  maxAmount: number | null;
  isRequired: boolean;
  isActive: boolean;
}

interface ChargeResponseItem {
  id: string;
  businessId: string;
  chargeTypeId: string;
  amount: number;
  isEnabled: boolean;
  createdAt: string;
}

interface Charge extends ChargeResponseItem {
  name?: string;
  type?: "amount" | "percentage";
  formattedValue?: string;
  lastUpdated?: string;
}

interface ChargeTypeResponse {
  success: boolean;
  statusCode: number;
  data: ChargeType[];
}

const chargesFormSchema = z.object({
  chargeTypeId: z.string().min(1, "Please select a charge type"),
  amount: z
    .string()
    .min(1, "Amount is required")
    .regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format (e.g. 500 or 12.50)"),
});

type ChargesFormType = z.infer<typeof chargesFormSchema>;

const API_BASE = "https://api.munchspace.io/api/v1";
const API_KEY =
  "eH4u8eujRzIrLWE+xkqyUWg33ggZ1Ts5bAKi/Ze5l23dyc7aLZSVMEssML0vUvDHrhchMtyskMxzGW3c4jhQCA==";

const Charges = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [charges, setCharges] = useState<Charge[]>([]);
  const [chargeTypes, setChargeTypes] = useState<ChargeType[]>([]);
  const [editingCharge, setEditingCharge] = useState<Charge | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [deleteCandidate, setDeleteCandidate] = useState<Charge | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accessToken = getAccessToken();
  const businessId = getBusinessId();

  useEffect(() => {
    const fetchData = async () => {
      setIsDataLoading(true);
      setError(null);

      try {
        // Fetch charge types
        const typesRes = await fetch(`${API_BASE}/meta/charge-types`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "x-api-key": API_KEY,
          },
        });

        if (!typesRes.ok) {
          throw new Error(
            `Charge types failed: ${typesRes.status} ${typesRes.statusText}`,
          );
        }

        const typesJson: ChargeTypeResponse = await typesRes.json();
        let activeTypes: ChargeType[] = [];
        if (typesJson.success && Array.isArray(typesJson.data)) {
          activeTypes = typesJson.data.filter((t) => t.isActive);
          setChargeTypes(activeTypes);
        }

        // Fetch business charges
        if (!businessId) throw new Error("Business ID is missing");

        const chargesRes = await fetch(
          `${API_BASE}/vendors/me/businesses/${businessId}/charges`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "x-api-key": API_KEY,
            },
          },
        );

        if (!chargesRes.ok) {
          throw new Error(
            `Charges fetch failed: ${chargesRes.status} ${chargesRes.statusText}`,
          );
        }

        const chargesData = await chargesRes.json();
        const rawCharges: ChargeResponseItem[] = chargesData?.data ?? [];

        const enrichedCharges = rawCharges
          .filter((c) => c.isEnabled)
          .map((c) => {
            const type = activeTypes.find((t) => t.id === c.chargeTypeId);
            return {
              ...c,
              name: type?.label || "Unknown Charge",
              type: type?.isPercentage ? "percentage" : "amount",
              formattedValue: type?.isPercentage
                ? `${c.amount}%`
                : `₦${Number(c.amount).toFixed(2)}`,
              lastUpdated: new Date(c.createdAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              }),
            };
          });

        setCharges(enrichedCharges);
      } catch (err: any) {
        console.error("Data loading error:", err);
        setError(
          err.message ||
            "Failed to load data. Please check your connection and try again.",
        );
      } finally {
        setIsDataLoading(false);
      }
    };

    if (accessToken && businessId) {
      fetchData();
    } else {
      setError(
        !accessToken
          ? "Authentication token is missing"
          : "Business ID is missing",
      );
      setIsDataLoading(false);
    }
  }, [accessToken, businessId]);

  const form = useForm<ChargesFormType>({
    resolver: zodResolver(chargesFormSchema),
    defaultValues: {
      chargeTypeId: "",
      amount: "",
    },
  });

  const selectedChargeTypeId = form.watch("chargeTypeId");
  const selectedType = chargeTypes.find((t) => t.id === selectedChargeTypeId);
  const isPercentage = selectedType?.isPercentage ?? false;

  const filteredCharges = charges.filter((charge) =>
    charge.name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const resetForm = () => {
    form.reset({ chargeTypeId: "", amount: "" });
    setEditingCharge(null);
  };

  const handleAddNew = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEdit = (charge: Charge) => {
    setEditingCharge(charge);
    form.reset({
      chargeTypeId: charge.chargeTypeId,
      amount: charge.amount.toString(),
    });
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (charge: Charge) => {
    setDeleteCandidate(charge);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteCandidate || !businessId) return;

    setIsLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/vendors/me/businesses/${businessId}/charges/${deleteCandidate.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "x-api-key": API_KEY,
          },
        },
      );

      if (!res.ok) throw new Error("Delete failed");

      setCharges((prev) => prev.filter((c) => c.id !== deleteCandidate.id));
      setDeleteCandidate(null);
      setIsDeleteDialogOpen(false);
    } catch (err) {
      console.error(err);
      setError("Failed to delete charge");
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (values: ChargesFormType) => {
    if (!businessId) {
      setError("Business ID is missing");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let payload: Record<string, any>;

      if (editingCharge) {
        // PATCH: only send updatable fields
        payload = {
          amount: parseFloat(values.amount),
          // isEnabled: true,  // Uncomment only if you want to allow toggling enabled state
        };
      } else {
        // POST: full creation payload
        payload = {
          chargeTypeId: values.chargeTypeId,
          amount: parseFloat(values.amount),
          isEnabled: true,
        };
      }

      const url = editingCharge
        ? `${API_BASE}/vendors/me/businesses/${businessId}/charges/${editingCharge.id}`
        : `${API_BASE}/vendors/me/businesses/${businessId}/charges`;

      const method = editingCharge ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "x-api-key": API_KEY,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errorDetail = "";
        try {
          const errorBody = await res.json();
          errorDetail =
            errorBody.message || errorBody.error || JSON.stringify(errorBody);
        } catch {
          errorDetail = await res.text().catch(() => "");
        }
        throw new Error(
          `${editingCharge ? "Update" : "Create"} failed: ${res.status} – ${errorDetail || res.statusText}`,
        );
      }

      // Refresh list
      const refreshRes = await fetch(
        `${API_BASE}/vendors/me/businesses/${businessId}/charges`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "x-api-key": API_KEY,
          },
        },
      );

      if (refreshRes.ok) {
        const data = await refreshRes.json();
        const raw = data?.data ?? [];
        const enriched = raw
          .filter((c: ChargeResponseItem) => c.isEnabled)
          .map((c: ChargeResponseItem) => {
            const type = chargeTypes.find((t) => t.id === c.chargeTypeId);
            return {
              ...c,
              name: type?.label || "Unknown",
              type: type?.isPercentage ? "percentage" : "amount",
              formattedValue: type?.isPercentage
                ? `${c.amount}%`
                : `₦${Number(c.amount).toFixed(2)}`,
              lastUpdated: new Date(c.createdAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              }),
            };
          });
        setCharges(enriched);
      }

      resetForm();
      setIsDialogOpen(false);
    } catch (err: any) {
      console.error("Save error:", err);
      setError(err.message || "Failed to save charge. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="max-w-7xl mx-auto space-y-8 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-2xl font-bold">Charges & Fees</h1>

          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search charges..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 border-gray-300"
              />
            </div>
            <Button
              onClick={handleAddNew}
              className="bg-orange-500 hover:bg-orange-600 text-white h-10 px-6"
            >
              + Add New Charge
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {isDataLoading ? (
            <div className="flex justify-center items-center py-20">
              <LoaderCircle className="h-10 w-10 animate-spin text-gray-500" />
              <span className="ml-3 text-gray-600">Loading charges...</span>
            </div>
          ) : error ? (
            <div className="text-center py-16 text-gray-600">
              <p>Unable to load charges at this time.</p>
              <p className="text-sm mt-2">
                Please check your connection and try again.
              </p>
            </div>
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
                Click "Add New Charge" to get started.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="ps-6 py-4">Name</TableHead>
                  <TableHead className="py-4">Value</TableHead>
                  <TableHead className="py-4">Last Updated</TableHead>
                  <TableHead className="text-right pe-6 py-4">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCharges.map((charge) => (
                  <TableRow key={charge.id} className="hover:bg-gray-50">
                    <TableCell className="ps-6 font-medium">
                      {charge.name}
                    </TableCell>
                    <TableCell>{charge.formattedValue}</TableCell>
                    <TableCell className="text-gray-600">
                      {charge.lastUpdated}
                    </TableCell>
                    <TableCell className="text-right pe-6">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(charge)}
                          disabled={isLoading}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(charge)}
                          disabled={isLoading}
                        >
                          <Pencil className="h-4 w-4 text-gray-600" />
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

      {/* Add / Edit Dialog */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold">
                {editingCharge ? "Edit Charge" : "Add New Charge"}
              </h2>
              <X
                className="cursor-pointer text-gray-500 hover:text-gray-800"
                onClick={() => {
                  setIsDialogOpen(false);
                  resetForm();
                }}
              />
            </div>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="p-6 space-y-6"
              >
                <FormField
                  control={form.control}
                  name="chargeTypeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Charge Type <span className="text-red-600">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!!editingCharge}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11! w-full">
                            <SelectValue placeholder="Select charge type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {chargeTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Amount <span className="text-red-600">*</span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                            {isPercentage ? "%" : "₦"}
                          </span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            className="pl-10 h-11"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {isLoading && (
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {editingCharge ? "Update" : "Add"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {isDeleteDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Confirm Deletion</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-700">
                Are you sure you want to delete{" "}
                <strong>{deleteCandidate?.name}</strong>? This action cannot be
                undone.
              </p>
            </div>
            <div className="flex justify-end gap-4 p-6 border-t">
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={isLoading}
              >
                {isLoading ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Charges;
