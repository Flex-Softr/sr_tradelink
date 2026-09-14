"use client";

import { useEffect, useRef, useState } from "react";

import Link from "next/link";

import {
  RiArrowRightUpLine,
  RiDashboardLine,
  RiLogoutBoxRLine,
  RiShieldUserLine,
  RiUser3Line,
} from "@remixicon/react";
import { signOut } from "next-auth/react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface UserDropdownProps {
  user?: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
    image?: string | null;
  };
}

export default function UserDropdown({ user }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : "A";
  const userRole = user?.role || "ADMIN";
  const userName = user?.name || "অ্যাডমিন";
  const userEmail = user?.email || "";

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      {/* Trigger Button - Compact Rounded Dummy User Icon */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="ব্যবহারকারী মেনু"
        title={userName}
        className={cn(
          "relative flex size-9.5 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-xs transition-all hover:border-green-600/40 hover:bg-green-50/60 hover:text-green-700 focus:ring-2 focus:ring-green-500/20 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-green-500/40 dark:hover:bg-slate-700 dark:hover:text-green-400",
          isOpen &&
            "border-green-600 bg-green-50 text-green-700 ring-2 ring-green-600/20 dark:border-green-500 dark:bg-slate-700 dark:text-green-400"
        )}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <RiUser3Line className="size-5" />
      </button>

      {/* Dropdown Menu Popup */}
      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 origin-top-right rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl transition-all duration-150 ease-out focus:outline-hidden dark:border-slate-800 dark:bg-slate-900"
        >
          {/* User Profile Header inside Dropdown */}
          <div className="flex items-center gap-3 border-b border-slate-100 px-3 py-3 dark:border-slate-800">
            <Avatar size="default" className="ring-2 ring-green-600/20">
              <AvatarFallback className="bg-green-100 font-bold text-green-800 dark:bg-green-950 dark:text-green-300">
                {userInitial}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-semibold whitespace-nowrap text-slate-900 dark:text-white">
                  {userName}
                </span>
                <Badge
                  variant="secondary"
                  className="bg-green-50 px-1.5 py-0 text-[10px] font-semibold whitespace-nowrap text-green-700 uppercase dark:bg-green-950/60 dark:text-green-400"
                >
                  {userRole}
                </Badge>
              </div>
              {userEmail && (
                <span className="truncate text-xs whitespace-nowrap text-slate-500 dark:text-slate-400">
                  {userEmail}
                </span>
              )}
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              role="menuitem"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <RiDashboardLine className="size-4 text-slate-500 dark:text-slate-400" />
              <span>ড্যাশবোর্ড</span>
            </Link>

            <Link
              href="/dashboard/users"
              onClick={() => setIsOpen(false)}
              role="menuitem"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <RiShieldUserLine className="size-4 text-slate-500 dark:text-slate-400" />
              <span>ব্যবহারকারী ব্যবস্থাপনা</span>
            </Link>

            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              role="menuitem"
              className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <span className="flex items-center gap-2.5">
                <RiArrowRightUpLine className="size-4 text-slate-500 dark:text-slate-400" />
                মূল ওয়েবসাইট
              </span>
            </Link>
          </div>

          {/* Logout Action */}
          <div className="border-t border-slate-100 pt-1 dark:border-slate-800">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                signOut({ callbackUrl: "/login" });
              }}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap text-red-600 transition hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/50"
            >
              <RiLogoutBoxRLine className="size-4" />
              <span>লগআউট</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
