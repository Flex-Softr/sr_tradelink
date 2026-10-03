import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { createCustomer, getCustomers, getPaginatedCustomers } from "@/lib/customers";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");
    const all = searchParams.get("all") === "true";

    if (all) {
      const customers = await getCustomers({ search });
      return NextResponse.json({
        success: true,
        data: customers,
        count: customers.length,
      });
    }

    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const limit = limitParam ? parseInt(limitParam, 10) : 20;

    const result = await getPaginatedCustomers({ search, page, limit });

    return NextResponse.json({
      success: true,
      data: result.customers,
      pagination: {
        total: result.total,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        limit: result.limit,
      },
      stats: result.stats,
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
    const { name, phone, address } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "গ্রাহকের নাম প্রদান করা আবশ্যক।" },
        { status: 400 }
      );
    }

    const newCustomer = await createCustomer({
      name,
      phone,
      address,
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
