import Promotions from "@/components/pages/promotions/Promotions";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Promotions",
  description:
    "Create and manage discount codes and automatic offers for your restaurant.",
  robots: { index: false, follow: false, nocache: true },
};

const page = () => {
  return <Promotions />;
};

export default page;
