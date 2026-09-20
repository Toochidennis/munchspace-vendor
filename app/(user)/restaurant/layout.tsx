import type { Metadata } from "next";
import { StoreProvider } from "@/components/context/StoreContext";
import RestaurantSidebar from "@/components/layout/Sidebar";

// The root layout invites indexing so the sign-in and sign-up are findable.
// Everything past them is a vendor's own books and belongs to nobody else.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StoreProvider>
      <div className="flex h-screen w-screen">
        <RestaurantSidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </StoreProvider>
  );
}
