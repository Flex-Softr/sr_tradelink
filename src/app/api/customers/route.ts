import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { type CustomerType, createCustomer, getCustomers } from "@/lib/customers";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const type = (searchParams.get("type") as CustomerType | "all") || undefined;
    const isVipParam = searchParams.get("is_vip");
    const is_vip = isVipParam === "true" ? true : isVipParam === "false" ? false : undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;
    const skip = searchParams.get("skip") ? parseInt(searchParams.get("skip")!, 10) : undefined;

    const customers = await getCustomers({ search, type, is_vip, limit, skip });

    return NextResponse.json({
      success: true,
      data: customers,
      count: customers.length,
    });
  } catch (error: unknown) {
    console.error("GET /api/customers error:", error);
    const message = error instanceof Error ? error.message : "গ্রাহক তালিকা লোড করতে সমস্যা হয়েছে";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, email, phone, address, is_vip, type } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "গ্রাহকের নাম প্রদান করা আবশ্যক।" },
        { status: 400 }
      );
    }

    const newCustomer = await createCustomer({
      name,
      email,
      phone,
      address,
      is_vip,
      type,
    });

    revalidatePath("/dashboard");

    return NextResponse.json(
      {
        success: true,
        message: "গ্রাহক সফলভাবে তৈরি করা হয়েছে",
        data: newCustomer,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("POST /api/customers error:", error);
    const message = error instanceof Error ? error.message : "গ্রাহক যুক্ত করতে সমস্যা হয়েছে";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 400 }
    );
  }
}
