import BestSellingItemsPage from '@/components/pages/BestSellingItems'
import { Metadata } from 'next';
import React, { Suspense } from 'react'

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

// The screen keeps its filters in the query string, and useSearchParams
// cannot be prerendered — without a boundary the build fails on this route.
const page = () => {
  return (
    <Suspense>
      <BestSellingItemsPage />
    </Suspense>
  )
}

export default page