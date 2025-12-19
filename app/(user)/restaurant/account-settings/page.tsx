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
import { Badge, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function AccountSettingsPage() {
    const [storeImage, setStoreImage] = useState("/images/store-placeholder.png");
    const [cacFile, setCacFile] = useState<File | null>(null);
    const [idFile, setIdFile] = useState<File | null>(null);
    const [safetyFile, setSafetyFile] = useState<File | null>(null);
    const [tin, setTin] = useState("");

    const handleFileUpload =
      (setter: (file: File | null) => void) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.size <= 7 * 1024 * 1024) {
          setter(file);
        }
      };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.size <= 2 * 1024 * 1024) {
      // 2MB limit
      const reader = new FileReader();
      reader.onloadend = () => {
        setStoreImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-white mt-5">
      <div className="max-w-7xl mx-auto p-8 space-y-12">
        {/* Page Title */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-gray-600 text-sm mt-2">
            View and manage your account settings related to your store.
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="store-details" className="w-full">
          <TabsList className="inline-flex h-auto bg-transparent border-gray-200 p-0 gap-8">
            <TabsTrigger
              value="store-details"
              className="data-[state=active]:text-orange-600 data-[state=active]:border-b-2  data-[state=active]:border-orange-600 pb-2 rounded-none text-base font-medium"
            >
              Store Details
            </TabsTrigger>
            <TabsTrigger
              value="kyc"
              className="data-[state=active]:text-orange-600 data-[state=active]:border-b-2 data-[state=active]:border-orange-600 pb-2 rounded-none text-base font-medium"
            >
              KYC Verification
            </TabsTrigger>
            <TabsTrigger
              value="team"
              className="data-[state=active]:text-orange-600 data-[state=active]:border-b-2 data-[state=active]:border-orange-600 pb-2 rounded-none text-base font-medium"
            >
              Team Properties
            </TabsTrigger>
            <TabsTrigger
              value="charges"
              className="data-[state=active]:text-orange-600 data-[state=active]:border-b-2 data-[state=active]:border-orange-600 pb-2 rounded-none text-base font-medium"
            >
              Charges & Fees
            </TabsTrigger>
            <TabsTrigger
              value="personalization"
              className="data-[state=active]:text-orange-600 data-[state=active]:border-b-2 data-[state=active]:border-orange-600 pb-2 rounded-none text-base font-medium"
            >
              Store Personalization
            </TabsTrigger>
          </TabsList>

          <TabsContent value="store-details" className="mt-12 space-y-12">
            {/* Store Image Upload */}
            <Card className="p-8 bg-gray-50 shadow-none">
              <div className="flex items-center gap-4">
                <div className="flex gap-8">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-200">
                      <Image
                        src={storeImage}
                        alt="Store"
                        width={100}
                        height={100}
                        className="object-cover w-full h-full"
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

            {/* Store Information */}
            <div className="space-y-6">
              <Card className="p-8 bg-gray-50">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-medium text-gray-900">
                    Store Information
                  </h2>
                  <Button
                    variant="outline"
                    className="border-gray-400 rounded-full text-gray-700"
                  >
                    Update
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-base">
                  <div>
                    <p className="text-gray-500 mb-1">Store Name</p>
                    <p className="font-medium text-gray-900">Bo Cafe</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Email</p>
                    <p className="font-medium text-gray-900">
                      bocafe1600@gmail.com
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Phone</p>
                    <p className="font-medium text-gray-900">+123 456 7898</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Established Date</p>
                    <p className="font-medium text-gray-900">04 Aug, 2009</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Store Address</p>
                    <p className="font-medium text-gray-900">
                      BLK 15 26 Ayoade Olubowale Cres. Lagos State
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Business Status</p>
                    <p className="font-medium text-gray-900">Operational</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Restaurant Type</p>
                    <p className="font-medium text-gray-900">
                      Casual Dining, Fast-Casual
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Service Options</p>
                    <p className="font-medium text-gray-900">
                      Take-Out, Take-In, Delivery
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Website</p>
                    <p className="font-medium text-gray-900">N/A</p>
                  </div>
                  <div className="md:col-span-3">
                    <p className="text-gray-500 mb-1">Store Activation Code</p>
                    <p className="font-medium text-gray-900">GH65TY</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Working Hours */}
            <Accordion type="single" collapsible>
              <AccordionItem value="working-hours">
                <AccordionTrigger className="text-2xl font-bold text-gray-900 py-6">
                  Working Hours
                </AccordionTrigger>
                <AccordionContent className="pb-6">
                  <p className="text-gray-600">
                    Working hours configuration goes here...
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Change Passwords */}
            <div className="flex items-center justify-between py-6 border-t border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Change Passwords
                </h2>
                <p className="text-gray-600">
                  Update your password from your old one
                </p>
              </div>
              <Button
                variant="outline"
                className="border-gray-400 text-gray-700"
              >
                Change
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="kyc" className="mt-12 space-y-12">
            <div className="min-h-screen bg-white text-gray-900">
              <div className="max-w-4xl mx-auto p-8 space-y-12">
                {/* CAC Documents */}
                <Card className="border border-gray-200">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-xl text-gray-900">
                        CAC Documents
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-2">
                        Upload your CAC registration papers so we can confirm
                        your business is officially registered.
                        <br />
                        This helps unlock payouts and keeps the platform
                        compliant.
                      </p>
                    </div>
                    <Badge className="bg-pink-100 text-pink-800">
                      Required
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <label className="block">
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                        onChange={handleFileUpload(setCacFile)}
                        className="hidden"
                      />
                      <Button className="bg-orange-500 hover:bg-orange-600 text-white rounded-full">
                        <Upload className="mr-2 h-5 w-5" />
                        Upload file
                      </Button>
                    </label>
                    <p className="text-xs text-gray-500 mt-3">
                      Max file size: 7MB
                      <br />
                      Accepted formats: pdf, png, jpg, jpeg, doc, docx.
                    </p>
                    {cacFile && (
                      <p className="text-sm text-green-600 mt-4">
                        {cacFile.name} uploaded
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Owner/Signatory ID */}
                <Card className="border border-gray-200">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-xl text-gray-900">
                        Owner/Signatory ID
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-2">
                        Provide a valid government-issued ID (NIN, Voter's Card,
                        Passport, Driver's License).
                        <br />
                        This verifies the real person behind the business.
                      </p>
                    </div>
                    <Badge className="bg-pink-100 text-pink-800">
                      Required
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <label className="block">
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                        onChange={handleFileUpload(setIdFile)}
                        className="hidden"
                      />
                      <Button className="bg-orange-500 hover:bg-orange-600 text-white rounded-full">
                        <Upload className="mr-2 h-5 w-5" />
                        Upload file
                      </Button>
                    </label>
                    <p className="text-xs text-gray-500 mt-3">
                      Max file size: 7MB
                      <br />
                      Accepted formats: pdf, png, jpg, jpeg, doc, docx.
                    </p>
                    {idFile && (
                      <p className="text-sm text-green-600 mt-4">
                        {idFile.name} uploaded
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Food/Health Safety Certificate */}
                <Card className="border border-gray-200">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-xl text-gray-900">
                        Food/Health Safety Certificate
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-2">
                        Upload your food handling or health certification.
                        <br />
                        This assures customers that your meals meet safety
                        standards.
                      </p>
                    </div>
                    <Badge className="bg-pink-100 text-pink-800">
                      Required
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <label className="block">
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                        onChange={handleFileUpload(setSafetyFile)}
                        className="hidden"
                      />
                      <Button className="bg-orange-500 hover:bg-orange-600 text-white rounded-full">
                        <Upload className="mr-2 h-5 w-5" />
                        Upload file
                      </Button>
                    </label>
                    <p className="text-xs text-gray-500 mt-3">
                      Max file size: 7MB
                      <br />
                      Accepted formats: pdf, png, jpg, jpeg, doc, docx.
                    </p>
                    {safetyFile && (
                      <p className="text-sm text-green-600 mt-4">
                        {safetyFile.name} uploaded
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Tax Identification Number (TIN) */}
                <Card className="border border-gray-200">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-xl text-gray-900">
                        Tax Identification Number (TIN)
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-2">
                        Submit your TIN so we can complete basic business
                        verification requirements.
                      </p>
                    </div>
                    <Badge className="bg-pink-100 text-pink-800">
                      Required
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <Input
                      placeholder="Enter your TIN here..."
                      value={tin}
                      onChange={(e) => setTin(e.target.value)}
                      className="border-gray-300"
                    />
                  </CardContent>
                </Card>

                {/* Submit Button */}
                <div className="flex justify-end">
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-12 py-6 text-lg">
                    Submit
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
