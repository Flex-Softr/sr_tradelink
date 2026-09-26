import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { createParty, getParties } from "@/lib/parties";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;
    const skip = searchParams.get("skip") ? parseInt(searchParams.get("skip")!, 10) : undefined;

    const parties = await getParties({ search, limit, skip });

    return NextResponse.json({
      success: true,
      data: parties,
      count: parties.length,
    });
  } catch (error: unknown) {
    console.error("GET /api/parties error:", error);
    const message =
      error instanceof Error ? error.message : "পার্টির তালিকা লোড করতে সমস্যা হয়েছে";
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
    const { name, phone, address, notes } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "পার্টির নাম প্রদান করা আবশ্যক।" },
        { status: 400 }
      );
    }

    const newParty = await createParty({
      name,
      phone,
      address,
      notes,
    });

    revalidatePath("/dashboard/parties");
    revalidatePath("/dashboard");

    return NextResponse.json(
      {
        success: true,
        message: "নতুন পার্টি সফলভাবে তৈরি করা হয়েছে",
        data: newParty,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("POST /api/parties error:", error);
    const message = error instanceof Error ? error.message : "পার্টি যুক্ত করতে সমস্যা হয়েছে";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 400 }
    );
  }
}
