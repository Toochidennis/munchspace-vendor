import DashboardPage from '@/components/pages/Dashboard'
import { Metadata } from 'next';
import React from 'react'

export const metadata: Metadata = {
  title: "Vendor Dashboard",
  description:
    "Monitor your restaurant's performance, manage active orders, and track your logistics in real-time on the munchspace dashboard.",
  // Since the dashboard contains private vendor data, we prevent search engines from indexing it
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  openGraph: {
    title: "Dashboard | munchspace",
    description: "Access your munchspace vendor tools and real-time analytics.",
    url: "https://vendor.munchspace.io/restaurant/dashboard",
  },
};

const page = () => {
  return (
    <DashboardPage />
  )
}

export default page