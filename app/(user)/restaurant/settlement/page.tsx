import EarningsPage from '@/components/pages/Settlement'
import { Metadata } from 'next';
import React from 'react'

export const metadata: Metadata = {
  title: "Settlements & Payouts",
  description:
    "Track your earnings, view transaction history, and manage your bank settlements. Stay on top of your restaurant's financial growth with munchspace.",
  // Financial data must be kept entirely out of search engines
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
  openGraph: {
    title: "Financial Settlements | munchspace",
    description:
      "Manage your restaurant payouts and view detailed financial statements.",
    url: "https://vendor.munchspace.io/restaurant/dashboard/settlement",
  },
};

const page = () => {
  return (
    <EarningsPage />
  )
}

export default page