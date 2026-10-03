import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import {
  createOtherCost,
  getAllOtherCosts,
  getOtherCostStats,
  getPaginatedOtherCosts,
} from "@/lib/other-costs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const category = searchParams.get("category") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");
    const all = searchParams.get("all") === "true";

    if (all) {
      const records = await getAllOtherCosts({
        search,
        category,
        startDate,
        endDate,
      });
      const stats = await getOtherCostStats({
        category,
        startDate,
        endDate,
      });
      return NextResponse.json({
        success: true,
        data: records,
        count: records.length,
        stats,
      });
    }

    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const limit = limitParam ? parseInt(limitParam, 10) : 20;

    const result = await getPaginatedOtherCosts({
      search,
      category,
      startDate,
      endDate,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: result.otherCosts,
      pagination: {
        total: result.total,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        limit: result.limit,
      },
      stats: result.stats,
    });
  } catch (error: unknown) {
    console.error("GET /api/other-costs error:", error);
    const message =
      error instanceof Error ? error.message : "অন্যান্য খরচের তালিকা লোড করতে সমস্যা হয়েছে";
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
    const { title, category, amount, date, voucher_no, description } = body;

    if (!title || typeof title !== "string" || title.trim() === "") {
      return NextResponse.json(
        { success: false, error: "খরচের শিরোনাম / বিবরণ আবশ্যক" },
        { status: 400 }
      );
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      return NextResponse.json(
        { success: false, error: "খরচের পরিমাণ সঠিক সংখ্যা হতে হবে" },
        { status: 400 }
      );
    }

    const newCost = await createOtherCost({
      title: title.trim(),
      category: category?.trim() || "other",
      amount: numAmount,
      date: date || new Date().toISOString(),
      voucher_no: voucher_no?.trim() || null,
      description: description?.trim() || null,
    });

    revalidatePath("/dashboard/other-costs");
    revalidatePath("/dashboard");

    return NextResponse.json(
      {
        success: true,
        data: newCost,
        message: "অন্যান্য খরচ সফলভাবে যুক্ত করা হয়েছে",
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("POST /api/other-costs error:", error);
    const message = error instanceof Error ? error.message : "অন্যান্য খরচ তৈরি করতে সমস্যা হয়েছে";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
