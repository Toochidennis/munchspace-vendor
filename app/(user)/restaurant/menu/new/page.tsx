import CreateMenuPage from '@/components/pages/menu/New'
import { Metadata } from 'next';
import React from 'react'

export const metadata: Metadata = {
  title: "Add New Menu Item",
  description: "Expand your digital storefront by adding new dishes. Configure pricing, descriptions, and dietary tags for your munchspace menu.",
  // Administrative pages should remain private
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Create Menu Item | munchspace",
    description: "Easily list new items and grow your restaurant's reach on munchspace.",
    url: "https://vendor.munchspace.io/vendor/dashboard/menu/new",
  },
};

const page = () => {
  return (
    <CreateMenuPage />
  )
}

export default page