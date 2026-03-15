import MenuPage from '@/components/pages/menu/Menu'
import { Metadata } from 'next';
import React from 'react'

export const metadata: Metadata = {
  title: "Menu Management",
  description:
    "Organize your dishes, update pricing, and manage item availability. Keep your munchspace digital storefront up to date for your customers.",
  // Protects your internal pricing and menu structure from public search
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Menu Management | munchspace",
    description:
      "Full control over your restaurant's digital menu and pricing.",
    url: "https://vendor.munchspace.io/restaurant/dashboard/menu",
  },
};

const page = () => {
  return (
    <MenuPage />
  )
}

export default page