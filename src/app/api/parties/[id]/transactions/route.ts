import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import {
  createPartyTransaction,
  getPartyTransactionSummary,
  getPartyTransactions,
} from "@/lib/parties";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: partyId } = await context.params;
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 20;
    const skip = (page - 1) * limit;

    const [transactionsData, summary] = await Promise.all([
      getPartyTransactions(partyId, { search, startDate, endDate, limit, skip }),
      getPartyTransactionSummary(partyId),
    ]);

    const totalPages = Math.max(1, Math.ceil(transactionsData.total / limit));

    return NextResponse.json({
      success: true,
      data: transactionsData.transactions,
      pagination: {
        total: transactionsData.total,
        totalPages,
        currentPage: page,
        limit,
      },
      summary,
    });
  } catch (error: unknown) {
    console.error("GET party transactions error:", error);
    const message = error instanceof Error ? error.message : "লেনদেন তালিকা লোড করতে সমস্যা হয়েছে";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।" },
        { status: 401 }
      );
    }

    const { id: partyId } = await context.params;
    const body = await request.json();

    const newTransaction = await createPartyTransaction({
      party_id: partyId,
      date: body.date,
      kroy: body.kroy,
      joma: body.joma,
      description: body.description,
    });

    revalidatePath(`/dashboard/parties/${partyId}`);
    revalidatePath("/dashboard/parties");
    revalidatePath("/dashboard");

    return NextResponse.json(
      {
        success: true,
        message: "লেনদেন সফলভাবে সংরক্ষণ করা হয়েছে",
        data: newTransaction,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("POST party transaction error:", error);
    const message = error instanceof Error ? error.message : "লেনদেন সংরক্ষণ করতে সমস্যা হয়েছে";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
