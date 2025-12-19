"use client";

import { act, useState } from "react";
import { cn } from "@/lib/utils";

import {
  LayoutDashboard,
  ShoppingBag,
  Menu as MenuIcon,
  Users,
  DollarSign,
  Settings,
  Globe,
  BellRing,
  ChevronLeft,
  ChevronRight,
  Ellipsis,
} from "lucide-react";
import Image from "next/image";
import { Card } from "../ui/card";
import { usePathname } from "next/navigation";
import Link from "next/link";

export default function RestaurantSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileCollapsed, setMobileCollapsed] = useState(false);

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
      icon: Users,
      label: "Team",
      href: "/restaurant/team",
      active: pathname.startsWith("/restaurant/team"),
    },
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

  return (
    <div>
      <div
        className={cn(
          "relative md:flex flex-col h-screen hidden bg-munchprimary border-r p-4 border-gray-200 transition-all duration-300",
          collapsed ? "w-fit" : "w-70"
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
          <Image
            src="/images/auth/store.svg"
            width={50}
            height={50}
            alt="restaurant"
            className="h-10 w-10"
          />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-900">
                No 32, opposite Zara mall, mainland
              </p>
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
                    "flex items-center gap-4 w-full py-3 text-left transition-colors rounded-lg px-3",
                    collapsed && "justify-center px-0",
                    item.active ? "bg-black/13" : "hover:bg-black/10"
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
                    "flex items-center gap-4 py-3 text-left transition-colors rounded-lg px-3 w-full",
                    collapsed && "justify-center px-0 mt-2",
                    item.active ? "bg-black/13" : "hover:bg-black/10",
                    "hover:bg-black/10"
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
          <button
            className={cn(
              "flex items-center gap-4 px-4 py-3 rounded-lg transition-colors justify-center bg-white w-full text-munchprimary",
              collapsed && "justify-center px-0",
              " hover:bg-gray-100"
            )}
          >
            <Globe className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="text-sm">Preview Store</span>}
          </button>

          <div
            onMouseEnter={() => setShowMore(true)}
            onMouseLeave={() => setShowMore(false)}
            className={cn(
              "flex items-center gap-3 pt-4",
              collapsed && "flex-col gap-2"
            )}
          >
            <Card
              className={cn(
                "absolute -top-29 w-full p-3 py-3 text-slate-500 hidden",
                collapsed && "p-1.5 -top-26",
                showMore && "block"
              )}
            >
              <ul className="space-y-1">
                <li>
                  <button
                    className={cn(
                      "flex items-center gap-4 py-3 text-left transition-colors rounded-lg px-3 w-full",
                      collapsed && "justify-center px-0",
                      "hover:bg-black/10"
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
                  <button
                    className={cn(
                      "flex items-center gap-4 py-3 text-left transition-colors rounded-lg px-3 w-full",
                      collapsed && "justify-center px-0",
                      "hover:bg-black/10"
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
                </li>
                <li>
                  <button
                    className={cn(
                      "flex items-center bg-munchprimary text-white gap-4 py-3 text-left transition-colors rounded-lg px-3 w-full",
                      collapsed && "justify-center px-0",
                      "hover:bg-munchprimaryDark"
                    )}
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
              <span className="text-lg font-bold text-gray-700">IA</span>
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Idris Adegoke</p>
                <p className="text-xs">Admin</p>
              </div>
            )}
            <button
              className={cn(
                "p-2 rounded-lg  transition-colors",
                collapsed && "hidden"
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
          "fixed flex md:hidden flex-col bg-munchprimary border-r border-gray-200 transition-all duration-300 z-30 min-h-screen",
          mobileCollapsed ? "w-full" : "w-2"
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
                          item.active ? "bg-black/13" : "hover:bg-black/10"
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
                          "flex items-center gap-4 py-3 text-left transition-colors rounded-lg px-3 w-full",
                          "hover:bg-black/10"
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
            <div className="shrink-0 text-white relative bottom-0 mb-5">
              <button
                className={cn(
                  "flex items-center gap-4 px-4 py-3 rounded-lg transition-colors justify-center bg-white w-full text-munchprimary",
                  mobileCollapsed && "justify-center px-0",
                  " hover:bg-gray-100"
                )}
              >
                <Globe className="h-5 w-5 shrink-0" />
                <span className="text-sm">Preview Store</span>
              </button>

              <div
                onMouseEnter={() => setShowMore(true)}
                onMouseLeave={() => setShowMore(false)}
                className={cn("flex items-center gap-3 pt-4")}
              >
                <Card
                  className={cn(
                    "absolute -top-29 w-full p-3 py-3 text-slate-500 hidden",
                    showMore && "block"
                  )}
                >
                  <ul className="space-y-1">
                    <li>
                      <button
                        className={cn(
                          "flex items-center gap-4 py-3 text-left transition-colors rounded-lg px-3 w-full",
                          "hover:bg-black/10"
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
                      <button
                        className={cn(
                          "flex items-center gap-4 py-3 text-left transition-colors rounded-lg px-3 w-full",
                          "hover:bg-black/10"
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
                    </li>
                    <li>
                      <button
                        className={cn(
                          "flex items-center bg-munchprimary text-white gap-4 py-3 text-left transition-colors rounded-lg px-3 w-full",
                          "hover:bg-munchprimaryDark"
                        )}
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
                  <span className="text-lg font-bold text-gray-700">IA</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">Idris Adegoke</p>
                  <p className="text-xs">Admin</p>
                </div>
                <button className={cn("p-2 rounded-lg  transition-colors")}>
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
                mobileCollapsed && ""
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
    </div>
  );
}
