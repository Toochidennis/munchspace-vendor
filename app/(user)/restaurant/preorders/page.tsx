import Preorders from "@/components/pages/preorders/Preorders";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Preorders",
  description:
    "Orders booked ahead of time by your customers, waiting for their slot.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

const page = () => {
  return <Preorders />;
};

export default page;
