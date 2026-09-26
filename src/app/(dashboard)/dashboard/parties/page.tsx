import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { RiArrowLeftSLine, RiBuilding2Line } from "@remixicon/react";
import { getServerSession } from "next-auth";

import PartyManagement from "@/components/dashboard/PartyManagement";
import { authOptions } from "@/lib/auth";
import { getParties } from "@/lib/parties";

export const metadata: Metadata = {
  title: "পার্টি ব্যবস্থাপনা | SR Tradelink Admin",
  description: "পাইকারি পার্টি, মহাজন ও সরবরাহকারীদের খাতা এবং আর্থিক খতিয়ান পরিচালনা",
};

export default async function PartiesPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login?callbackUrl=/dashboard/parties");
  }

  const initialParties = await getParties();

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
            <span className="font-semibold text-slate-900 dark:text-white">পার্টি ব্যবস্থাপনা</span>
          </nav>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 ring-1 ring-purple-600/20 dark:bg-purple-950/50 dark:text-purple-300">
            <RiBuilding2Line className="size-3.5" />
            পার্টি ও সরবরাহকারী খাতা
          </span>
        </div>

        {/* Party Management Component */}
        <PartyManagement initialParties={initialParties} />
      </div>
    </div>
  );
}
