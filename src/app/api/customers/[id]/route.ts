import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { deleteCustomer, getCustomerById, updateCustomer } from "@/lib/customers";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const customer = await getCustomerById(id);

    if (!customer) {
      return NextResponse.json({ success: false, error: "গ্রাহক পাওয়া যায়নি" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: customer,
    });
  } catch (error: unknown) {
    console.error("GET /api/customers/[id] error:", error);
    const message = error instanceof Error ? error.message : "গ্রাহকের তথ্য লোড করতে সমস্যা হয়েছে";
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
    const { name, email, phone, address, is_vip, type } = body;

    const updated = await updateCustomer(id, {
      name,
      email,
      phone,
      address,
      is_vip,
      type,
    });

    revalidatePath("/dashboard");

    return NextResponse.json({
      success: true,
      message: "গ্রাহকের তথ্য সফলভাবে আপডেট করা হয়েছে",
      data: updated,
    });
  } catch (error: unknown) {
    console.error("PUT /api/customers/[id] error:", error);
    const message =
      error instanceof Error ? error.message : "গ্রাহকের তথ্য আপডেট করতে সমস্যা হয়েছে";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 400 }
    );
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
    await deleteCustomer(id);

    revalidatePath("/dashboard");

    return NextResponse.json({
      success: true,
      message: "গ্রাহক সফলভাবে মুছে ফেলা হয়েছে",
    });
  } catch (error: unknown) {
    console.error("DELETE /api/customers/[id] error:", error);
    const message = error instanceof Error ? error.message : "গ্রাহক মুছতে সমস্যা হয়েছে";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
