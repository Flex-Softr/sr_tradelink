import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { deleteOtherCost, getOtherCostById, updateOtherCost } from "@/lib/other-costs";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const cost = await getOtherCostById(id);

    if (!cost) {
      return NextResponse.json(
        { success: false, error: "খরচের এন্ট্রি পাওয়া যায়নি" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: cost,
    });
  } catch (error: unknown) {
    console.error("GET /api/other-costs/[id] error:", error);
    const message = error instanceof Error ? error.message : "খরচের বিবরণ লোড করতে সমস্যা হয়েছে";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
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
    const { title, category, amount, date, voucher_no, description } = body;

    const numAmount = amount !== undefined ? Number(amount) : undefined;
    if (numAmount !== undefined && (isNaN(numAmount) || numAmount < 0)) {
      return NextResponse.json(
        { success: false, error: "খরচের পরিমাণ সঠিক সংখ্যা হতে হবে" },
        { status: 400 }
      );
    }

    const updated = await updateOtherCost(id, {
      ...(title !== undefined && { title }),
      ...(category !== undefined && { category }),
      ...(numAmount !== undefined && { amount: numAmount }),
      ...(date !== undefined && { date }),
      ...(voucher_no !== undefined && { voucher_no }),
      ...(description !== undefined && { description }),
    });

    revalidatePath("/dashboard/other-costs");
    revalidatePath("/dashboard");

    return NextResponse.json({
      success: true,
      message: "খরচের তথ্য সফলভাবে আপডেট করা হয়েছে",
      data: updated,
    });
  } catch (error: unknown) {
    console.error("PUT /api/other-costs/[id] error:", error);
    const message = error instanceof Error ? error.message : "খরচের তথ্য আপডেট করতে সমস্যা হয়েছে";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
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
    await deleteOtherCost(id);

    revalidatePath("/dashboard/other-costs");
    revalidatePath("/dashboard");

    return NextResponse.json({
      success: true,
      message: "খরচের এন্ট্রি সফলভাবে মুছে ফেলা হয়েছে",
    });
  } catch (error: unknown) {
    console.error("DELETE /api/other-costs/[id] error:", error);
    const message = error instanceof Error ? error.message : "খরচ মুছে ফেলতে সমস্যা হয়েছে";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
