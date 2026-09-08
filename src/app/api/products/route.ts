import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { type ProductUnit, createProduct, getProducts } from "@/lib/products";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const badge = searchParams.get("badge") || undefined;
    const unit = (searchParams.get("unit") as ProductUnit) || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;
    const skip = searchParams.get("skip") ? parseInt(searchParams.get("skip")!, 10) : undefined;

    const products = await getProducts({ search, badge, unit, limit, skip });

    return NextResponse.json({
      success: true,
      data: products,
      count: products.length,
    });
  } catch (error: unknown) {
    console.error("GET /api/products error:", error);
    const message = error instanceof Error ? error.message : "পণ্য তালিকা লোড করতে সমস্যা হয়েছে";
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
    const { name, subtitle, stock, price, description, image, badge, unit } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "পণ্যের নাম প্রদান করা আবশ্যক।" },
        { status: 400 }
      );
    }

    const newProduct = await createProduct({
      name,
      subtitle,
      stock,
      price,
      description,
      image,
      badge,
      unit,
    });

    revalidatePath("/");
    revalidatePath("/dashboard");

    return NextResponse.json(
      {
        success: true,
        message: "পণ্য সফলভাবে তৈরি করা হয়েছে",
        data: newProduct,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("POST /api/products error:", error);
    const message = error instanceof Error ? error.message : "পণ্য যোগ করতে সমস্যা হয়েছে";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
