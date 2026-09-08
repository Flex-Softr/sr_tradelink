import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getServerSession } from "next-auth";

import CustomerDetailsView from "@/components/dashboard/CustomerDetailsView";
import { authOptions } from "@/lib/auth";
import { getCustomerById } from "@/lib/customers";
import { getCustomerTransactionSummary, getTransactionsByCustomerId } from "@/lib/transactions";

interface CustomerDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: CustomerDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const customer = await getCustomerById(id);

  if (!customer) {
    return {
      title: "গ্রাহক পাওয়া যায়নি | SR Tradelink Admin",
    };
  }

  return {
    title: `${customer.name} - গ্রাহক লেনদেন ও খতিয়ান | SR Tradelink Admin`,
    description: `${customer.name} এর বিক্রয়, বকেয়া এবং লেনদেন বিবরণী`,
  };
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    const { id } = await params;
    redirect(`/login?callbackUrl=/dashboard/customers/${id}`);
  }

  const { id } = await params;
  const customer = await getCustomerById(id);

  if (!customer) {
    notFound();
  }

  const [transactionsData, summary] = await Promise.all([
    getTransactionsByCustomerId(id, { limit: 1000 }),
    getCustomerTransactionSummary(id),
  ]);

  return (
    <div className="py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <CustomerDetailsView
          customer={customer}
          initialTransactions={transactionsData.transactions}
          initialSummary={summary}
        />
      </div>
    </div>
  );
}
