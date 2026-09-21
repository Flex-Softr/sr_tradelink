import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { deleteProductTransaction, updateProductTransaction } from "@/lib/products";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string; txId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।" },
        { status: 401 }
      );
    }

    const { id, txId } = await context.params;
    const body = await request.json();
    const { date, kroyweight, kroyprice, dailysaleweight, dailysaleprice } = body;

    const updatedTx = await updateProductTransaction(txId, {
      date,
      kroyweight,
      kroyprice,
      dailysaleweight,
      dailysaleprice,
    });

    revalidatePath(`/dashboard/products/${id}`);
    revalidatePath("/dashboard/products");
    revalidatePath("/dashboard");

    return NextResponse.json({
      success: true,
      message: "লেনদেন সফলভাবে আপডেট করা হয়েছে",
      data: updatedTx,
    });
  } catch (error: unknown) {
    console.error("PUT /api/products/[id]/transactions/[txId] error:", error);
    const message = error instanceof Error ? error.message : "লেনদেন আপডেট করতে সমস্যা হয়েছে";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string; txId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।" },
        { status: 401 }
      );
    }

    const { id, txId } = await context.params;
    await deleteProductTransaction(txId);

    revalidatePath(`/dashboard/products/${id}`);
    revalidatePath("/dashboard/products");
    revalidatePath("/dashboard");

    return NextResponse.json({
      success: true,
      message: "লেনদেন সফলভাবে মুছে ফেলা হয়েছে",
    });
  } catch (error: unknown) {
    console.error("DELETE /api/products/[id]/transactions/[txId] error:", error);
    const message = error instanceof Error ? error.message : "লেনদেন মুছতে সমস্যা হয়েছে";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
