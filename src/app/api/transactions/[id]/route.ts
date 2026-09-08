import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { deleteTransaction, getTransactionById, updateTransaction } from "@/lib/transactions";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const transaction = await getTransactionById(id);

    if (!transaction) {
      return NextResponse.json({ success: false, error: "লেনদেন পাওয়া যায়নি" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: transaction,
    });
  } catch (error: unknown) {
    console.error("GET transaction error:", error);
    const message = error instanceof Error ? error.message : "লেনদেনের তথ্য লোড করতে সমস্যা হয়েছে";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।" },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const body = await request.json();

    const updated = await updateTransaction(id, body);

    revalidatePath(`/dashboard/customers/${updated.customer_id}`);
    revalidatePath("/dashboard/customers");
    revalidatePath("/dashboard");

    return NextResponse.json({
      success: true,
      message: "লেনদেন সফলভাবে আপডেট করা হয়েছে",
      data: updated,
    });
  } catch (error: unknown) {
    console.error("PUT transaction error:", error);
    const message = error instanceof Error ? error.message : "লেনদেন আপডেট করতে সমস্যা হয়েছে";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return PUT(request, context);
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।" },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const existing = await getTransactionById(id);

    if (!existing) {
      return NextResponse.json({ success: false, error: "লেনদেন পাওয়া যায়নি" }, { status: 404 });
    }

    await deleteTransaction(id);

    revalidatePath(`/dashboard/customers/${existing.customer_id}`);
    revalidatePath("/dashboard/customers");
    revalidatePath("/dashboard");

    return NextResponse.json({
      success: true,
      message: "লেনদেন সফলভাবে মুছে ফেলা হয়েছে",
    });
  } catch (error: unknown) {
    console.error("DELETE transaction error:", error);
    const message = error instanceof Error ? error.message : "লেনদেন মুছে ফেলতে সমস্যা হয়েছে";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
