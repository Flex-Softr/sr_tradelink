import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { RiArrowLeftSLine, RiGroupLine } from "@remixicon/react";
import { getServerSession } from "next-auth";

import CustomerManagement from "@/components/dashboard/CustomerManagement";
import { authOptions } from "@/lib/auth";
import { getCustomers } from "@/lib/customers";

export const metadata: Metadata = {
  title: "গ্রাহক ব্যবস্থাপনা | SR Tradelink Admin",
  description: "খুচরা ও পাইকারি গ্রাহক তালিকা এবং প্রোফাইল পরিচালনা",
};

export default async function CustomersPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login?callbackUrl=/dashboard/customers");
  }

  const initialCustomers = await getCustomers();

  return (
    <div className="py-8">
      <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <nav className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
            >
              <RiArrowLeftSLine className="size-4" />
              ড্যাশবোর্ড
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-900 dark:text-white">গ্রাহক ব্যবস্থাপনা</span>
          </nav>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-950/50 dark:text-emerald-300">
            <RiGroupLine className="size-3.5" />
            গ্রাহক ও খামারি
          </span>
        </div>

        {/* Customer Management Component with 20 items per page pagination */}
        <CustomerManagement initialCustomers={initialCustomers} />
      </div>
    </div>
  );
}
