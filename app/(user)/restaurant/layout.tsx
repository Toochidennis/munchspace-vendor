import RestaurantSidebar from "@/components/layout/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
      <div className="flex h-screen w-screen">
        <RestaurantSidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
  );
}
