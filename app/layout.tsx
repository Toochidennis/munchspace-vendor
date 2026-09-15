import type { Metadata, Viewport } from "next";
import { Rubik, Inter } from "next/font/google";
import "./globals.css";
import ClientWrapper from "@/components/layout/ClientWrapper";
import { Toaster } from "sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://vendor.munchspace.io",
  ),
  title: {
    template: "%s | Munch Space",
    default: "Munchspace | Premium Restaurant Vendor Platform",
  },
  description:
    "Empowering restaurants with seamless vendor management, real-time logistics, and growth-driven digital solutions.",
  keywords: [
    "Restaurant Vendor",
    "Munchspace",
    "Food Logistics Nigeria",
    "Restaurant Management Software",
  ],
  authors: [{ name: "Munchspace" }],
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: "https://vendor.munchspace.io", // Replace with your actual domain
    siteName: "Munchspace",
    title: "Munchspace | The Modern Restaurant Vendor Ecosystem",
    description:
      "Streamline your restaurant operations with Munchspace's advanced vendor tools.",
    images: [
      {
        url: "/og-image.jpg", // Ensure you have a high-quality OG image in your public folder
        width: 1200,
        height: 630,
        alt: "Munchspace Vendor Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Munchspace | Premium Restaurant Vendor Platform",
    description: "The all-in-one platform for modern restaurant vendors.",
    images: ["/og-image.jpg"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  return (
    <html lang="en">
      <body
        className={`${rubik.variable} ${inter.variable} antialiased overflow-x-hidden max-w-500 mx-auto w-screen`}
      >
        <Toaster richColors position="top-right" />
        <ClientWrapper>{children}</ClientWrapper>
      </body>
    </html>
  );
}