"use client";

import { useState } from "react";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  RiArrowRightUpLine,
  RiCloseLine,
  RiDashboardLine,
  RiGroupLine,
  RiMenuLine,
  RiProductHuntLine,
  RiShieldUserLine,
} from "@remixicon/react";

import LogoutButton from "@/components/dashboard/LogoutButton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DashboardNavbarProps {
  user?: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
    image?: string | null;
  };
}

export default function DashboardNavbar({ user }: DashboardNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    {
      href: "/dashboard",
      label: "ড্যাশবোর্ড",
      icon: RiDashboardLine,
      active: pathname === "/dashboard",
    },
    {
      href: "/dashboard/products",
      label: "পণ্য তালিকা",
      icon: RiProductHuntLine,
      active: pathname.startsWith("/dashboard/products"),
    },
    {
      href: "/dashboard/customers",
      label: "গ্রাহক তালিকা",
      icon: RiGroupLine,
      active: pathname.startsWith("/dashboard/customers"),
    },
    {
      href: "/dashboard/users",
      label: "ব্যবহারকারী",
      icon: RiShieldUserLine,
      active: pathname.startsWith("/dashboard/users"),
    },
  ];

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : "A";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 shadow-xs backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="relative size-10 overflow-hidden rounded-full ring-2 ring-green-600/20">
              <Image
                src="/images/sr-logo.jpeg"
                alt="SR Tradelink Logo"
                fill
                sizes="40px"
                className="object-cover"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold text-slate-900 dark:text-white">
                এস আর ট্রেডলিংক
              </span>
              <span className="text-xs font-medium text-green-700 dark:text-green-400">
                অ্যাডমিন ড্যাশবোর্ড
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    item.active
                      ? "bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-300"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Quick Site Link, Admin Profile, Logout */}
        <div className="hidden items-center gap-4 md:flex">
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            মূল ওয়েবসাইট
            <RiArrowRightUpLine className="size-3.5" />
          </Link>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800" />

          {/* User Profile Info */}
          <div className="flex items-center gap-3">
            <Avatar size="sm" className="ring-1 ring-green-600/30">
              <AvatarFallback className="bg-green-100 font-semibold text-green-800 dark:bg-green-950 dark:text-green-300">
                {userInitial}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-900 dark:text-white">
                  {user?.name || "অ্যাডমিন"}
                </span>
                <Badge
                  variant="secondary"
                  className="bg-green-50 px-1 py-0 text-[10px] text-green-700 uppercase dark:bg-green-950/60 dark:text-green-400"
                >
                  {user?.role || "ADMIN"}
                </Badge>
              </div>
              <span className="max-w-[140px] truncate text-[11px] text-slate-500 dark:text-slate-400">
                {user?.email}
              </span>
            </div>
          </div>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800" />

          <LogoutButton />
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 focus:outline-hidden dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label={mobileMenuOpen ? "মেনু বন্ধ করুন" : "মেনু খুলুন"}
          >
            {mobileMenuOpen ? (
              <RiCloseLine className="size-6" />
            ) : (
              <RiMenuLine className="size-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-200 bg-white px-4 pt-3 pb-4 md:hidden dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <Avatar size="sm">
                <AvatarFallback className="bg-green-100 font-semibold text-green-800 dark:bg-green-950 dark:text-green-300">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-900 dark:text-white">
                  {user?.name || "অ্যাডমিন"}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {user?.email}
                </span>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] uppercase">
              {user?.role || "ADMIN"}
            </Badge>
          </div>

          <div className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium",
                    item.active
                      ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}

            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <span>ওয়েবসাইটে ফিরে যান</span>
              <RiArrowRightUpLine className="size-4" />
            </Link>

            <div className="pt-2">
              <LogoutButton />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
