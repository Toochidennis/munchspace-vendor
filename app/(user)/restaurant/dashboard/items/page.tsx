import BestSellingItemsPage from '@/components/pages/BestSellingItems'
import { Metadata } from 'next';
import React from 'react'

export const metadata: Metadata = {
  title: "Best Selling Items",
  description:
    "Analyze your top-performing dishes. View sales distribution, trending items, and item-specific performance metrics for your restaurant.",
  // Privacy is key for internal analytics
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Best Selling Items | munchspace",
    description:
      "Deep dive into your restaurant's most popular items and sales trends.",
    url: "https://vendor.munchspace.io/restaurant/dashboard/best-sellers",
  },
};

const page = () => {
  return (
    <BestSellingItemsPage />
  )
}

export default page