import ReviewsPage from "@/components/pages/reviews/Reviews";
import { Metadata } from "next";
import React, { Suspense } from "react";

export const metadata: Metadata = {
  title: "Reviews",
  description: "See what customers said about your store on munchspace.",
  robots: { index: false, follow: false, nocache: true },
};

const page = () => (
  <Suspense>
    <ReviewsPage />
  </Suspense>
);

export default page;
