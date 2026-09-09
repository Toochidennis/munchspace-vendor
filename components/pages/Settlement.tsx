"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  LoaderCircle,
  ShieldAlert,
  ChevronsUpDown,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getAccessToken, getBusinessId, logout } from "@/app/lib/auth";
import CustomModal from "@/components/layout/CustomModal";
import SupportModal from "@/components/support/SupportModal";
import { readApiError, refreshAccessToken } from "@/app/lib/api";

// ────────────────────────────────────────────────
//  Constants from .env
// ────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_BASE_URL || "";
const API_KEY = process.env.NEXT_PUBLIC_MUNCHSPACE_API_KEY || "";

// ────────────────────────────────────────────────
//  Authenticated Fetch (with token refresh on 401)
// ────────────────────────────────────────────────

async function authenticatedFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  if (typeof window === "undefined") {
    return new Response(JSON.stringify({ success: false }), { status: 200 });
  }

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
//  Schema & Types (unchanged)
// ────────────────────────────────────────────────

const addSettlementSchema = z.object({
  bankName: z.string().min(1, "Bank name is required"),
  accountName: z.string().min(1, "Account name is required"),
  accountNumber: z.string().min(1, "Account number is required"),
});

type AddSettlementType = z.infer<typeof addSettlementSchema>;

interface BankOption {
  id: string;
  name: string;
  code: string;
}

interface CashoutQuote {
  availableAmount: number;
  minimumAmount: number | null;
  feeAmount: number | null;
  netAmount: number | null;
  eligible: boolean;
  reason:
    | "CASHOUT_UNAVAILABLE"
    | "BELOW_MINIMUM"
    | "PAYOUT_IN_PROGRESS"
    | "ACCOUNT_CHANGE_HOLD"
    | null;
  holdUntil: string | null;
}

interface SettlementAccount {
  businessId?: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  bankCode?: string;
  logoUrl?: string;
}

// ────────────────────────────────────────────────
//  Component
// ────────────────────────────────────────────────

export default function EarningsPage() {
  const [activeTab, setActiveTab] = useState<"earnings" | "payout_history" | "payout">("earnings");
  const [account, setAccount] = useState<SettlementAccount | null>(null);
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [isLoadingBanks, setIsLoadingBanks] = useState(true);
  const [isLoadingAccount, setIsLoadingAccount] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [selectedBank, setSelectedBank] = useState<BankOption | null>(null);
  const [fetchNetworkError, setFetchNetworkError] = useState<string | null>(null);

  // Earnings tab state
  const [earningsSummary, setEarningsSummary] = useState<any>(null);
  const [earningsData, setEarningsData] = useState<any[]>([]);
  const [earningsMeta, setEarningsMeta] = useState<any>(null);
  const [earningsPage, setEarningsPage] = useState(1);
  const [earningsDateRange, setEarningsDateRange] = useState("last_30_days");
  const [isLoadingEarnings, setIsLoadingEarnings] = useState(false);

  // Payout history state
  const [payoutsData, setPayoutsData] = useState<any[]>([]);
  const [payoutsMeta, setPayoutsMeta] = useState<any>(null);
  const [payoutsPage, setPayoutsPage] = useState(1);
  const [isLoadingPayouts, setIsLoadingPayouts] = useState(false);

  // Cashout state
  const [cashoutQuote, setCashoutQuote] = useState<CashoutQuote | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [isCashoutOpen, setIsCashoutOpen] = useState(false);
  const [isCashingOut, setIsCashingOut] = useState(false);

  // Changing the payout account: a code is sent first, then entered here.
  const [changeStep, setChangeStep] = useState<"details" | "otp">("details");
  const [otp, setOtp] = useState("");
  const [otpSentTo, setOtpSentTo] = useState<string[]>([]);
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [payoutHoldUntil, setPayoutHoldUntil] = useState<string | null>(null);

  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [supportSubject, setSupportSubject] = useState<string | undefined>();

  const form = useForm<AddSettlementType>({
    resolver: zodResolver(addSettlementSchema),
    mode: "onChange",
    defaultValues: { bankName: "", accountNumber: "", accountName: "" },
  });

  const selectedBankName = form.watch("bankName");
  const accountNumber = form.watch("accountNumber");

  useEffect(() => {
    const id = getBusinessId();
    setBusinessId(id);


    async function fetchData() {
      if (!id) return;

      setIsLoadingAccount(true);
      setIsLoadingBanks(true);
      setFetchNetworkError(null);

      try {
        const [accRes, bankRes] = await Promise.all([
          authenticatedFetch(
            `${API_BASE}/vendors/me/businesses/${id}/financials/bank-account`,
          ),
          authenticatedFetch(
            `${API_BASE}/vendors/me/businesses/${id}/financials/banks`,
          ),
        ]);

        const accJson = await accRes.json();
        if (accJson.success && accJson.data) {
          setAccount(accJson.data);
          setPayoutHoldUntil(accJson.data.payoutsFrozenUntil ?? null);
        }

        const bankJson = await bankRes.json();
        if (bankJson.success) {
          setBanks(bankJson.data);
        }
      } catch (err: any) {
        console.error("Fetch error:", err);
        if (
          err.message?.includes("fetch") ||
          err.message?.includes("Network")
        ) {
          setFetchNetworkError(
            "Unable to load settlement data. Please check your internet connection.",
          );
        } else {
          toast.error("Failed to load settlement information");
        }
      } finally {
        setIsLoadingAccount(false);
        setIsLoadingBanks(false);
      }
    }

    fetchData();
  }, []);

  useEffect(() => {
    if (!businessId || activeTab !== "earnings") return;

    async function fetchEarnings() {
      setIsLoadingEarnings(true);
      try {
        const res = await authenticatedFetch(
          `${API_BASE}/vendors/me/businesses/${businessId}/financials/earnings?page=${earningsPage}&limit=10&dateRange=${earningsDateRange}`
        );
        const json = await res.json();
        if (json.success && json.data) {
          setEarningsSummary(json.data.summary);
          setEarningsData(json.data.earnings?.data || []);
          setEarningsMeta(json.data.earnings?.meta || null);
        }
      } catch (err) {
        console.error("Failed to fetch earnings:", err);
      } finally {
        setIsLoadingEarnings(false);
      }
    }
    fetchEarnings();
  }, [businessId, activeTab, earningsPage, earningsDateRange]);

  useEffect(() => {
    if (!businessId || activeTab !== "payout_history") return;

    async function fetchPayouts() {
      setIsLoadingPayouts(true);
      try {
        const res = await authenticatedFetch(
          `${API_BASE}/vendors/me/businesses/${businessId}/financials/payouts?page=${payoutsPage}&limit=10`
        );
        const json = await res.json();
        if (json.success && json.data) {
          setPayoutsData(json.data.payouts || []);
          setPayoutsMeta({
            total: json.data.total,
            page: json.data.page,
            limit: json.data.limit,
            totalPages: json.data.totalPages,
            hasNextPage: json.data.hasNextPage,
            hasPreviousPage: json.data.hasPreviousPage
          });
        }
      } catch (err) {
        console.error("Failed to fetch payouts:", err);
      } finally {
        setIsLoadingPayouts(false);
      }
    }
    fetchPayouts();
  }, [businessId, activeTab, payoutsPage]);

  // The quote carries the fee, which is the one thing a vendor must see before
  // committing — a scheduled payout is free and this one is not.
  const loadCashoutQuote = useCallback(async () => {
    if (!businessId) return;

    setIsLoadingQuote(true);
    try {
      const res = await authenticatedFetch(
        `${API_BASE}/vendors/me/businesses/${businessId}/financials/cashout`,
      );
      const json = await res.json();
      if (res.ok && json.success) {
        setCashoutQuote(json.data);
      }
    } catch {
      // Leaving the quote null hides the cashout card rather than showing a
      // button whose cost we cannot state.
    } finally {
      setIsLoadingQuote(false);
    }
  }, [businessId]);

  useEffect(() => {
    if (activeTab !== "earnings") return;
    loadCashoutQuote();
  }, [activeTab, loadCashoutQuote]);

  const confirmCashout = async () => {
    if (!businessId) return;

    setIsCashingOut(true);
    try {
      const res = await authenticatedFetch(
        `${API_BASE}/vendors/me/businesses/${businessId}/financials/cashout`,
        { method: "POST" },
      );

      if (!res.ok) {
        throw new Error(await readApiError(res, "Could not complete cashout"));
      }

      const json = await res.json();
      const payout = json.data;

      toast.success(
        `₦${(payout?.netAmount ?? 0).toLocaleString()} is on its way to your bank`,
      );
      setIsCashoutOpen(false);
      await loadCashoutQuote();
      setEarningsPage(1);
    } catch (err: any) {
      toast.error(err.message || "Could not complete cashout");
    } finally {
      setIsCashingOut(false);
    }
  };

  useEffect(() => {
    const verifyAccount = async () => {
      if (!businessId || !selectedBankName || !accountNumber?.length) {
        form.setValue("accountName", "");
        setVerificationError(null);
        return;
      }

      const selectedBank = banks.find((b) => b.name === selectedBankName);
      if (!selectedBank || accountNumber.length !== 10) {
        return;
      }

      setIsVerifying(true);
      setVerificationError(null);

      try {
        const payload = {
          accountNumber,
          bankCode: selectedBank.code,
        };

        const res = await authenticatedFetch(
          `${API_BASE}/vendors/me/businesses/${businessId}/financials/verify-account`,
          {
            method: "POST",
            body: JSON.stringify(payload),
          },
        );

        if (!res.ok) {
          throw new Error(await readApiError(res, "Account verification failed"));
        }

        const json = await res.json();
        const nameFromApi =
          json?.data?.accountName ||
          json?.data?.name ||
          json?.data?.accountHolderName ||
          json?.data?.holderName ||
          "";

        if (!nameFromApi) {
          throw new Error("Account name not returned from verification");
        }

        form.setValue("accountName", nameFromApi);
        setVerificationError(null);
      } catch (err: any) {
        setVerificationError(err.message || "Could not verify account name");
        form.setValue("accountName", "");
      } finally {
        setIsVerifying(false);
      }
    };

    if (selectedBankName && accountNumber?.length === 10) {
      const timer = setTimeout(verifyAccount, 800);
      return () => clearTimeout(timer);
    }
  }, [selectedBankName, accountNumber, businessId, banks, form]);

  const openAddAccount = () => {
    setIsEditingAccount(false);
    setChangeStep("details");
    setOtp("");
    setSelectedBank(null);
    setVerificationError(null);
    form.reset({ bankName: "", accountNumber: "", accountName: "" });
    setIsDialogOpen(true);
  };

  const openChangeAccount = () => {
    setIsEditingAccount(true);
    setChangeStep("details");
    setOtp("");
    setSelectedBank(null);
    setVerificationError(null);
    // The stored number comes back masked, so there is nothing to prefill —
    // the new details are typed and verified from scratch.
    form.reset({ bankName: "", accountNumber: "", accountName: "" });
    setIsDialogOpen(true);
  };

  /**
   * Step one of a change. The code goes to the email and phone on the account,
   * which a stolen dashboard session does not reach.
   */
  const requestAccountChange = async () => {
    if (!businessId) return;

    if (!selectedBank || !form.getValues("accountName")) {
      toast.error("Select your bank and let the account name verify first");
      return;
    }

    setIsRequestingOtp(true);
    try {
      const res = await authenticatedFetch(
        `${API_BASE}/vendors/me/businesses/${businessId}/financials/bank-account/change-request`,
        { method: "POST" },
      );

      if (!res.ok) {
        throw new Error(
          await readApiError(res, "Could not send your verification code"),
        );
      }

      const json = await res.json();
      setOtpSentTo(json?.data?.sentTo ?? []);
      setChangeStep("otp");
    } catch (err: any) {
      toast.error(err.message || "Could not send your verification code");
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const onSubmit = async (data: AddSettlementType) => {
    if (!businessId) {
      toast.error("Business ID is missing");
      return;
    }

    if (!selectedBank) {
      toast.error("Please select a bank");
      return;
    }

    if (isEditingAccount && changeStep !== "otp") {
      await requestAccountChange();
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        bankId: selectedBank.id,
        accountNumber: data.accountNumber,
        bankCode: selectedBank.code,
        ...(isEditingAccount ? { otp } : {}),
      };

      const res = await authenticatedFetch(
        `${API_BASE}/vendors/me/businesses/${businessId}/financials/bank-account`,
        {
          method: isEditingAccount ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        throw new Error(
          await readApiError(
            res,
            isEditingAccount
              ? "Failed to update bank account"
              : "Failed to add bank account",
          ),
        );
      }

      const resJson = await res.json();

      setAccount(resJson.data || { ...data, bankCode: selectedBank.code });
      setIsDialogOpen(false);
      setOtp("");
      setChangeStep("details");
      form.reset();

      if (isEditingAccount) {
        setPayoutHoldUntil(resJson?.data?.payoutsFrozenUntil ?? null);
        toast.success("Settlement account updated");
        loadCashoutQuote();
      } else {
        toast.success("Settlement account added successfully");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
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
            onClick={() => setActiveTab("payout_history")}
            className={cn(
              "pb-2 font-medium transition-colors",
              activeTab === "payout_history"
                ? "text-orange-600 border-b-2 border-orange-600"
                : "text-gray-500 hover:text-gray-900",
            )}
          >
            Payout History
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
          <div className="mt-6 space-y-6">
            {isLoadingEarnings && !earningsSummary ? (
              <div className="space-y-6">
                <Skeleton className="h-[200px] w-full rounded-xl" />
                <Skeleton className="h-[400px] w-full rounded-xl" />
              </div>
            ) : (
              <>
                <div className="bg-gray-50 rounded-xl p-6 space-y-6 border border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Earnings</h2>
                <p className="text-gray-500 text-sm mt-1 max-w-3xl">
                  Your available balance updates once an order is paid and confirmed by the customer's bank. Funds are held until the order is successfully delivered by our dispatch rider. This can take up to 2 days. <button type="button" onClick={() => setIsSupportOpen(true)} className="text-blue-500 hover:underline">Need assistance?</button> Our team is ready to help.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-gray-200">
                <div>
                  <p className="text-sm font-medium text-gray-500 flex items-center gap-1">Total balance <AlertCircle className="w-4 h-4"/></p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {!earningsSummary ? <Skeleton className="h-8 w-32"/> : `₦ ${(earningsSummary?.totalBalance || 0).toLocaleString()}`}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 flex items-center gap-1">Funds on hold <AlertCircle className="w-4 h-4"/></p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {!earningsSummary ? <Skeleton className="h-8 w-32"/> : `₦ ${(earningsSummary?.pendingBalance || 0).toLocaleString()}`}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 flex items-center gap-1">In transit to bank <AlertCircle className="w-4 h-4"/></p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {!earningsSummary ? <Skeleton className="h-8 w-32"/> : `₦ ${(earningsSummary?.nextPaymentAmount || 0).toLocaleString()}`}
                  </p>
                </div>
              </div>

              {/* Cash out. Only shown once the API says it is configured — a
                  button that always fails is worse than no button. */}
              {cashoutQuote && cashoutQuote.reason !== "CASHOUT_UNAVAILABLE" && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <p className="font-semibold text-gray-900">
                        Cash out early
                      </p>
                      <p className="text-sm text-gray-500 mt-1 max-w-xl">
                        {cashoutQuote.reason === "ACCOUNT_CHANGE_HOLD" ? (
                          <>
                            Your payouts are on hold until{" "}
                            {formatHoldDeadline(cashoutQuote.holdUntil)} while we
                            confirm the change to your settlement account. Your
                            earnings are safe.
                          </>
                        ) : cashoutQuote.reason === "PAYOUT_IN_PROGRESS" ? (
                          "A payout is already on its way to your bank. You can cash out again once it lands."
                        ) : cashoutQuote.reason === "BELOW_MINIMUM" ? (
                          `You need at least ₦${(cashoutQuote.minimumAmount || 0).toLocaleString()} cleared to cash out. Scheduled payouts are unaffected.`
                        ) : (
                          <>
                            ₦{cashoutQuote.availableAmount.toLocaleString()}{" "}
                            cleared. A ₦
                            {(cashoutQuote.feeAmount || 0).toLocaleString()}{" "}
                            transfer fee applies — your scheduled payout is still
                            free.
                          </>
                        )}
                      </p>
                    </div>
                    <Button
                      onClick={() => setIsCashoutOpen(true)}
                      disabled={!cashoutQuote.eligible || isLoadingQuote}
                      className="bg-munchprimary hover:bg-munchprimaryDark text-white rounded-md shrink-0"
                    >
                      {isLoadingQuote ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        `Cash out ₦${(cashoutQuote.netAmount ?? 0).toLocaleString()}`
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="flex justify-between items-center p-5 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900">History</h3>
                <Select value={earningsDateRange} defaultValue="last_30_days" onValueChange={setEarningsDateRange}>
                  <SelectTrigger className="w-[160px] h-9">
                    <SelectValue placeholder="Date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last_7_days">Last 7 days</SelectItem>
                    <SelectItem value="last_30_days">Last 30 days</SelectItem>
                    <SelectItem value="last_90_days">Last 90 days</SelectItem>
                    <SelectItem value="all_time">All time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="py-4">ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingEarnings ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      </TableRow>
                    ))
                  ) : earningsData.length > 0 ? (
                    earningsData.map((item: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium text-gray-900 py-4">{item.orderCode}</TableCell>
                        <TableCell className="text-gray-700">Order - {item.orderCode}</TableCell>
                        <TableCell className="text-gray-500">{new Date(item.date).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</TableCell>
                        <TableCell className="font-medium text-gray-900">+₦{item.amount.toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-gray-500">No history found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              
              {/* Pagination */}
              {earningsMeta && earningsMeta.totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50/50">
                  <div className="text-sm text-gray-500">
                    Total {earningsMeta.total} items
                  </div>
                  <div className="flex gap-2 items-center">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={!earningsMeta.hasPreviousPage}
                      onClick={() => setEarningsPage(p => Math.max(1, p - 1))}
                    >
                      Prev
                    </Button>
                    <span className="text-sm text-gray-600 px-2">Page {earningsPage} of {earningsMeta.totalPages}</span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={!earningsMeta.hasNextPage}
                      onClick={() => setEarningsPage(p => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
              </>
            )}
          </div>
        )}

        {activeTab === "payout_history" && (
          <div className="mt-6">
            {isLoadingPayouts && payoutsData.length === 0 ? (
              <Skeleton className="h-[400px] w-full rounded-xl" />
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="p-5 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900">Payout History</h3>
              </div>
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="py-4">ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingPayouts ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      </TableRow>
                    ))
                  ) : payoutsData.length > 0 ? (
                    payoutsData.map((item: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium text-gray-900 py-4">{item.code}</TableCell>
                        <TableCell className="text-gray-500">{new Date(item.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</TableCell>
                        <TableCell className="font-medium text-gray-900">₦{item.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <span className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium",
                            item.status === "Failed" ? "bg-red-100 text-red-700" :
                            item.status === "Successful" ? "bg-green-100 text-green-700" :
                            "bg-yellow-100 text-yellow-700"
                          )}>
                            {item.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-gray-500">No payouts found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              
              {/* Pagination */}
              {payoutsMeta && payoutsMeta.totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50/50">
                  <div className="text-sm text-gray-500">
                    Total {payoutsMeta.total} items
                  </div>
                  <div className="flex gap-2 items-center">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={!payoutsMeta.hasPreviousPage}
                      onClick={() => setPayoutsPage(p => Math.max(1, p - 1))}
                    >
                      Prev
                    </Button>
                    <span className="text-sm text-gray-600 px-2">Page {payoutsPage} of {payoutsMeta.totalPages}</span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={!payoutsMeta.hasNextPage}
                      onClick={() => setPayoutsPage(p => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
            )}
          </div>
        )}

        {activeTab === "payout" && (
          <div className="space-y-8 mt-5">
            {isLoadingAccount ? (
              <Skeleton className="h-[100px] w-full rounded-md" />
            ) : account ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gray-50 rounded-lg p-6">
                  <div>
                    <p className="font-medium text-lg text-gray-900">
                      {account.bankName}
                    </p>
                    <p className="text-gray-600">{account.accountNumber}</p>
                    <p className="text-sm text-gray-500">{account.accountName}</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={openChangeAccount}
                    className="rounded-md shrink-0"
                  >
                    Change account
                  </Button>
                </div>

                {payoutHoldUntil && (
                  <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600" />
                    <div className="text-sm text-amber-900">
                      <p className="font-medium">
                        Payouts are on hold until{" "}
                        {formatHoldDeadline(payoutHoldUntil)}
                      </p>
                      <p className="mt-1">
                        We hold payouts for a day after the settlement account
                        changes. Your earnings are safe and resume automatically.{" "}
                        <button
                          type="button"
                          onClick={() => {
                            setSupportSubject("I did not change my payout account");
                            setIsSupportOpen(true);
                          }}
                          className="underline font-medium"
                        >
                          Didn&apos;t make this change?
                        </button>
                      </p>
                    </div>
                  </div>
                )}

                <p className="text-sm text-gray-500">
                  Changing this account needs a code sent to the email and phone
                  on your account.{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setSupportSubject("Help changing my payout account");
                      setIsSupportOpen(true);
                    }}
                    className="text-blue-500 hover:underline"
                  >
                    Can&apos;t receive the code?
                  </button>
                </p>
              </div>
            ) : (
              <div className="flex justify-center">
                <Button
                  onClick={openAddAccount}
                  className="text-white bg-munchprimary rounded-md hover:bg-munchprimaryDark"
                >
                  <Plus className="h-5 w-5" /> Add Account
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <CustomModal
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={
          isEditingAccount
            ? changeStep === "otp"
              ? "Confirm it's you"
              : "Change account"
            : "Add Account"
        }
        maxWidth="sm:max-w-[450px]"
      >
        {isEditingAccount && changeStep === "otp" ? (
          <div className="space-y-5 mt-2">
            <p className="text-sm text-gray-600">
              We sent a code to{" "}
              <span className="font-medium text-gray-900">
                {otpSentTo.length ? otpSentTo.join(" and ") : "your account"}
              </span>
              . Enter it to move your earnings to{" "}
              <span className="font-medium text-gray-900">
                {form.getValues("bankName")} ••••{" "}
                {form.getValues("accountNumber").slice(-4)}
              </span>
              .
            </p>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Verification code
              </label>
              <Input
                className="h-12 rounded-md mt-1.5 tracking-[0.4em] text-center text-lg"
                placeholder="——————"
                inputMode="numeric"
                maxLength={8}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              />
            </div>

            <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600" />
              <p className="text-sm text-amber-900">
                Payouts and cashouts pause for 24 hours after this change, so we
                can catch it if it wasn&apos;t you.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setChangeStep("details")}
                className="rounded-md px-6"
              >
                Back
              </Button>
              <Button
                type="button"
                disabled={isSubmitting || otp.length < 4}
                onClick={() => onSubmit(form.getValues())}
                className="bg-munchprimary hover:bg-orange-600 text-white rounded-md px-6"
              >
                {isSubmitting ? "Confirming..." : "Confirm change"}
              </Button>
            </div>
          </div>
        ) : isLoadingBanks ? (
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
                                  setSelectedBank(bank);
                                  form.clearErrors("bankName");
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

              <div className="grid gap-4">
                <FormField
                  control={form.control}
                  name="accountNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Number *</FormLabel>
                      <FormControl>
                        <Input
                          className="h-12 rounded-md"
                          placeholder="e.g. 0123456789"
                          maxLength={10}
                          {...field}
                        />
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
                      <FormLabel>Account Name</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input
                            className="h-12 rounded-md bg-gray-50"
                            placeholder={
                              isVerifying
                                ? "Verifying..."
                                : "Will be filled automatically"
                            }
                            readOnly
                            disabled
                            {...field}
                          />
                        </FormControl>
                        {isVerifying && (
                          <LoaderCircle className="absolute right-3 top-3.5 h-5 w-5 animate-spin text-orange-600" />
                        )}
                      </div>
                      {verificationError && (
                        <p className="text-sm text-red-600 mt-1">
                          {verificationError}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-3 pt-5 border-t bg-white">
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
                    disabled={isSubmitting || isRequestingOtp}
                    className="bg-munchprimary hover:bg-orange-600 text-white rounded-md px-6"
                  >
                    {isEditingAccount
                      ? isRequestingOtp
                        ? "Sending code..."
                        : "Continue"
                      : isSubmitting
                        ? "Saving..."
                        : "Add Account"}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        )}
      </CustomModal>

      <CustomModal
        isOpen={isCashoutOpen}
        onClose={() => setIsCashoutOpen(false)}
        title="Cash out now"
        maxWidth="sm:max-w-[420px]"
      >
        <div className="space-y-5">
          <p className="text-sm text-gray-600">
            This sends your cleared earnings to{" "}
            <span className="font-medium text-gray-900">
              {account?.bankName} {account?.accountNumber}
            </span>{" "}
            today instead of on your next payout day.
          </p>

          <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
            <div className="flex justify-between px-4 py-3 text-sm">
              <span className="text-gray-500">Cleared earnings</span>
              <span className="font-medium text-gray-900">
                ₦{(cashoutQuote?.availableAmount ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between px-4 py-3 text-sm">
              <span className="text-gray-500">Transfer fee</span>
              <span className="font-medium text-gray-900">
                −₦{(cashoutQuote?.feeAmount ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between px-4 py-3">
              <span className="font-medium text-gray-900">You receive</span>
              <span className="text-lg font-bold text-gray-900">
                ₦{(cashoutQuote?.netAmount ?? 0).toLocaleString()}
              </span>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Your next scheduled payout is unaffected and stays free. Earnings
            clear 24 hours after an order completes, so anything delivered today
            is not included yet.
          </p>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsCashoutOpen(false)}
              className="rounded-md px-6"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmCashout}
              disabled={isCashingOut}
              className="bg-munchprimary hover:bg-orange-600 text-white rounded-md px-6"
            >
              {isCashingOut ? "Sending..." : "Cash out"}
            </Button>
          </div>
        </div>
      </CustomModal>

      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => {
          setIsSupportOpen(false);
          setSupportSubject(undefined);
        }}
        presetSubject={supportSubject}
      />
    </div>
  );
}

/** The API sends an ISO instant; the vendor reads it on a Lagos clock. */
function formatHoldDeadline(value: string | null): string {
  if (!value) return "soon";

  return new Date(value).toLocaleString("en-NG", {
    timeZone: "Africa/Lagos",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}
