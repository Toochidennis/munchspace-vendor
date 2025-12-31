import { LoaderCircle, Pencil, Search, Trash2, X } from "lucide-react";
import React, { useState } from "react";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
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

interface Charge {
  id: number;
  name: string;
  type: "amount" | "percentage";
  value: string;
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

const chargesFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["amount", "percentage"], { message: "Type is required" }),
  amount: z.string().min(1, "Amount is required"),
});

type ChargesFormType = z.infer<typeof chargesFormSchema>;

const Charges = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingCharge, setEditingCharge] = useState<Charge | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [charges, setCharges] = useState<Charge[]>(initialCharges);
  const [isLoading, setIsLoading] = useState(false);

  const chargesForm = useForm<ChargesFormType>({
    resolver: zodResolver(chargesFormSchema),
    defaultValues: {
      name: "",
      type: "amount",
      amount: "",
    },
  });

  const filteredCharges = charges.filter((charge) =>
    charge.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    chargesForm.reset({
      name: "",
      type: "amount",
      amount: "",
    });
    setEditingCharge(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (charge: Charge) => {
    setEditingCharge(charge);
    chargesForm.reset({
      name: charge.name,
      type: charge.type,
      amount: charge.value.replace(/₦|%/g, "").trim(),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this charge?")) {
      setCharges(charges.filter((c) => c.id !== id));
    }
  };

  const onSubmit = (data: ChargesFormType) => {
    const formattedValue =
      data.type === "percentage" ? `${data.amount}%` : `₦${data.amount}`;

    const updatedCharge = {
      name: data.name,
      type: data.type,
      value: formattedValue,
      lastUpdated: new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    };

    if (editingCharge) {
      setCharges(
        charges.map((c) =>
          c.id === editingCharge.id ? { ...c, ...updatedCharge, id: c.id } : c
        )
      );
    } else {
      const newCharge: Charge = {
        id: Math.max(...charges.map((c) => c.id), 0) + 1,
        ...updatedCharge,
      };
      setCharges([...charges, newCharge]);
    }

    resetForm();
    setIsDialogOpen(false);
  };

  const watchedType = chargesForm.watch("type");

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    setIsDialogOpen(open);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="md:flex justify-between items-center">
          <h1 className="text-xl font-bold">Charges & Fees</h1>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mt-4 md:mt-0">
            <div className="relative w-full md:w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-gray-200 shadow-none text-gray-900 placeholder-gray-500 h-10"
              />
            </div>

            <Button
              onClick={openAddDialog}
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg w-full md:w-fit h-10 px-6 font-normal"
            >
              + Add New Charge
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-150 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-200 bg-gray-100">
                <TableHead
                  className="text-gray-700 font-medium ps-4"
                  style={{ paddingTop: "15px", paddingBottom: "15px" }}
                >
                  Name
                </TableHead>
                <TableHead className="text-gray-700 font-medium">
                  Percentage/Amount
                </TableHead>
                <TableHead className="text-gray-700 font-medium">
                  Last Updated
                </TableHead>
                <TableHead className="text-gray-700 font-medium text-right pe-4">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCharges.length > 0 ? (
                filteredCharges.map((charge) => (
                  <TableRow
                    key={charge.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <TableCell className="text-gray-900 font-medium ps-4">
                      {charge.name}
                    </TableCell>
                    <TableCell className="text-gray-900">
                      {charge.value}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {charge.lastUpdated}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(charge.id)}
                          className="hover:bg-red-100"
                        >
                          <Trash2
                            className="h-5 w-5 text-red-600"
                            strokeWidth={1.3}
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(charge)}
                          className="hover:bg-gray-200 bg-gray-100"
                        >
                          <Pencil className="h-5 w-5 text-gray-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-gray-500 py-12"
                  >
                    <div className="flex flex-col items-center">
                      <Image
                        src="/images/empty.png"
                        width={500}
                        height={500}
                        className="w-40 mb-5"
                        alt="empty"
                      />
                      <span>No charges found</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Dialog */}
      <div
        className={cn(
          "bg-black/50 z-50 w-full absolute right-0 top-0 h-screen overflow-hidden flex justify-center items-center",
          isDialogOpen ? "absolute" : "hidden"
        )}
      >
        <div className="w-85  md:w-lg bg-white font-rubik rounded-lg py-5 relative">
          <div className="flex justify-between px-3 md:px-6">
            <h1 className="text-xl font-semibold">
              {editingCharge ? "Edit Charge" : "Add New Charge"}
            </h1>
            <X
              className="text-gray-600"
              onClick={() => setIsDialogOpen(false)}
            />
          </div>
          <hr className="mt-3 mb-5" />

          <Form {...chargesForm}>
            <form
              onSubmit={chargesForm.handleSubmit(onSubmit)}
              className="space-y-6 px-3 md:px-6"
            >
              <div className="grid gap-4">
                <FormField
                  control={chargesForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-normal text-slate-500">
                        Name
                        <span className="-ms-1 pt-1 text-xl text-munchred">
                          *
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter charge/fee name"
                          className="h-12"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={chargesForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-normal text-slate-500">
                        Type
                        <span className="-ms-1 pt-1 text-xl text-munchred">
                          *
                        </span>
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex gap-8"
                        >
                          <div className="flex items-center gap-3">
                            <RadioGroupItem value="amount" id="amount" />
                            <Label
                              htmlFor="amount"
                              className="text-sm text-gray-600 font-normal cursor-pointer"
                            >
                              Amount
                            </Label>
                          </div>
                          <div className="flex items-center gap-3">
                            <RadioGroupItem
                              value="percentage"
                              id="percentage"
                            />
                            <Label
                              htmlFor="percentage"
                              className="text-sm text-gray-600 font-normal cursor-pointer"
                            >
                              Percentage
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={chargesForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-normal text-slate-500">
                        Amount
                        <span className="-ms-1 pt-1 text-xl text-munchred">
                          *
                        </span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                            {watchedType === "percentage" ? "%" : "₦"}
                          </span>
                          <Input
                            type="number"
                            placeholder="0.00"
                            className="pl-10 h-12"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end">
                <div className="flex gap-4 items-center">
                  <Button
                    onClick={() => setIsDialogOpen(false)}
                    className="px-6 bg-gray-100 h-10 text-black"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="bg-munchprimary hover:bg-munchprimaryDark h-10 rounded-lg"
                  >
                    {isLoading ? (
                      <LoaderCircle className="animate-spin" />
                    ) : (
                      <span>{editingCharge ? "Update" : "Add"}</span>
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
};

export default Charges;
