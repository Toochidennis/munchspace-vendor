"use client";

import { useState, useEffect } from "react";
import {
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  ChevronsUpDown,
  Check,
  X,
} from "lucide-react";
import { format, subDays, parse } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  id: number;
  bankName: string;
  accountName: string;
  accountNumber: string;
  // logo removed
}

interface EarningsItem {
  id: string;
  type: string;
  date: string;
  amount: string;
}

// Your earnings data remains unchanged...
const earningsData: EarningsItem[] = [
  /* ... your existing data ... */
];

export default function EarningsPage({
  businessId, // ← You must pass this from parent / context / auth
}: {
  businessId: string;
}) {
  const [activeTab, setActiveTab] = useState<"earnings" | "payout">("earnings");
  const [accounts, setAccounts] = useState<SettlementAccount[]>([]);
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [isLoadingBanks, setIsLoadingBanks] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState<"7" | "30" | "90">("30");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);

  const form = useForm<AddSettlementType>({
    resolver: zodResolver(addSettlementSchema),
    defaultValues: {
      bankName: "",
      accountName: "",
      accountNumber: "",
    },
    mode: "onChange",
  });

  // Pagination states...
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const currentDate = new Date(2025, 11, 21);
  const daysMap: Record<"7" | "30" | "90", number> = {
    "7": 6,
    "30": 29,
    "90": 89,
  };

  const startDate = subDays(currentDate, daysMap[filterPeriod]);
  const filteredData = earningsData.filter((item) => {
    const itemDate = parse(item.date, "MMM dd, yyyy", new Date());
    return itemDate >= startDate;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  // Fetch banks on mount
  useEffect(() => {
    async function fetchBanks() {
      if (!businessId) return;

      try {
        setIsLoadingBanks(true);
        const res = await fetch(
          `/api/v1/vendors/me/businesses/${businessId}/financials/banks`,
        );

        if (!res.ok) throw new Error("Failed to fetch banks");

        const json = await res.json();

        if (json.success && Array.isArray(json.data)) {
          setBanks(json.data);
        }
      } catch (err) {
        console.error("Error fetching banks:", err);
        // Optionally: show toast/notification
      } finally {
        setIsLoadingBanks(false);
      }
    }

    fetchBanks();
  }, [businessId]);

  // Also fetch existing accounts on mount (you'll likely want to add this endpoint)
  // For now assuming accounts are fetched elsewhere or start empty

  const handleFilterChange = (value: "7" | "30" | "90") => {
    setFilterPeriod(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  const getPageNumbers = () => {
    if (totalPages <= 5)
      return Array.from({ length: totalPages }, (_, i) => i + 1);

    const pages: (number | string)[] = [];

    if (currentPage <= 5) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      if (totalPages > 5) {
        pages.push("...");
        pages.push(totalPages);
      }
    } else if (currentPage > 5 && currentPage < totalPages - 4) {
      pages.push(
        1,
        "...",
        currentPage - 1,
        currentPage,
        currentPage + 1,
        "...",
        totalPages,
      );
    } else {
      pages.push(1, "...");
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    }

    return pages;
  };

  const onSubmit = async (data: AddSettlementType) => {
    if (!businessId) {
      alert("Business ID is missing");
      return;
    }

    const selectedBank = banks.find((b) => b.name === data.bankName);
    if (!selectedBank) {
      alert("Selected bank not found");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        accountName: data.accountName,
        bankCode: selectedBank.code,
        logoUrl: "", // ← blank as requested – replace later if needed
      };

      const res = await fetch(
        `/api/v1/vendors/me/businesses/${businessId}/financials/bank-account`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to add bank account");
      }

      // Optionally refetch accounts here or add optimistically
      const newAccount: SettlementAccount = {
        id: Date.now(), // temporary – replace with real ID from response if available
        ...data,
      };

      setAccounts((prev) => [...prev, newAccount]);
      setIsDialogOpen(false);
      form.reset();

      // Optional: success toast
    } catch (err: any) {
      console.error(err);
      alert(err.message || "An error occurred while adding the account");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm("Are you sure you want to delete this account?")) return;
    setAccounts((prev) => prev.filter((acc) => acc.id !== id));
    // TODO: Add DELETE API call if backend supports it
  };

  return (
    <div className="min-h-screen p-6 md:p-8 mt-10 md:mt-0">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900">Settlement</h1>
        <p className="text-gray-600 text-sm mt-2">
          Manage your payout account, track earnings, and monitor money movement
          for your store.
        </p>

        {/* Tabs */}
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

        {/* Earnings Tab */}
        {activeTab === "earnings" && (
          <>
            {accounts.length > 0 ? (
              <div className="space-y-8">
                {/* Earnings summary card */}
                <div className="bg-gray-100 mt-5 rounded-xl p-5">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    Earnings
                  </h2>
                  <p className="text-gray-600 text-sm mb-6">
                    Your available balance updates once an order is paid and
                    confirmed...
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                    <div className="p-3 md:p-6 pb-0">
                      <p className="text-gray-500 mb-2 text-sm">
                        Total balance
                      </p>
                      <p className="text-3xl font-bold text-gray-900">₦0.00</p>
                    </div>
                    {/* ... other cards ... */}
                  </div>
                </div>

                {/* Filter + Table + Pagination (unchanged) */}
                {/* ... your existing filter, table, pagination code ... */}
              </div>
            ) : (
              <div className="flex justify-center mt-3 text-center">
                <div className="max-w-xl">
                  <Image
                    src="/images/Cash on Delivery.png"
                    width={300}
                    height={300}
                    alt="cash on delivery"
                    className="mx-auto"
                  />
                  <h3 className="font-semibold text-munchprimary text-2xl mt-4">
                    You haven’t set up your settlement account yet.
                  </h3>
                  <p className="text-sm max-w-lg mt-2">
                    Set up your settlement account to receive payouts...
                  </p>
                  <Button
                    className="bg-munchprimary mt-5 text-white"
                    onClick={() => setActiveTab("payout")}
                  >
                    Setup settlement account
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Payout Accounts Tab */}
        {activeTab === "payout" && (
          <div className="space-y-8 mt-5">
            <div className="space-y-6">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-6 md:p-6"
                >
                  <div>
                    <p className="font-medium text-lg text-gray-900">
                      {account.bankName}
                    </p>
                    <p className="text-gray-600">{account.accountNumber}</p>
                    <p className="text-sm text-gray-500">
                      {account.accountName}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => handleDelete(account.id)}
                    className="border-red-600 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex justify-center">
              <Button
                onClick={() => setIsDialogOpen(true)}
                variant="ghost"
                className="text-gray-600 hover:text-gray-900"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Another Account
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add Account Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
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
                              role="combobox"
                              className={cn(
                                "w-full justify-between h-12",
                                !field.value && "text-muted-foreground",
                              )}
                            >
                              {field.value || "Select bank"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                          <Command>
                            <CommandInput placeholder="Search bank..." />
                            <CommandEmpty>No bank found.</CommandEmpty>
                            <CommandGroup className="max-h-60 overflow-auto">
                              {banks.map((bank) => (
                                <CommandItem
                                  key={bank.code}
                                  value={bank.name}
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
                        <FormLabel>
                          Account Number <span className="text-red-600">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input className="h-12" {...field} />
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
                        <FormLabel>
                          Account Name <span className="text-red-600">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input className="h-12" {...field} />
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
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || isLoadingBanks}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    {isSubmitting ? (
                      <>
                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Add Account"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
