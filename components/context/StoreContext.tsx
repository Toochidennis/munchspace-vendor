"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { getAccessToken, getBusinessId } from "@/app/lib/auth";
import { refreshAccessToken } from "@/app/lib/api";

interface StoreContextType {
  storeImage: string;
  address: string;
  setStoreImage: (url: string) => void;
  setAddress: (addr: string) => void;
  refreshStoreData: () => Promise<void>;

  isPublished: boolean | null;
  isPublishLoading: boolean;
  refreshPublishStatus: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const API_BASE = process.env.NEXT_PUBLIC_MUNCHSPACE_API_BASE || "";
const API_KEY = process.env.NEXT_PUBLIC_MUNCHSPACE_API_KEY || "";

async function authenticatedFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
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

export const StoreProvider = ({ children }: { children: React.ReactNode }) => {
  const [storeImage, setStoreImage] = useState("/images/auth/store.svg");
  const [address, setAddress] = useState("Loading address...");
  const [isPublished, setIsPublished] = useState<boolean | null>(null);
  const [isPublishLoading, setIsPublishLoading] = useState(true);

  const refreshStoreData = async () => {
    try {
      const token = await getAccessToken();
      const businessId = await getBusinessId();
      if (!token || !businessId) return;

      const res = await fetch(
        `${API_BASE}/vendors/me/businesses/${businessId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-api-key": API_KEY,
          },
        },
      );
      const { data } = await res.json();
      if (data) {
        setStoreImage(data.logoUrl || "/images/auth/store.svg");
        const addr = data.address;
        setAddress(
          `${addr?.streetName || ""}, ${addr?.city || ""}, ${addr?.state.name || ""}`,
        );
      }
    } catch (err) {
      console.error("Failed to sync store data", err);
    }
  };

  useEffect(() => {
    refreshStoreData();
  }, []);

  const refreshPublishStatus = async () => {
    setIsPublishLoading(true);
    try {
      const businessId = await getBusinessId();
      if (!businessId) return;

      const res = await authenticatedFetch(
        `${API_BASE}/vendors/me/businesses/${businessId}/onboarding`,
      );

      if (!res.ok) throw new Error("Failed to fetch onboarding status");

      const json = await res.json();
      const data = json.data;

      setIsPublished(data.isPublished === true);
    } catch (err) {
      console.error("Failed to load publish status", err);
      setIsPublished(false); // fail-safe: show setup guide
    } finally {
      setIsPublishLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await Promise.all([refreshStoreData(), refreshPublishStatus()]);
    };
    init();
  }, []);

  return (
    <StoreContext.Provider
      value={{
        storeImage,
        address,
        setStoreImage,
        setAddress,
        refreshStoreData,

        isPublished,
        isPublishLoading,
        refreshPublishStatus,
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
