"use client";

import { useState } from "react";
import Image from "next/image";
import {
  BatteryLow,
  Camera,
  MoveLeft,
  Search,
  Wifi,
  Workflow,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

// List of existing store names (simulating taken names)
const takenStoreNames = [
  "Munchies Hub",
  "Tasty Corner",
  "Food Palace",
  "Sebotimo Food Canteen",
  "Quick Bites",
];

// iPhone frame image (updated with your provided black iPhone image)
const iPhoneFrame = "/images/iphone-frame-black.png"; // Replace with your actual path if needed

export default function StorePersonalizationPage() {
  const [storeName, setStoreName] = useState("");
  const [storeImage, setStoreImage] = useState<string | null>(null);
  const [nameError, setNameError] = useState("");
  const [imageError, setImageError] = useState("");

  const validateAndSave = () => {
    let valid = true;

    // Name validation
    if (storeName.trim().length < 3) {
      setNameError("Store name must be at least 3 characters long.");
      valid = false;
    } else if (
      takenStoreNames
        .map((n) => n.toLowerCase())
        .includes(storeName.trim().toLowerCase())
    ) {
      setNameError("This store name is already taken. Please choose another.");
      valid = false;
    } else {
      setNameError("");
    }

    // Image validation
    if (!storeImage) {
      setImageError("Please select a store image.");
      valid = false;
    } else {
      setImageError("");
    }

    if (valid) {
      alert("Store details saved successfully!");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setStoreImage(reader.result as string);
        setImageError("");
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Side - Form */}
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Store Personalization
              </h1>
              <p className="text-gray-600">
                Customize how your store appears to customers.
              </p>
            </div>

            {/* Store Name */}
            <div className="space-y-2">
              <Label className="text-lg">
                Store Name <span className="text-red-600">*</span>
              </Label>
              <div className="flex gap-4">
                <Input
                  placeholder="Enter your store name"
                  value={storeName}
                  onChange={(e) => {
                    setStoreName(e.target.value);
                    setNameError("");
                  }}
                  className="h-12 text-lg"
                />
                <Button
                  onClick={validateAndSave}
                  className="bg-orange-100 text-orange-600 hover:bg-orange-200 px-8"
                >
                  Save
                </Button>
              </div>
              {nameError && (
                <p className="text-red-600 text-sm mt-2">{nameError}</p>
              )}
            </div>

            {/* Store Image */}
            <div className="space-y-2">
              <Label className="text-lg">
                Store Image <span className="text-red-600">*</span>
              </Label>
              <label className="block cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <div className="relative rounded-lg overflow-hidden bg-gray-900 h-64 flex items-center justify-center hover:opacity-90 transition">
                  {storeImage ? (
                    <Image
                      src={storeImage}
                      alt="Store preview"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="text-center text-white">
                      <Camera className="h-12 w-12 mx-auto mb-4" />
                      <p className="text-lg">
                        Select an image from your media gallery
                      </p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                    <Camera className="h-16 w-16 text-white" />
                  </div>
                </div>
              </label>
              {imageError && (
                <p className="text-red-600 text-sm mt-2">{imageError}</p>
              )}
              <div className="flex justify-end mt-4">
                <Button
                  onClick={validateAndSave}
                  className="bg-orange-100 text-orange-600 hover:bg-orange-200 px-8"
                >
                  Save
                </Button>
              </div>
            </div>
          </div>

          {/* Right Side - Mobile Preview with Updated iPhone Frame */}
          <div className="flex items-center justify-center">
            <div className="relative">
              {/* iPhone Frame (updated with your black iPhone image) */}
              <Image
                src={"/images/iPhone16.png"}
                alt="iPhone frame"
                width={400}
                height={800}
                className="relative z-20"
              />

              {/* Screen Content Inside Frame */}
              <div className="absolute inset-0 top-12 bottom-12 left-6 right-6 rounded-3xl overflow-hidden bg-white">
                {/* Status Bar */}
                <div className="bg-white px-2 py-3 flex justify-between items-center">
                  <span className="text-sm font-medium">9:41</span>
                  <div className="flex gap-2">
                    <Workflow className="w-4 h-4" strokeWidth={3} />
                    <Wifi className="w-4 h-4" strokeWidth={3} />
                    <BatteryLow className="w-4 h-4" strokeWidth={3} />
                  </div>
                </div>
                <div className="flex justify-between items-center mb-3 my-1 px-3">
                  <div className="bg-orange-100 rounded-full p-2">
                    <MoveLeft className="w-4 h-4" />
                  </div>
                  <h1 className="font-bold">
                    {storeName || "Your Store Name"}
                  </h1>
                  <div className="bg-orange-100 rounded-full p-2">
                    <Search className="w-4 h-4" />
                  </div>
                </div>
                {/* Store Header */}
                <div className="relative h-48">
                  {storeImage ? (
                    <Image
                      src={storeImage}
                      alt="Store banner"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="bg-gray-200 h-full flex items-center justify-center">
                      <p className="text-gray-500">Store Banner</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
                <div className="px-4 text-xs">
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-yellow-400">★ 4.7 (4500 orders)</span>
                    <span>Opens until 09:00 PM</span>
                  </div>
                  <p className="text-xs mt-3">
                    17-25 min prep time • ₦800 delivery fee
                  </p>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 px-4 py-3 border-b border-gray-200">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="rounded-full bg-orange-100 text-orange-600"
                  >
                    All
                  </Button>
                  <Button variant="ghost" size="sm" className="rounded-full">
                    Meal
                  </Button>
                  <Button variant="ghost" size="sm" className="rounded-full">
                    Drinks
                  </Button>
                </div>

                {/* Menu Items Preview */}
                <div className="p-4 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex gap-4 pb-4 border-b border-gray-100 last:border-0"
                    >
                      <div className="bg-gray-200 border-2 border-dashed rounded-xl w-24 h-24 flex-shrink-0" />
                      <div className="flex-1">
                        <h3 className="font-semibold">
                          Jollof Rice and Chicken
                        </h3>
                        <p className="text-sm text-gray-600">
                          Roundabout, Liver, Floater, etc.
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="font-bold text-lg">₦4,000</span>
                          <div className="flex items-center gap-2">
                            <span className="text-yellow-500 text-sm">
                              ★ 4.7
                            </span>
                            <Button
                              size="sm"
                              className="rounded-full bg-orange-500 hover:bg-orange-600 text-white w-8 h-8"
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
