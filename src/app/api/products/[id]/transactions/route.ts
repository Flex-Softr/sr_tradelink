import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { createProductTransaction } from "@/lib/products";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
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
    const { date, kroyweight, kroyprice, dailysaleweight, dailysaleprice } = body;

    const newTx = await createProductTransaction({
      product_id: id,
      date,
      kroyweight,
      kroyprice,
      dailysaleweight,
      dailysaleprice,
    });

    revalidatePath(`/dashboard/products/${id}`);
    revalidatePath("/dashboard/products");
    revalidatePath("/dashboard");

    return NextResponse.json(
      {
        success: true,
        message: "লেনদেন সফলভাবে যোগ করা হয়েছে",
        data: newTx,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("POST /api/products/[id]/transactions error:", error);
    const message = error instanceof Error ? error.message : "লেনদেন যোগ করতে সমস্যা হয়েছে";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
