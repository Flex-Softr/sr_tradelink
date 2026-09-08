import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { RiArrowLeftSLine, RiProductHuntLine } from "@remixicon/react";
import { getServerSession } from "next-auth";

import ProductManagement from "@/components/dashboard/ProductManagement";
import { authOptions } from "@/lib/auth";
import { getProducts } from "@/lib/products";

export const metadata: Metadata = {
  title: "পণ্য ব্যবস্থাপনা | SR Tradelink Admin",
  description: "এসআর ট্রেডলিংক পণ্য তালিকা ও মজুদ পরিচালনা",
};

export default async function ProductsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login?callbackUrl=/dashboard/products");
  }

  const initialProducts = await getProducts();

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
            <span className="font-semibold text-slate-900 dark:text-white">পণ্য ব্যবস্থাপনা</span>
          </nav>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 ring-1 ring-green-600/20 dark:bg-green-950/50 dark:text-green-300">
            <RiProductHuntLine className="size-3.5" />
            পণ্য ও মজুদ
          </span>
        </div>

        {/* Product Management Component with 20 items per page pagination */}
        <ProductManagement initialProducts={initialProducts} />
      </div>
    </div>
  );
}
