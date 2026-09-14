"use client";

import { Suspense, useEffect, useState } from "react";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import {
  RiArrowRightUpLine,
  RiBarChartBoxLine,
  RiBox3Line,
  RiCheckDoubleLine,
  RiFileList3Line,
  RiGroupLine,
  RiProductHuntLine,
  RiShieldUserLine,
  RiVipCrownLine,
} from "@remixicon/react";

import CustomerManagement from "@/components/dashboard/CustomerManagement";
import ProductManagement from "@/components/dashboard/ProductManagement";
import SalesReportView from "@/components/dashboard/SalesReportView";
import UserManagement from "@/components/dashboard/UserManagement";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Customer } from "@/lib/customers";
import type { Product } from "@/lib/products";
import type { SafeUser } from "@/lib/users";

interface DashboardTabsProps {
  initialProducts: Product[];
  initialCustomers: Customer[];
  initialUsers: SafeUser[];
}

type TabType = "products" | "customers" | "users" | "sales";

function DashboardTabsContent({
  initialProducts,
  initialCustomers,
  initialUsers,
}: DashboardTabsProps) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [selectedTab, setSelectedTab] = useState<TabType>("products");

  // Derive activeTab prioritizing query param if present
  const activeTab: TabType =
    tabParam === "customers" ||
    tabParam === "products" ||
    tabParam === "users" ||
    tabParam === "sales"
      ? tabParam
      : selectedTab;

  // Listen for hash changes (e.g. from navbar clicks #customers, #products, #users, #sales)
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes("customer")) {
        setSelectedTab("customers");
      } else if (hash.includes("product")) {
        setSelectedTab("products");
      } else if (hash.includes("user")) {
        setSelectedTab("users");
      } else if (hash.includes("sale") || hash.includes("report")) {
        setSelectedTab("sales");
      }
    };

    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  const handleTabChange = (tab: TabType) => {
    setSelectedTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState(null, "", url.toString());
    }
  };

  // Overall quick statistics
  const totalProducts = initialProducts.length;
  const inStockProducts = initialProducts.filter((p) => (p.stock ?? 0) > 0).length;
  const totalCustomers = initialCustomers.length;
  const vipCustomers = initialCustomers.filter((c) => c.is_vip).length;
  const totalUsers = initialUsers.length;
  const adminUsers = initialUsers.filter((u) => u.role.toLowerCase() === "admin").length;

  return (
    <div className="space-y-6">
      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
        {/* Total Products */}
        <Card
          onClick={() => handleTabChange("products")}
          className={`cursor-pointer border transition-all duration-200 hover:shadow-md ${
            activeTab === "products"
              ? "border-green-500/50 bg-green-50/40 ring-2 ring-green-500/20 dark:bg-green-950/20 dark:ring-green-500/30"
              : "border-border/60 hover:border-slate-300 dark:hover:border-slate-700"
          }`}
        >
          <CardContent className="flex items-center justify-between p-4 sm:p-5">
            <div className="flex items-center gap-3.5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                <RiBox3Line className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">মোট পণ্য</p>
                <h3 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
                  {totalProducts}
                </h3>
                <p className="text-[11px] font-medium text-green-700 dark:text-green-400">
                  মজুত আছে: {inStockProducts} টি
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/products"
              title="পণ্য পৃষ্ঠায় যান"
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <RiArrowRightUpLine className="size-4" />
            </Link>
          </CardContent>
        </Card>

        {/* Total Customers */}
        <Card
          onClick={() => handleTabChange("customers")}
          className={`cursor-pointer border transition-all duration-200 hover:shadow-md ${
            activeTab === "customers"
              ? "border-emerald-500/50 bg-emerald-50/40 ring-2 ring-emerald-500/20 dark:bg-emerald-950/20 dark:ring-emerald-500/30"
              : "border-border/60 hover:border-slate-300 dark:hover:border-slate-700"
          }`}
        >
          <CardContent className="flex items-center justify-between p-4 sm:p-5">
            <div className="flex items-center gap-3.5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                <RiGroupLine className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">মোট গ্রাহক</p>
                <h3 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
                  {totalCustomers}
                </h3>
                <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                  নথিভুক্ত ক্রেতা
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/customers"
              title="গ্রাহক পৃষ্ঠায় যান"
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <RiArrowRightUpLine className="size-4" />
            </Link>
          </CardContent>
        </Card>

        {/* Sales & Cashflow Report Card */}
        <Card
          onClick={() => handleTabChange("sales")}
          className={`cursor-pointer border transition-all duration-200 hover:shadow-md ${
            activeTab === "sales"
              ? "border-blue-500/50 bg-blue-50/40 ring-2 ring-blue-500/20 dark:bg-blue-950/20 dark:ring-blue-500/30"
              : "border-border/60 hover:border-slate-300 dark:hover:border-slate-700"
          }`}
        >
          <CardContent className="flex items-center justify-between p-4 sm:p-5">
            <div className="flex items-center gap-3.5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                <RiBarChartBoxLine className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  বিক্রয় রিপোর্ট
                </p>
                <h3 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl dark:text-white">
                  কেন্দ্রীয় অডিট
                </h3>
                <p className="text-[11px] font-medium text-blue-700 dark:text-blue-400">
                  বিক্রয় ও বকেয়া হিসাব
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/sales"
              title="বিক্রয় রিপোর্ট পৃষ্ঠায় যান"
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <RiArrowRightUpLine className="size-4" />
            </Link>
          </CardContent>
        </Card>

        {/* Total Users */}
        <Card
          onClick={() => handleTabChange("users")}
          className={`cursor-pointer border transition-all duration-200 hover:shadow-md ${
            activeTab === "users"
              ? "border-purple-500/50 bg-purple-50/40 ring-2 ring-purple-500/20 dark:bg-purple-950/20 dark:ring-purple-500/30"
              : "border-border/60 hover:border-slate-300 dark:hover:border-slate-700"
          }`}
        >
          <CardContent className="flex items-center justify-between p-4 sm:p-5">
            <div className="flex items-center gap-3.5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
                <RiShieldUserLine className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  ব্যবহারকারী
                </p>
                <h3 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
                  {totalUsers}
                </h3>
                <p className="text-[11px] font-medium text-purple-700 dark:text-purple-400">
                  অ্যাডমিন: {adminUsers} জন
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/users"
              title="ব্যবহারকারী পৃষ্ঠায় যান"
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <RiArrowRightUpLine className="size-4" />
            </Link>
          </CardContent>
        </Card>

        {/* VIP Customers */}
        <Card
          onClick={() => handleTabChange("customers")}
          className="border-border/60 cursor-pointer border transition-all duration-200 hover:border-amber-400/60 hover:shadow-md"
        >
          <CardContent className="flex items-center gap-3.5 p-4 sm:p-5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
              <RiVipCrownLine className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                ভিআইপি গ্রাহক
              </p>
              <h3 className="text-xl font-bold tracking-tight text-amber-700 sm:text-2xl dark:text-amber-400">
                {vipCustomers}
              </h3>
              <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                বিশেষ অগ্রাধিকার
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tab Navigation Header */}
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        <div className="inline-flex flex-wrap rounded-xl bg-slate-100 p-1.5 dark:bg-slate-800/80">
          <button
            type="button"
            onClick={() => handleTabChange("products")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-150 ${
              activeTab === "products"
                ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <RiProductHuntLine className="size-4 text-green-600 dark:text-green-400" />
            <span>পণ্য ব্যবস্থাপনা</span>
            <Badge
              variant={activeTab === "products" ? "default" : "secondary"}
              className={`ml-1 px-2 py-0.5 text-xs ${
                activeTab === "products"
                  ? "bg-green-600 text-white hover:bg-green-600"
                  : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
              }`}
            >
              {totalProducts}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("customers")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-150 ${
              activeTab === "customers"
                ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <RiGroupLine className="size-4 text-emerald-600 dark:text-emerald-400" />
            <span>গ্রাহক ব্যবস্থাপনা</span>
            <Badge
              variant={activeTab === "customers" ? "default" : "secondary"}
              className={`ml-1 px-2 py-0.5 text-xs ${
                activeTab === "customers"
                  ? "bg-emerald-600 text-white hover:bg-emerald-600"
                  : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
              }`}
            >
              {totalCustomers}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("sales")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-150 ${
              activeTab === "sales"
                ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <RiFileList3Line className="size-4 text-blue-600 dark:text-blue-400" />
            <span>বিক্রয় ও আর্থিক রিপোর্ট</span>
            <Badge
              variant={activeTab === "sales" ? "default" : "secondary"}
              className={`ml-1 px-2 py-0.5 text-xs ${
                activeTab === "sales"
                  ? "bg-blue-600 text-white hover:bg-blue-600"
                  : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
              }`}
            >
              অডিট
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("users")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-150 ${
              activeTab === "users"
                ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <RiShieldUserLine className="size-4 text-purple-600 dark:text-purple-400" />
            <span>ব্যবহারকারী</span>
            <Badge
              variant={activeTab === "users" ? "default" : "secondary"}
              className={`ml-1 px-2 py-0.5 text-xs ${
                activeTab === "users"
                  ? "bg-purple-600 text-white hover:bg-purple-600"
                  : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
              }`}
            >
              {totalUsers}
            </Badge>
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <RiCheckDoubleLine className="size-4 text-green-600 dark:text-green-400" />
            <span>পৃষ্ঠা প্রতি ২০টি আইটেম (ডিফল্ট)</span>
          </div>

          <span className="hidden text-slate-300 sm:inline dark:text-slate-700">|</span>

          {activeTab === "products" && (
            <Link
              href="/dashboard/products"
              className="inline-flex items-center gap-1 font-medium text-green-700 hover:underline dark:text-green-400"
            >
              পূর্ণাঙ্গ পণ্য পৃষ্ঠা <RiArrowRightUpLine className="size-3.5" />
            </Link>
          )}

          {activeTab === "customers" && (
            <Link
              href="/dashboard/customers"
              className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:underline dark:text-emerald-400"
            >
              পূর্ণাঙ্গ গ্রাহক পৃষ্ঠা <RiArrowRightUpLine className="size-3.5" />
            </Link>
          )}

          {activeTab === "sales" && (
            <Link
              href="/dashboard/sales"
              className="inline-flex items-center gap-1 font-medium text-blue-700 hover:underline dark:text-blue-400"
            >
              পূর্ণাঙ্গ বিক্রয় পৃষ্ঠা <RiArrowRightUpLine className="size-3.5" />
            </Link>
          )}

          {activeTab === "users" && (
            <Link
              href="/dashboard/users"
              className="inline-flex items-center gap-1 font-medium text-purple-700 hover:underline dark:text-purple-400"
            >
              পূর্ণাঙ্গ ব্যবহারকারী পৃষ্ঠা <RiArrowRightUpLine className="size-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === "products" && (
          <div className="animate-in fade-in duration-200">
            <ProductManagement initialProducts={initialProducts} />
          </div>
        )}

        {activeTab === "customers" && (
          <div className="animate-in fade-in duration-200">
            <CustomerManagement initialCustomers={initialCustomers} />
          </div>
        )}

        {activeTab === "sales" && (
          <div className="animate-in fade-in duration-200">
            <SalesReportView initialCustomers={initialCustomers} />
          </div>
        )}

        {activeTab === "users" && (
          <div className="animate-in fade-in duration-200">
            <UserManagement initialUsers={initialUsers} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardTabs(props: DashboardTabsProps) {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl border border-slate-200 bg-slate-100/60 dark:border-slate-800 dark:bg-slate-800/60"
              />
            ))}
          </div>
          <div className="h-96 animate-pulse rounded-xl border border-slate-200 bg-slate-100/40 dark:border-slate-800 dark:bg-slate-800/40" />
        </div>
      }
    >
      <DashboardTabsContent {...props} />
    </Suspense>
  );
}
