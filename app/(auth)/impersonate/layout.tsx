import type { Metadata } from "next";

// The page itself is a client component and cannot declare this.
export const metadata: Metadata = {
  title: "Signing in",
  robots: { index: false, follow: false, nocache: true },
};

export default function ImpersonateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
