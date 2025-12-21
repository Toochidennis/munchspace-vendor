"use client";

import { useState } from "react";
import { Trash2, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { format, subDays, parse } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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

interface SettlementAccount {
  id: number;
  bankName: string;
  accountName: string;
  accountNumber: string;
}

interface EarningsItem {
  id: string;
  type: string;
  date: string; // "Dec 20, 2025" format
  amount: string;
}

// Expanded earnings data with more items
const earningsData: EarningsItem[] = [
  {
    id: "ORD001",
    type: "Order Payment",
    date: "Dec 20, 2025",
    amount: "₦4,500.00",
  },
  {
    id: "ORD002",
    type: "Order Payment",
    date: "Dec 19, 2025",
    amount: "₦3,200.00",
  },
  {
    id: "ORD003",
    type: "Order Payment",
    date: "Dec 18, 2025",
    amount: "₦5,800.00",
  },
  { id: "ORD004", type: "Refund", date: "Dec 17, 2025", amount: "-₦1,200.00" },
  {
    id: "ORD005",
    type: "Order Payment",
    date: "Dec 16, 2025",
    amount: "₦6,000.00",
  },
  {
    id: "ORD006",
    type: "Order Payment",
    date: "Dec 15, 2025",
    amount: "₦2,900.00",
  },
  {
    id: "ORD007",
    type: "Order Payment",
    date: "Dec 14, 2025",
    amount: "₦7,150.00",
  },
  { id: "ORD008", type: "Refund", date: "Dec 13, 2025", amount: "-₦800.00" },
  {
    id: "ORD009",
    type: "Order Payment",
    date: "Dec 12, 2025",
    amount: "₦4,300.00",
  },
  {
    id: "ORD010",
    type: "Order Payment",
    date: "Dec 11, 2025",
    amount: "₦5,500.00",
  },
  {
    id: "ORD011",
    type: "Order Payment",
    date: "Dec 10, 2025",
    amount: "₦3,750.00",
  },
  {
    id: "ORD012",
    type: "Order Payment",
    date: "Dec 09, 2025",
    amount: "₦6,200.00",
  },
  { id: "ORD013", type: "Refund", date: "Dec 08, 2025", amount: "-₦1,500.00" },
  {
    id: "ORD014",
    type: "Order Payment",
    date: "Dec 07, 2025",
    amount: "₦8,000.00",
  },
  {
    id: "ORD015",
    type: "Order Payment",
    date: "Dec 06, 2025",
    amount: "₦2,400.00",
  },
  {
    id: "ORD016",
    type: "Order Payment",
    date: "Dec 05, 2025",
    amount: "₦4,100.00",
  },
  {
    id: "ORD017",
    type: "Order Payment",
    date: "Dec 04, 2025",
    amount: "₦5,900.00",
  },
  {
    id: "ORD018",
    type: "Order Payment",
    date: "Dec 03, 2025",
    amount: "₦3,600.00",
  },
  { id: "ORD019", type: "Refund", date: "Dec 02, 2025", amount: "-₦900.00" },
  {
    id: "ORD020",
    type: "Order Payment",
    date: "Dec 01, 2025",
    amount: "₦7,800.00",
  },
  {
    id: "ORD021",
    type: "Order Payment",
    date: "Nov 30, 2025",
    amount: "₦4,200.00",
  },
  {
    id: "ORD022",
    type: "Order Payment",
    date: "Nov 29, 2025",
    amount: "₦6,500.00",
  },
  {
    id: "ORD023",
    type: "Order Payment",
    date: "Nov 28, 2025",
    amount: "₦3,100.00",
  },
  { id: "ORD024", type: "Refund", date: "Nov 27, 2025", amount: "-₦2,000.00" },
  {
    id: "ORD025",
    type: "Order Payment",
    date: "Nov 26, 2025",
    amount: "₦5,300.00",
  },
];

const bankOptions = [
  "Access Bank",
  "Fidelity Bank",
  "First Bank",
  "GTBank",
  "Polaris Bank",
  "Stanbic IBTC",
  "Sterling Bank",
  "Union Bank",
  "United Bank for Africa (UBA)",
  "Wema Bank",
  "Zenith Bank",
];

export default function EarningsPage() {
  const [activeTab, setActiveTab] = useState<"earnings" | "payout">("earnings");
  const [accounts, setAccounts] = useState<SettlementAccount[]>([
    {
      id: 1,
      bankName: "GTBank",
      accountName: "Sebotimo Foods",
      accountNumber: "0123456789",
    },
  ]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState<"7" | "30" | "90">("30");
  const [formData, setFormData] = useState({
    bankName: "",
    accountName: "",
    accountNumber: "",
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Current date as per context: December 21, 2025
  const currentDate = new Date(2025, 11, 21); // Month is 0-indexed (11 = December)

  // Filter data based on selected period
  const daysMap: Record<"7" | "30" | "90", number> = {
    "7": 6, // inclusive: today - 6 days
    "30": 29,
    "90": 89,
  };

  const startDate = subDays(currentDate, daysMap[filterPeriod]);

  const filteredData = earningsData.filter((item) => {
    const itemDate = parse(item.date, "MMM dd, yyyy", new Date());
    return itemDate >= startDate;
  });

  // Pagination logic on filtered data
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // Reset page when filter changes
  const handleFilterChange = (value: "7" | "30" | "90") => {
    setFilterPeriod(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  const getPageNumbers = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [];

    if (currentPage <= 5) {
      for (let i = 1; i <= 5; i++) {
        pages.push(i);
      }
      if (totalPages > 5) {
        pages.push("...");
        pages.push(totalPages);
      }
    } else if (currentPage > 5 && currentPage < totalPages - 4) {
      pages.push(1);
      pages.push("...");
      pages.push(currentPage - 1, currentPage, currentPage + 1);
      pages.push("...");
      pages.push(totalPages);
    } else {
      pages.push(1);
      pages.push("...");
      for (let i = totalPages - 4; i <= totalPages; i++) {
        pages.push(i);
      }
    }

    return pages;
  };

  const openDialog = () => {
    setFormData({ bankName: "", accountName: "", accountNumber: "" });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (
      !formData.bankName ||
      !formData.accountName ||
      !formData.accountNumber
    ) {
      alert("Please fill in all fields");
      return;
    }

    const newAccount: SettlementAccount = {
      id: accounts.length + 1,
      bankName: formData.bankName,
      accountName: formData.accountName,
      accountNumber: formData.accountNumber,
    };

    setAccounts([...accounts, newAccount]);
    setIsDialogOpen(false);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this account?")) {
      setAccounts(accounts.filter((a) => a.id !== id));
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-8 mt-10 md:mt-0">
      <div className="max-w-7xl mx-auto">
        {/* Page Title */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settlement</h1>
          <p className="text-gray-600 text-sm mt-2">
            Manage your payout account, track earnings, and monitor money
            movement for your store.
          </p>
        </div>
        {/* Tabs */}
        <div className="flex gap-8 border-b border-gray-200 mt-10">
          <button
            onClick={() => setActiveTab("earnings")}
            className={`pb-2 font-medium transition-colors ${
              activeTab === "earnings"
                ? "text-orange-600 border-b-2 border-orange-600"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Earnings & Activity
          </button>
          <button
            onClick={() => setActiveTab("payout")}
            className={`pb-2 font-medium transition-colors ${
              activeTab === "payout"
                ? "text-orange-600 border-b-2 border-orange-600"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Payout Accounts
          </button>
        </div>

        {/* Earnings & Activity Tab */}
        {activeTab === "earnings" && (
          <div className="space-y-8">
            {/* Earnings Card */}
            <div className="bg-gray-100 mt-5 rounded-xl p-5">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Earnings</h2>
              <p className="text-gray-600 text-sm mb-6">
                Your available balance updates once an order is paid and
                confirmed by the customer's bank.
                <br />
                Funds are held until the order is successfully delivered by our
                dispatch rider. This can take up to 2 days.
                <br />
                <a href="#" className="text-orange-600 underline">
                  Need assistance?
                </a>{" "}
                Our team is ready to help.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                <div className="p-3 md:p-6 pb-0">
                  <p className="text-gray-500 mb-2 text-sm">Total balance</p>
                  <p className="text-3xl font-bold text-gray-900">₦0.00</p>
                </div>
                <div className="p-3 md:p-6 pb-0">
                  <p className="text-gray-500 mb-2 text-sm">Funds on hold</p>
                  <p className="text-3xl font-bold text-gray-900">₦0.00</p>
                </div>
                <div className="p-3 md:p-6 pb-0">
                  <p className="text-gray-500 mb-2 text-sm">
                    In transit to bank
                  </p>
                  <p className="text-3xl font-bold text-gray-900">₦0.00</p>
                </div>
              </div>
            </div>

            {/* Activity Filter */}
            <div className="flex justify-end mb-4">
              <Select value={filterPeriod} onValueChange={handleFilterChange}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-gray-500 py-12"
                      >
                        No activity found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedData.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.id}</TableCell>
                        <TableCell>{item.type}</TableCell>
                        <TableCell>{item.date}</TableCell>
                        <TableCell className="text-right font-medium">
                          {item.amount}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {paginatedData.length > 0 && (
              <div className="flex items-center justify-center mx-2 gap-5 text-sm">
                <p className="text-gray-600 hidden md:block">
                  Total <span>{filteredData.length}</span> items
                </p>

                <div className="flex items-center gap-2 md:gap-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      handlePageChange(Math.max(1, currentPage - 1))
                    }
                    disabled={currentPage === 1}
                    className="hover:bg-gray-100 disabled:opacity-50"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>

                  <div className="flex items-center gap-2">
                    {getPageNumbers().map((page, index) => (
                      <div key={index}>
                        {page === "..." ? (
                          <span className="text-gray-500 px-2 flex items-center">
                            <p className="-mt-2">...</p>
                          </span>
                        ) : (
                          <Button
                            variant={currentPage === page ? "default" : "ghost"}
                            size="sm"
                            onClick={() => handlePageChange(page as number)}
                            className={cn(
                              "min-w-8 md:min-w-10",
                              currentPage === page &&
                                "bg-orange-500 hover:bg-orange-600 text-white"
                            )}
                          >
                            {page}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      handlePageChange(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="hover:bg-gray-100 disabled:opacity-50"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>

                  <Select
                    value={`${itemsPerPage}`}
                    onValueChange={handleItemsPerPageChange}
                  >
                    <SelectTrigger className="w-32 bg-white border-gray-300 hidden md:flex">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 / page</SelectItem>
                      <SelectItem value="20">20 / page</SelectItem>
                      <SelectItem value="50">50 / page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Payout Accounts Tab remains unchanged */}
        {activeTab === "payout" && (
          <div className="space-y-8">
            <div className="space-y-6">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between bg-gray-50 rounded-lg p-6"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-orange-500 rounded-lg p-3">
                      <span className="text-white font-bold text-lg">
                        {account.bankName.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-lg text-gray-900">
                        {account.bankName}
                      </p>
                      <p className="text-gray-600">{account.accountNumber}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => handleDelete(account.id)}
                    className="border-red-600 text-red-600 hover:bg-red-50 flex justify-center"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="hidden md:inline">Delete</span>
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex justify-center">
              <Button
                onClick={openDialog}
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

      {/* Dialog remains unchanged */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-white text-gray-900 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Add Settlement Accounts
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2 py-4">
            <p className="text-gray-600">
              Provide the bank account MunchSpace will use to pay out your
              store's earnings.
            </p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Select Bank</Label>
              <Select
                value={formData.bankName}
                onValueChange={(value) =>
                  setFormData({ ...formData, bankName: value })
                }
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Choose your bank" />
                </SelectTrigger>
                <SelectContent>
                  {bankOptions.map((bank) => (
                    <SelectItem key={bank} value={bank}>
                      {bank}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Account Name <span className="text-red-600">*</span>
                </Label>
                <Input
                  placeholder="Account Name"
                  value={formData.accountName}
                  onChange={(e) =>
                    setFormData({ ...formData, accountName: e.target.value })
                  }
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Account Number <span className="text-red-600">*</span>
                </Label>
                <Input
                  placeholder="1234567890"
                  value={formData.accountNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, accountNumber: e.target.value })
                  }
                  className="h-12"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-3 mt-8">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="px-8"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 rounded-lg"
            >
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
