import SetupStorePage from '@/components/pages/auth/SetupYourStore'
import { Metadata } from 'next';
import React from 'react'

export const metadata: Metadata = {
  title: "Setup Your Store",
  description:
    "Configure your restaurant's digital identity. Upload your logo, set your business hours, and define your location to start selling on munchspace.",
  // Keep the configuration process private
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Store Configuration | munchspace",
    description:
      "Launch your restaurant on the munchspace platform by completing your store setup.",
    url: "https://vendor.munchspace.io/dashboard/setup-your-store",
  },
};

const page = () => {
  return (
    <SetupStorePage />
  )
}

export default page