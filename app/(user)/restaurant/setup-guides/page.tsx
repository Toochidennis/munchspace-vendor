import SetupGuidePage from '@/components/pages/SetupGuides'
import { Metadata } from 'next';
import React from 'react'

export const metadata: Metadata = {
  title: "Setup Guides",
  description:
    "Step-by-step instructions to get your restaurant live on munchspace. Learn how to manage menus, set up logistics, and optimize your vendor profile.",
  keywords: [
    "munchspace setup",
    "restaurant onboarding guide",
    "vendor training",
    "munchspace tutorial",
    "how to sell on munchspace",
  ],
  alternates: {
    canonical: "https://vendor.munchspace.io/restaurant/setup-guides",
  },
  openGraph: {
    title: "Master Your Restaurant Setup | munchspace",
    description:
      "Everything you need to know to start growing your restaurant business with munchspace.",
    url: "https://vendor.munchspace.io/restaurant/setup-guides",
    type: "article", // Changed to article as this is educational content
    images: [
      {
        url: "/images/setup-guide-banner.jpg", // A specific helpful thumbnail
        width: 1200,
        height: 630,
        alt: "munchspace Step-by-Step Setup Guide",
      },
    ],
  },
};

const page = () => {
  return (
    <SetupGuidePage />
  )
}

export default page