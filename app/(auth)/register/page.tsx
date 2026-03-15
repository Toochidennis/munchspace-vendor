import RegisterPage from '@/components/pages/auth/Register'
import { Metadata } from 'next';
import React from 'react'

export const metadata: Metadata = {
  title: "Join as a Partner",
  description:
    "Register your restaurant on munchspace today. Scale your business with our premium vendor tools, seamless logistics, and real-time order management.",
  keywords: [
    "munchspace registration",
    "become a restaurant partner",
    "sell on munchspace",
    "restaurant vendor signup nigeria",
  ],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Start Selling on munchspace | Vendor Registration",
    description:
      "Join the munchspace ecosystem and take your restaurant's digital presence to the next level.",
    url: "https://vendor.munchspace.io/register",
    type: "website",
    images: [
      {
        url: "/og-register.jpg",
        width: 1200,
        height: 630,
        alt: "Join the munchspace vendor community",
      },
    ],
  },
};

const page = () => {
  return (
    <RegisterPage />
  )
}

export default page