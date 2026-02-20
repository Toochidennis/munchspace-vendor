"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

import {
  LayoutDashboard,
  ShoppingBag,
  Menu as MenuIcon,
  DollarSign,
  Settings,
  Globe,
  BellRing,
  Ellipsis,
  X,
  Loader2,
} from "lucide-react";
import Image from "next/image";
import { Card } from "../ui/card";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { getAccessToken, logout } from "@/app/lib/auth";
import { useStore } from "../context/StoreContext";
import { Button } from "../ui/button";

type VendorProfile = {
  name: string;
  displayName: string;
  email: string;
  phone: string;
  createdAt: string;
};

const API_BASE = "https://dev.api.munchspace.io/api/v1";
const API_KEY =
  "eH4u8eujRzIrLWE+xkqyUWg33ggZ1Ts5bAKi/Ze5l23dyc7aLZSVMEssML0vUvDHrhchMtyskMxzGW3c4jhQCA==";

export default function RestaurantSidebar() {
  const { storeImage, address } = useStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileCollapsed, setMobileCollapsed] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [shortName, setShortName] = useState<string>("");
  const [loadingProfile, setLoadingProfile] = useState(false);

  const [showMore, setShowMore] = useState(false);

  const pathname = usePathname();

  const managementItems = [
    {
      icon: BellRing,
      label: "Setup Guides",
      href: "/restaurant/setup-guides",
      active: pathname.startsWith("/restaurant/setup-guides"),
    },
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      href: "/restaurant/dashboard",
      active: pathname.startsWith("/restaurant/dashboard"),
    },
    {
      icon: ShoppingBag,
      label: "Orders",
      href: "/restaurant/orders",
      active: pathname.startsWith("/restaurant/orders"),
    },
    {
      icon: MenuIcon,
      label: "Menu",
      href: "/restaurant/menu",
      active: pathname.startsWith("/restaurant/menu"),
    },
  ];

  const accountItems = [
    {
      icon: DollarSign,
      label: "Settlement",
      href: "/restaurant/settlement",
      active: pathname.startsWith("/restaurant/settlement"),
    },
    {
      icon: Settings,
      label: "Account Settings",
      href: "/restaurant/account-settings",
      active: pathname.startsWith("/restaurant/account-settings"),
    },
  ];

  // Fetch vendor profile
  useEffect(() => {
    const fetchProfile = async () => {
      const token = getAccessToken();
      if (!token) return;

      setLoadingProfile(true);
      try {
        const res = await fetch(`${API_BASE}/vendors/me`, {
          method: "GET",
          headers: {
            "x-api-key": API_KEY,
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error("Failed to fetch profile");
        }

        const json = await res.json();
        if (json.success && json.data) {
          setProfile(json.data);
          const words = json.data.name.split(" ");
          const firstTwoInitials = words
            .slice(0, 2)
            .map((w: string) => w.charAt(0).toUpperCase())
            .join("");
          setShortName(firstTwoInitials);
        }
      } catch (err) {
        console.error("Profile fetch error:", err);
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfile();
  }, []);

  return (
    <div>
      <div
        className={cn(
          "relative md:flex flex-col h-screen hidden bg-munchprimary p-4 transition-all duration-300",
          collapsed ? "w-fit" : "w-70",
        )}
      >
        {/* Collapse Toggle Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn("w-fit mb-7 p-1.5", collapsed && "mx-auto")}
        >
          <Image
            src={"/images/MenuFold.svg"}
            width={18}
            height={18}
            alt="menu trigger"
          />
        </button>
        {/* Header */}
        <div className="flex items-center gap-3 bg-white shrink-0 rounded-xl px-2 py-2">
          <img
            src={storeImage || "/images/auth/store.svg"}
            width={50}
            height={50}
            alt="restaurant"
            className="h-10 w-10"
            crossOrigin="anonymous"
          />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-900">{address}</p>
            </div>
          )}
        </div>

        {/* Navigation - Scrollable if needed, but content fits in most cases */}
        <nav className="flex-1 overflow-y-auto py-6 [scrollbar-width:none] text-white [&::-webkit-scrollbar]:hidden">
          {!collapsed && (
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider mx-3">
              Management
            </p>
          )}
          <ul className="space-y-1">
            {managementItems.map((item) => (
              <Link href={item.href} className="block" key={item.label}>
                <button
                  className={cn(
                    "flex items-center gap-4 w-full py-3 text-left transition-colors rounded-lg px-3 cursor-pointer",
                    collapsed && "justify-center px-0",
                    item.active ? "bg-black/13" : "hover:bg-black/10",
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span className="text-sm">{item.label}</span>}
                </button>
              </Link>
            ))}
          </ul>

          {!collapsed && (
            <p className="mt-8 mb-3 text-xs font-semibold uppercase tracking-wider mx-3">
              Account
            </p>
          )}
          <ul className="space-y-1">
            {accountItems.map((item) => (
              <Link href={item.href} key={item.label}>
                <button
                  className={cn(
                    "flex items-center gap-4 py-3 text-left transition-colors rounded-lg px-3 w-full mt-2 cursor-pointer",
                    collapsed && "justify-center px-0",
                    item.active ? "bg-black/13" : "hover:bg-black/10",
                    "hover:bg-black/10",
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span className="text-sm">{item.label}</span>}
                </button>
              </Link>
            ))}
          </ul>
        </nav>

        {/* Footer - Fixed at bottom */}
        <div className="shrink-0 text-white relative">
          <a
            href={"/restaurant/preview-store"}
            className={cn(
              "flex items-center gap-4 px-4 py-3 rounded-lg transition-colors justify-center bg-white w-full text-munchprimary",
              collapsed && "justify-center px-0",
              " hover:bg-gray-100",
            )}
          >
            <Globe className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="text-sm">Preview Store</span>}
          </a>

          <div
            onMouseEnter={() => setShowMore(true)}
            onMouseLeave={() => setShowMore(false)}
            className={cn(
              "flex items-center gap-3 pt-4",
              collapsed && "flex-col gap-2",
            )}
          >
            <Card
              className={cn(
                "absolute -top-29 w-full p-3 py-3 text-slate-500 hidden",
                collapsed && "p-1.5 -top-26",
                showMore && "block",
              )}
            >
              <ul className="space-y-1">
                <li
                  onClick={() => {
                    setIsProfileDialogOpen(true);
                  }}
                >
                  <button
                    className={cn(
                      "flex items-center gap-4 py-3 text-left transition-colors rounded-lg px-3 w-full cursor-pointer",
                      collapsed && "justify-center px-0",
                      "hover:bg-black/10",
                    )}
                  >
                    <Image
                      src={"/images/SmileFace.svg"}
                      width={18}
                      height={18}
                      alt="logout"
                      className="h-5 w-5 shrink-0"
                    />
                    {!collapsed && <span className="text-sm">Profile</span>}
                  </button>
                </li>
                <li>
                  <Link href={"/restaurant/account-settings"} className="block">
                    <button
                      className={cn(
                        "flex items-center gap-4 py-3 text-left transition-colors rounded-lg px-3 w-full cursor-pointer",
                        collapsed && "justify-center px-0",
                        "hover:bg-black/10",
                      )}
                    >
                      <Image
                        src={"/images/SettingFilled.svg"}
                        width={18}
                        height={18}
                        alt="logout"
                        className="h-5 w-5 shrink-0"
                      />
                      {!collapsed && <span className="text-sm">Settings</span>}
                    </button>
                  </Link>
                </li>
                <li>
                  <button
                    className={cn(
                      "flex items-center bg-munchprimary text-white gap-4 py-3 text-left transition-colors rounded-lg px-3 w-full cursor-pointer",
                      collapsed && "justify-center px-0",
                      "hover:bg-munchprimaryDark",
                    )}
                    onClick={logout}
                  >
                    <Image
                      src={"/images/Logout.svg"}
                      width={18}
                      height={18}
                      alt="logout"
                      className="h-5 w-5 shrink-0"
                    />
                    {!collapsed && <span className="text-sm">Logout</span>}
                  </button>
                </li>
              </ul>
            </Card>
            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center shrink-0">
              <span className="text-lg font-bold text-gray-700">
                {shortName}
              </span>
            </div>
            {!collapsed && !loadingProfile && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{profile?.name}</p>
                <p className="text-xs">Vendor</p>
              </div>
            )}
            <button
              className={cn(
                "p-2 rounded-lg  transition-colors",
                collapsed && "hidden",
              )}
            >
              <Ellipsis className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      {/* Mobile sidebar */}
      <div
        className={cn(
          "absolute flex md:hidden flex-col bg-munchprimary border-r border-gray-200 transition-all duration-300 z-30 min-h-screen",
          mobileCollapsed ? "w-full" : "w-2",
        )}
      >
        {mobileCollapsed ? (
          <div className="flex flex-col justify-between p-4 h-screen">
            <div>
              {/* Collapse Toggle Button */}
              <button
                onClick={() => setMobileCollapsed(!mobileCollapsed)}
                className={cn("w-fit mb-7 p-1.5", mobileCollapsed && "mx-auto")}
              >
                <Image
                  src={"/images/MenuFold.svg"}
                  width={18}
                  height={18}
                  alt="menu trigger"
                />
              </button>
              {/* Header */}
              <div className="flex items-center gap-3 bg-white shrink-0 rounded-xl px-2 py-2">
                <Image
                  src="/images/auth/store.svg"
                  width={50}
                  height={50}
                  alt="restaurant"
                  className="h-10 w-10"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-900">
                    No 32, opposite Zara mall, mainland
                  </p>
                </div>
              </div>

              {/* Navigation - Scrollable if needed, but content fits in most cases */}
              <nav className="flex-1 overflow-y-auto py-6 [scrollbar-width:none] text-white [&::-webkit-scrollbar]:hidden">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider mx-3">
                  Management
                </p>
                <ul className="space-y-1">
                  {managementItems.map((item) => (
                    <a key={item.label} href={item.href}>
                      <button
                        className={cn(
                          "flex items-center gap-4 w-full py-3 text-left transition-colors rounded-lg px-3",
                          item.active ? "bg-black/13" : "hover:bg-black/10",
                        )}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span className="text-sm">{item.label}</span>
                      </button>
                    </a>
                  ))}
                </ul>

                <p className="mt-8 mb-3 text-xs font-semibold uppercase tracking-wider mx-3">
                  Account
                </p>
                <ul className="space-y-1">
                  {accountItems.map((item) => (
                    <a key={item.label} href={item.href}>
                      <button
                        className={cn(
                          "flex items-center gap-4 w-full py-3 text-left transition-colors rounded-lg px-3",
                          "hover:bg-black/10",
                        )}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span className="text-sm">{item.label}</span>
                      </button>
                    </a>
                  ))}
                </ul>
              </nav>
            </div>

            {/* Footer - Fixed at bottom */}
            <div className="shrink-0 text-white relative bottom-0 mb-1">
              <a
                href={"/restaurant/preview-store"}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 rounded-lg transition-colors justify-center bg-white w-full text-munchprimary",
                  mobileCollapsed && "justify-center px-0",
                  " hover:bg-gray-100",
                )}
              >
                <Globe className="h-5 w-5 shrink-0" />
                <span className="text-sm">Preview Store</span>
              </a>

              <div
                // onMouseEnter={() => setShowMore(true)}
                // onMouseLeave={() => setShowMore(false)}
                className={cn("flex items-center gap-3 pt-4")}
              >
                <Card
                  className={cn(
                    "absolute -top-29 w-full p-3 py-3 text-slate-500 hidden",
                    showMore && "block",
                  )}
                >
                  <ul className="space-y-1">
                    <li onClick={() => setIsProfileDialogOpen(true)}>
                      <button
                        className={cn(
                          "flex items-center gap-4 py-3 text-left transition-colors rounded-lg px-3 w-full",
                          "hover:bg-black/10",
                        )}
                      >
                        <Image
                          src={"/images/SmileFace.svg"}
                          width={18}
                          height={18}
                          alt="logout"
                          className="h-5 w-5 shrink-0"
                        />
                        <span className="text-sm">Profile</span>
                      </button>
                    </li>
                    <li>
                      <a
                        href={"/restaurant/account-settings"}
                        className="block"
                      >
                        <button
                          className={cn(
                            "flex items-center gap-4 py-3 text-left transition-colors rounded-lg px-3 w-full",
                            "hover:bg-black/10",
                          )}
                        >
                          <Image
                            src={"/images/SettingFilled.svg"}
                            width={18}
                            height={18}
                            alt="logout"
                            className="h-5 w-5 shrink-0"
                          />
                          <span className="text-sm">Settings</span>
                        </button>
                      </a>
                    </li>
                    <li>
                      <button
                        className={cn(
                          "flex items-center bg-munchprimary text-white gap-4 py-3 text-left transition-colors rounded-lg px-3 w-full",
                          "hover:bg-munchprimaryDark",
                        )}
                        onClick={logout}
                      >
                        <Image
                          src={"/images/Logout.svg"}
                          width={18}
                          height={18}
                          alt="logout"
                          className="h-5 w-5 shrink-0"
                        />
                        <span className="text-sm">Logout</span>
                      </button>
                    </li>
                  </ul>
                </Card>
                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center shrink-0">
                  <span className="text-lg font-bold text-gray-700">
                    {shortName}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {profile?.name}
                  </p>
                  <p className="text-xs">Vendor</p>
                </div>
                <button
                  className={cn("p-2 rounded-lg  transition-colors")}
                  onClick={() => setShowMore(!showMore)}
                >
                  <Ellipsis className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Collapse Toggle Button */}
            <button
              onClick={() => setMobileCollapsed(!mobileCollapsed)}
              className={cn(
                "w-fit mb-7 absolute top-4 bg-white rounded p-3 -right-15",
                mobileCollapsed && "",
              )}
            >
              <Image
                src={"/images/MenuFoldDark.svg"}
                width={24}
                height={24}
                alt="menu trigger"
              />
            </button>
          </>
        )}
      </div>

      {/* Dialog */}
      <CustomModal
        isOpen={isProfileDialogOpen}
        onClose={() => setIsProfileDialogOpen(false)}
        title="Profile Details"
        maxWidth="sm:max-w-[450px]"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setIsProfileDialogOpen(false)}
              className="rounded-md"
            >
              Cancel
            </Button>
          </>
        }
      >
        {loadingProfile ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-munchprimary" />
          </div>
        ) : profile ? (
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div>
                <p className="text-sm text-gray-500">Full Name</p>
                <p className="font-medium text-gray-900">
                  {profile.name || profile.displayName || "—"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div>
                <p className="text-sm text-gray-500">Email Address</p>
                <p className="font-medium text-gray-900">
                  {profile.email || "—"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div>
                <p className="text-sm text-gray-500">Phone Number</p>
                <p className="font-medium text-gray-900">
                  {profile.phone || "—"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">
            Could not load profile information
          </p>
        )}
      </CustomModal>
    </div>
  );
}

function CustomModal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = "sm:max-w-[640px]",
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative w-full bg-white shadow-xl overflow-hidden rounded animate-in zoom-in-95 duration-200",
          maxWidth,
        )}
      >
        <div className="flex border-b items-center justify-between px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            className="text-gray-400 hover:text-gray-600 transition-colors"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
        {footer && (
          <div className="flex justify-end gap-3 px-6 py-4 border-t bg-white">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
