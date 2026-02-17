"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { getAccessToken, getBusinessId } from "@/app/lib/auth";

interface StoreContextType {
  storeImage: string;
  address: string;
  setStoreImage: (url: string) => void;
  setAddress: (addr: string) => void;
  refreshStoreData: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider = ({ children }: { children: React.ReactNode }) => {
  const [storeImage, setStoreImage] = useState("/images/auth/store.svg");
  const [address, setAddress] = useState("Loading address...");

  const refreshStoreData = async () => {
    try {
      const token = await getAccessToken();
      const businessId = await getBusinessId();
      if (!token || !businessId) return;

      const res = await fetch(
        `https://dev.api.munchspace.io/api/v1/vendors/me/businesses/${businessId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-api-key": process.env.NEXT_PUBLIC_MUNCHSPACE_API_KEY || "",
          },
        },
      );
      const { data } = await res.json();
      if (data) {
        setStoreImage(data.logoUrl || "/images/auth/store.svg");
        const addr = data.address;
        setAddress(
          `${addr?.streetName || ""}, ${addr?.city || ""}, ${addr?.state || ""}`,
        );
      }
    } catch (err) {
      console.error("Failed to sync store data", err);
    }
  };

  useEffect(() => {
    refreshStoreData();
  }, []);

  return (
    <StoreContext.Provider
      value={{
        storeImage,
        address,
        setStoreImage,
        setAddress,
        refreshStoreData,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
};
