import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { createUser, getUsers } from "@/lib/users";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const role = searchParams.get("role") || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 20;

    const result = await getUsers({ search, role, page, limit });

    return NextResponse.json({
      success: true,
      data: result.users,
      pagination: {
        total: result.total,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        limit: result.limit,
      },
    });
  } catch (error: unknown) {
    console.error("GET /api/users error:", error);
    const message =
      error instanceof Error ? error.message : "ব্যবহারকারী তালিকা লোড করতে সমস্যা হয়েছে";
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
    const { name, email, password, role, image } = body;

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { success: false, error: "ইমেইল প্রদান করা আবশ্যক।" },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { success: false, error: "পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে।" },
        { status: 400 }
      );
    }

    const newUser = await createUser({
      name,
      email,
      password,
      role,
      image,
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/users");

    return NextResponse.json(
      {
        success: true,
        message: "ব্যবহারকারী সফলভাবে তৈরি করা হয়েছে",
        data: newUser,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("POST /api/users error:", error);
    const message = error instanceof Error ? error.message : "ব্যবহারকারী যুক্ত করতে সমস্যা হয়েছে";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 400 }
    );
  }
}
