import AccountSettingsPage from '@/components/pages/AccountSettings'
import { Metadata } from 'next';
import React from 'react'

export const metadata: Metadata = {
  title: "Account Settings",
  description:
    "Manage your munchspace profile, update security preferences, and configure your restaurant's administrative details.",
  // Administrative and personal data must be hidden from search engines
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
  openGraph: {
    title: "Account Settings | munchspace",
    description:
      "Update your profile and security settings on the munchspace vendor portal.",
    url: "https://vendor.munchspace.io/restaurant/dashboard/settings",
  },
};

const page = () => {
  return (
    <AccountSettingsPage />
  )
}

export default page