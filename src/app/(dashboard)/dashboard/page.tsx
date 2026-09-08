import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { RiGlobalLine, RiUserStarLine } from "@remixicon/react";
import { getServerSession } from "next-auth";

import DashboardTabs from "@/components/dashboard/DashboardTabs";
import LogoutButton from "@/components/dashboard/LogoutButton";
import { Badge } from "@/components/ui/badge";
import { authOptions } from "@/lib/auth";
import { getCustomers } from "@/lib/customers";
import { getProducts } from "@/lib/products";
import { getUsers } from "@/lib/users";

export const metadata: Metadata = {
  title: "ড্যাশবোর্ড | SR Tradelink Admin",
  description: "এসআর ট্রেডলিংক অ্যাডমিন ম্যানেজমেন্ট ড্যাশবোর্ড",
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const user = session.user;
  const [initialProducts, initialCustomers, usersResult] = await Promise.all([
    getProducts(),
    getCustomers(),
    getUsers({ limit: 1000 }),
  ]);

  return (
    <div className="py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Welcome Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-green-600/20 ring-inset dark:bg-green-950/50 dark:text-green-400 dark:ring-green-500/20">
                <RiUserStarLine className="mr-1 size-3.5" />
                অ্যাডমিন পোর্টাল
              </span>
              <Badge variant="outline" className="text-xs uppercase">
                {user?.role || "ADMIN"}
              </Badge>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              স্বাগতম, {user?.name || "অ্যাডমিন"}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              লগইন করা ইমেইল:{" "}
              <span className="font-medium text-slate-700 dark:text-slate-300">{user?.email}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RiGlobalLine className="size-4" />
              মূল ওয়েবসাইট দেখুন
            </Link>
            <LogoutButton />
          </div>
        </div>

        {/* Dynamic Products, Customers & Users Management */}
        <DashboardTabs
          initialProducts={initialProducts}
          initialCustomers={initialCustomers}
          initialUsers={usersResult.users}
        />
      </div>
    </div>
  );
}
