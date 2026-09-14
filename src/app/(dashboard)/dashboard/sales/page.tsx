import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { RiArrowLeftSLine, RiBarChartBoxLine } from "@remixicon/react";
import { getServerSession } from "next-auth";

import SalesReportView from "@/components/dashboard/SalesReportView";
import { authOptions } from "@/lib/auth";
import { getCustomers } from "@/lib/customers";
import { getCentralSalesReportData } from "@/lib/transactions";

export const metadata: Metadata = {
  title: "কেন্দ্রীয় বিক্রয় ও আর্থিক রিপোর্ট | SR Tradelink Admin",
  description:
    "এসআর ট্রেডলিংক (ঝাড়বাড়ী, বীরগঞ্জ, দিনাজপুর) কেন্দ্রীয় বিক্রয়, নগদ আদায় ও বকেয়া আর্থিক অডিট রিপোর্ট",
};

export default async function SalesReportPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login?callbackUrl=/dashboard/sales");
  }

  // Compute current month date range for initial SSR data
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const startDate = `${yyyy}-${mm}-01`;
  const endDate = `${yyyy}-${mm}-${dd}`;

  const [initialCustomers, initialReport] = await Promise.all([
    getCustomers(),
    getCentralSalesReportData({
      startDate,
      endDate,
      page: 1,
      limit: 20,
    }),
  ]);

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
            <span className="font-semibold text-slate-900 dark:text-white">
              বিক্রয় ও আর্থিক রিপোর্ট
            </span>
          </nav>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-600/20 dark:bg-blue-950/50 dark:text-blue-300">
            <RiBarChartBoxLine className="size-3.5" />
            কেন্দ্রীয় অডিট ও ক্যাশফ্লো
          </span>
        </div>

        {/* Central Sales Report Interactive View */}
        <SalesReportView initialCustomers={initialCustomers} initialData={initialReport} />
      </div>
    </div>
  );
}
