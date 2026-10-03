import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { RiArrowLeftSLine, RiMoneyDollarCircleLine } from "@remixicon/react";
import { getServerSession } from "next-auth";

import OtherCostManagement from "@/components/dashboard/OtherCostManagement";
import { authOptions } from "@/lib/auth";
import { getPaginatedOtherCosts } from "@/lib/other-costs";

export const metadata: Metadata = {
  title: "অন্যান্য খরচ ব্যবস্থাপনা | SR Tradelink Admin",
  description: "ব্যবসায়িক আনুষঙ্গিক ও বিবিধ ব্যয়ের তালিকা এবং হিসাব পরিচালনা",
};

export default async function OtherCostsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login?callbackUrl=/dashboard/other-costs");
  }

  const initialData = await getPaginatedOtherCosts({ page: 1, limit: 20 });

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
            <span className="font-semibold text-slate-900 dark:text-white">অন্যান্য খরচ</span>
          </nav>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-600/20 dark:bg-amber-950/50 dark:text-amber-300">
            <RiMoneyDollarCircleLine className="size-3.5" />
            অন্যান্য ও বিবিধ ব্যয়
          </span>
        </div>

        {/* Other Cost Management Component with Server-Side Pagination */}
        <OtherCostManagement initialData={initialData} />
      </div>
    </div>
  );
}
