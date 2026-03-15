import ResetPasswordPage from '@/components/pages/auth/ResetPassword'
import { Metadata } from 'next';
import React from 'react'

export const metadata: Metadata = {
  title: "Create New Password",
  description:
    "Securely update your munchspace vendor account credentials. Choose a strong password to protect your restaurant's data.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
  openGraph: {
    title: "Secure Password Reset | munchspace",
    description: "Update your account security on the munchspace platform.",
    url: "https://vendor.munchspace.io/reset-password",
  },
};

const page = () => {
  return (
    <ResetPasswordPage />
  )
}

export default page