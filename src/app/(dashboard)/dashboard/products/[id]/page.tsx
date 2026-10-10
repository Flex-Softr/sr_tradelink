import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getServerSession } from "next-auth";

import ProductDetailsView from "@/components/dashboard/ProductDetailsView";
import { authOptions } from "@/lib/auth";
import { getProductWithTransactions } from "@/lib/products";

interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductWithTransactions(id);

  if (!product) {
    return {
      title: "পণ্য পাওয়া যায়নি | SR Tradelink Admin",
    };
  }

  return {
    title: `${product.name} - পণ্য লেনদেন ও খতিয়ান | SR Tradelink Admin`,
    description: `${product.name} এর ক্রয়, বিক্রয় এবং স্টক খতিয়ান বিবরণী`,
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    const { id } = await params;
    redirect(`/login?callbackUrl=/dashboard/products/${id}`);
  }

  const { id } = await params;
  const product = await getProductWithTransactions(id);

  if (!product) {
    notFound();
  }

  return (
    <div className="py-4 sm:py-8">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <ProductDetailsView product={product} />
      </div>
    </div>
  );
}
