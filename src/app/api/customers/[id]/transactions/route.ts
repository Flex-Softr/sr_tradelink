import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import {
  type TransactionType,
  createTransaction,
  getCustomerTransactionSummary,
  getTransactionsByCustomerId,
} from "@/lib/transactions";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: customerId } = await context.params;
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search") || undefined;
    const type = (searchParams.get("type") as TransactionType | "all") || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 20;

    const [transactionsData, summary] = await Promise.all([
      getTransactionsByCustomerId(customerId, { search, type, page, limit }),
      getCustomerTransactionSummary(customerId),
    ]);

    return NextResponse.json({
      success: true,
      data: transactionsData.transactions,
      pagination: {
        total: transactionsData.total,
        totalPages: transactionsData.totalPages,
        currentPage: transactionsData.currentPage,
        limit: transactionsData.limit,
      },
      summary,
    });
  } catch (error: unknown) {
    console.error("GET customer transactions error:", error);
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

    const { id: customerId } = await context.params;
    const body = await request.json();

    const newTransaction = await createTransaction({
      customer_id: customerId,
      type: body.type,
      amount: body.amount,
      paid_amount: body.paid_amount,
      due_amount: body.due_amount,
      description: body.description,
      reference: body.reference,
      date: body.date,
    });

    revalidatePath(`/dashboard/customers/${customerId}`);
    revalidatePath("/dashboard/customers");
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
    console.error("POST customer transaction error:", error);
    const message = error instanceof Error ? error.message : "লেনদেন সংরক্ষণ করতে সমস্যা হয়েছে";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
