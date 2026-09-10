import OrdersPage from '@/components/pages/orders/Orders'
import { Metadata } from 'next';
import React, { Suspense } from 'react'

export const metadata: Metadata = {
  title: "Order Management",
  description:
    "Track, manage, and process all incoming restaurant orders. View live status updates and historical order data on the munchspace vendor portal.",
  // Strict privacy for sensitive transaction and customer data
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
  openGraph: {
    title: "Orders | munchspace",
    description:
      "Real-time order tracking and management for munchspace vendors.",
    url: "https://vendor.munchspace.io/restaurant/dashboard/orders",
  },
};

// The list keeps its filters in the query string, and useSearchParams cannot
// be prerendered — without a boundary the whole route opts out of static
// rendering and the build fails on it.
const page = () => {
  return (
    <Suspense>
      <OrdersPage />
    </Suspense>
  )
}

export default page