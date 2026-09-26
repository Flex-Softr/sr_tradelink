import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getServerSession } from "next-auth";

import PartyDetailsView from "@/components/dashboard/PartyDetailsView";
import { authOptions } from "@/lib/auth";
import { getPartyById, getPartyTransactionSummary, getPartyTransactions } from "@/lib/parties";

interface PartyDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PartyDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const party = await getPartyById(id);

  if (!party) {
    return {
      title: "পার্টি পাওয়া যায়নি | SR Tradelink Admin",
    };
  }

  return {
    title: `${party.name} - পার্টির খতিয়ান ও লেনদেন বিবরণী | SR Tradelink Admin`,
    description: `${party.name} এর ক্রয়, জমা এবং আর্থিক খতিয়ান বিবরণী`,
  };
}

export default async function PartyDetailPage({ params }: PartyDetailPageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    const { id } = await params;
    redirect(`/login?callbackUrl=/dashboard/parties/${id}`);
  }

  const { id } = await params;
  const party = await getPartyById(id);

  if (!party) {
    notFound();
  }

  const [transactionsData, summary] = await Promise.all([
    getPartyTransactions(id, { limit: 1000 }),
    getPartyTransactionSummary(id),
  ]);

  return (
    <div className="py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <PartyDetailsView
          party={party}
          initialTransactions={transactionsData.transactions}
          initialSummary={summary}
        />
      </div>
    </div>
  );
}
