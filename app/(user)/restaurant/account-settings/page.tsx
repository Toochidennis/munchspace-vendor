"use client";

import { useState } from "react";
import Image from "next/image";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge, BrushCleaning, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

// Charges imports
import { Search, Pencil, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import StorePreview from "@/components/layout/StorePreview";
import KycVerification from "@/components/layout/KycVerification";
import Charges from "@/components/layout/Charges";
import StoreDetails from "@/components/layout/StoreDetails";




// Charges tab section
interface Charge {
  id: number;
  name: string;
  type: "amount" | "percentage";
  value: string; // e.g., "₦200.00" or "5%"
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

export default function AccountSettingsPage() {
  

  return (
    <div className="min-h-screen p-6 md:p-8 mt-10 md:mt-0">
      <div className="max-w-7xl mx-auto">
        {/* Page Title */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-gray-600 text-sm mt-2">
            View and manage your account settings related to your store.
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="store-details" className="mt-10">
          <div className=" max-w-svw overflow-x-auto">
            <TabsList className="bg-transparent rounded-none md:w-fit shadow-none p-0 md:gap-4 border-b-2 border-gray-200">
              <TabsTrigger
                value="store-details"
                className="px-2 md:px-4 data-[state=active]:text-munchprimary data-[state=active]:font-medium data-[state=active]:border-b-2  data-[state=active]:border-munchprimary pb-1 md:pb-2 rounded-none text-base font-normal"
              >
                Store Details
              </TabsTrigger>
              <TabsTrigger
                value="kyc"
                className="px-2 md:px-4 data-[state=active]:text-munchprimary data-[state=active]:font-medium data-[state=active]:border-b-2 data-[state=active]:border-munchprimary pb-1 md:pb-2 rounded-none text-base font-normal"
              >
                KYC Verification
              </TabsTrigger>
              <TabsTrigger
                value="charges"
                className="px-2 md:px-4 data-[state=active]:text-munchprimary data-[state=active]:font-medium data-[state=active]:border-b-2 data-[state=active]:border-munchprimary pb-1 md:pb-2 rounded-none text-base font-normal"
              >
                Charges & Fees
              </TabsTrigger>
              <TabsTrigger
                value="preview"
                className="px-2 md:px-4 data-[state=active]:text-munchprimary data-[state=active]:font-medium data-[state=active]:border-b-2 data-[state=active]:border-munchprimary pb-1 md:pb-2 rounded-none text-base font-normal"
              >
                Store Preview
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="store-details" className="mt-5 space-y-12">
            <StoreDetails />
          </TabsContent>
          <TabsContent value="kyc" className="mt-5 space-y-12">
            <KycVerification />
          </TabsContent>
          <TabsContent value="charges" className="mt-5 space-y-12">
            <Charges />
          </TabsContent>
          <TabsContent value="preview" className="mt-5 space-y-12">
            <StorePreview />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
