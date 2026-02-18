"use client";

import { useState, useEffect } from "react";
import { Trash2, Plus, LoaderCircle, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getAccessToken, getBusinessId } from "@/app/lib/auth";
import { refreshAccessToken } from "@/app/lib/api";

const addSettlementSchema = z.object({
  bankName: z.string().min(1, "Bank name is required"),
  accountName: z.string().min(1, "Account name is required"),
  accountNumber: z.string().min(1, "Account number is required"),
});

type AddSettlementType = z.infer<typeof addSettlementSchema>;

interface BankOption {
  name: string;
  code: string;
}

interface SettlementAccount {
  businessId?: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  bankCode?: string;
  logoUrl?: string;
}

const API_BASE = "https://dev.api.munchspace.io/api/v1";
const API_KEY =
  "eH4u8eujRzIrLWE+xkqyUWg33ggZ1Ts5bAKi/Ze5l23dyc7aLZSVMEssML0vUvDHrhchMtyskMxzGW3c4jhQCA==";

async function authenticatedFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  // SSR Guard to prevent build errors
  if (typeof window === "undefined") {
    return new Response(JSON.stringify({ success: false }), { status: 200 });
  }

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

export default function EarningsPage() {
  const [activeTab, setActiveTab] = useState<"earnings" | "payout">("earnings");
  const [account, setAccount] = useState<SettlementAccount | null>(null);
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [isLoadingBanks, setIsLoadingBanks] = useState(true);
  const [isLoadingAccount, setIsLoadingAccount] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);

  const form = useForm<AddSettlementType>({
    resolver: zodResolver(addSettlementSchema),
    defaultValues: { bankName: "", accountName: "", accountNumber: "" },
  });

  useEffect(() => {
    // Access localStorage safely inside useEffect
    const id = getBusinessId();
    setBusinessId(id);

    async function fetchData() {
      if (!id) return;
      try {
        setIsLoadingAccount(true);
        const accRes = await authenticatedFetch(
          `${API_BASE}/vendors/me/businesses/${id}/financials/bank-account`,
        );
        const accJson = await accRes.json();
        if (accJson.success && accJson.data) {
          setAccount(accJson.data);
        }

        const bankRes = await authenticatedFetch(
          `${API_BASE}/vendors/me/businesses/${id}/financials/banks`,
        );
        const bankJson = await bankRes.json();
        if (bankJson.success) setBanks(bankJson.data);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setIsLoadingAccount(false);
        setIsLoadingBanks(false);
      }
    }
    fetchData();
  }, []);

  const onSubmit = async (data: AddSettlementType) => {
    if (!businessId) {
      toast.error("Business ID is missing");
      return;
    }

    const selectedBank = banks.find((b) => b.name === data.bankName);
    if (!selectedBank) {
      toast.error("Selected bank not found");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        bankCode: selectedBank.code,
        logoUrl: "",
      };
      const res = await authenticatedFetch(
        `${API_BASE}/vendors/me/businesses/${businessId}/financials/bank-account`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to add bank account");
      }

      const resJson = await res.json();
      setAccount(resJson.data || payload);
      setIsDialogOpen(false);
      form.reset();
      toast.success("Settlement account added successfully");
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      setAccount(null);
      setIsDeleteOpen(false);
      toast.success("Account removed successfully");
    } catch (error) {
      toast.error("Failed to remove account");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-8 mt-10 md:mt-0">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900">Settlement</h1>
        <p className="text-gray-600 text-sm mt-2">
          Manage your payout account and track earnings.
        </p>

        <div className="flex gap-8 border-b border-gray-200 mt-10">
          <button
            onClick={() => setActiveTab("earnings")}
            className={cn(
              "pb-2 font-medium transition-colors",
              activeTab === "earnings"
                ? "text-orange-600 border-b-2 border-orange-600"
                : "text-gray-500 hover:text-gray-900",
            )}
          >
            Earnings & Activity
          </button>
          <button
            onClick={() => setActiveTab("payout")}
            className={cn(
              "pb-2 font-medium transition-colors",
              activeTab === "payout"
                ? "text-orange-600 border-b-2 border-orange-600"
                : "text-gray-500 hover:text-gray-900",
            )}
          >
            Payout Accounts
          </button>
        </div>

        {activeTab === "earnings" && (
          <div className="mt-10">
            {account ? (
              <div className="bg-gray-100 rounded-xl p-5">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Earnings
                </h2>
                <p className="text-3xl font-bold text-gray-900">₦0.00</p>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center">
                <Image
                  src="/images/Cash on Delivery.png"
                  width={300}
                  height={300}
                  alt="cash"
                />
                <h3 className="font-semibold text-2xl mt-4">
                  No settlement account set up.
                </h3>
                <Button
                  className="bg-munchprimary mt-5 text-white rounded-md"
                  onClick={() => setActiveTab("payout")}
                >
                  Setup settlement account
                </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === "payout" && (
          <div className="space-y-8 mt-5">
            {account && (
              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-6">
                <div>
                  <p className="font-medium text-lg text-gray-900">
                    {account.bankName}
                  </p>
                  <p className="text-gray-600">{account.accountNumber}</p>
                  <p className="text-sm text-gray-500">{account.accountName}</p>
                </div>
                <Button
                  variant="outline"
                  className="border-red-600 text-red-600 hover:bg-red-50 rounded-md"
                  onClick={() => setIsDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </Button>
              </div>
            )}

            {!account && !isLoadingAccount && (
              <div className="flex justify-center">
                <Button
                  onClick={() => setIsDialogOpen(true)}
                  variant="ghost"
                  className="text-gray-600 rounded-md"
                >
                  <Plus className="h-5 w-5 mr-2" /> Add Another Account
                </Button>
              </div>
            )}

            {isLoadingAccount && (
              <div className="flex justify-center py-10">
                <LoaderCircle className="h-8 w-8 animate-spin text-orange-600" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Account Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md bg-black/40 backdrop-blur-[2px] rounded-2xl border-none p-0 overflow-hidden outline-none">
          <div className="bg-white m-4 rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                Add Settlement Account
              </DialogTitle>
            </DialogHeader>

            {isLoadingBanks ? (
              <div className="py-8 flex justify-center">
                <LoaderCircle className="h-8 w-8 animate-spin text-orange-600" />
              </div>
            ) : (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6 mt-4"
                >
                  <FormField
                    control={form.control}
                    name="bankName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Bank Name <span className="text-red-600">*</span>
                        </FormLabel>
                        <Popover open={bankOpen} onOpenChange={setBankOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className="w-full justify-between h-12 rounded-md"
                              >
                                {field.value || "Select bank"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                              <CommandInput placeholder="Search bank..." />
                              <CommandEmpty>No bank found.</CommandEmpty>
                              <CommandGroup className="max-h-60 overflow-auto">
                                {banks.map((bank) => (
                                  <CommandItem
                                    key={bank.code}
                                    onSelect={() => {
                                      form.setValue("bankName", bank.name);
                                      setBankOpen(false);
                                    }}
                                  >
                                    {bank.name}
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

                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="accountNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Number *</FormLabel>
                          <FormControl>
                            <Input className="h-12 rounded-md" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="accountName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Name *</FormLabel>
                          <FormControl>
                            <Input className="h-12 rounded-md" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      className="rounded-md px-6"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-munchprimary hover:bg-orange-600 text-white rounded-md px-6"
                    >
                      {isSubmitting ? "Saving..." : "Add Account"}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl border-none shadow-xl p-0 overflow-hidden bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white m-4 rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                Remove Account?
              </DialogTitle>
              <DialogDescription>
                This will remove your current settlement account. You will need
                to add a new one to receive payouts.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-3 mt-4">
              <Button
                variant="outline"
                onClick={() => setIsDeleteOpen(false)}
                className="rounded-md w-full"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="rounded-md w-full bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? "Removing..." : "Yes, Remove"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
