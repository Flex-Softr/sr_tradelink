import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { deleteUser, getUserById, updateUser } from "@/lib/users";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const user = await getUserById(id);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "ব্যবহারকারী পাওয়া যায়নি" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error: unknown) {
    console.error("GET /api/users/[id] error:", error);
    const message =
      error instanceof Error ? error.message : "ব্যবহারকারীর তথ্য লোড করতে সমস্যা হয়েছে";
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
    const { name, email, password, role, image } = body;

    const updated = await updateUser(id, {
      name,
      email,
      password,
      role,
      image,
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/users");

    return NextResponse.json({
      success: true,
      message: "ব্যবহারকারী সফলভাবে আপডেট করা হয়েছে",
      data: updated,
    });
  } catch (error: unknown) {
    console.error("PUT /api/users/[id] error:", error);
    const message = error instanceof Error ? error.message : "ব্যবহারকারী আপডেট করতে সমস্যা হয়েছে";
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
    const currentUserId = (session.user as { id?: string }).id;

    await deleteUser(id, currentUserId);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/users");

    return NextResponse.json({
      success: true,
      message: "ব্যবহারকারী সফলভাবে মুছে ফেলা হয়েছে",
    });
  } catch (error: unknown) {
    console.error("DELETE /api/users/[id] error:", error);
    const message = error instanceof Error ? error.message : "ব্যবহারকারী মুছে ফেলতে ব্যর্থ হয়েছে";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 400 }
    );
  }
}
