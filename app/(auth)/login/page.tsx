import LoginPage from '@/components/pages/auth/Login'
import { Metadata } from 'next';
import React from 'react'

export const metadata: Metadata = {
  title: "Vendor Login",
  description:
    "Sign in to your munchspace vendor dashboard to manage your restaurant, track orders, and view your settlements.",
  keywords: [
    "munchspace login",
    "restaurant vendor sign in",
    "munchspace dashboard access",
  ],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Login to munchspace",
    description:
      "Access your restaurant's digital command center on munchspace.",
    url: "https://vendor.munchspace.io/login",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "munchspace Vendor Login",
    description: "Manage your restaurant operations with ease.",
  },
};

const page = () => {
  return (
    <LoginPage />
  )
}

export default page