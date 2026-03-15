import ForgotPasswordPage from '@/components/pages/auth/ForgotPassword'
import { Metadata } from 'next';
import React from 'react'

export const metadata: Metadata = {
  title: "Reset Your Password",
  description: "Securely reset your munchspace vendor account password to regain access to your dashboard.",
  // We allow indexing so vendors can find this via search if they are locked out, 
  // but we prevent it from being a "follow" priority.
  robots: {
    index: true,
    follow: false,
  },
  openGraph: {
    title: "Reset Password | munchspace",
    description: "Account recovery for munchspace restaurant partners.",
    url: "https://vendor.munchspace.io/forgot-password",
  },
};

const page = () => {
  return (
    <ForgotPasswordPage />
  )
}

export default page