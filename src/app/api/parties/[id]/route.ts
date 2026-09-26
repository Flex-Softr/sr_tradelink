import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { deleteParty, getPartyById, getPartyTransactionSummary, updateParty } from "@/lib/parties";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const party = await getPartyById(id);

    if (!party) {
      return NextResponse.json({ success: false, error: "পার্টি পাওয়া যায়নি" }, { status: 404 });
    }

    const summary = await getPartyTransactionSummary(id);

    return NextResponse.json({
      success: true,
      data: party,
      summary,
    });
  } catch (error: unknown) {
    console.error("GET /api/parties/[id] error:", error);
    const message = error instanceof Error ? error.message : "পার্টির তথ্য লোড করতে সমস্যা হয়েছে";
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
    const { name, phone, address, notes } = body;

    const updated = await updateParty(id, {
      name,
      phone,
      address,
      notes,
    });

    revalidatePath(`/dashboard/parties/${id}`);
    revalidatePath("/dashboard/parties");
    revalidatePath("/dashboard");

    return NextResponse.json({
      success: true,
      message: "পার্টির তথ্য সফলভাবে আপডেট করা হয়েছে",
      data: updated,
    });
  } catch (error: unknown) {
    console.error("PUT /api/parties/[id] error:", error);
    const message =
      error instanceof Error ? error.message : "পার্টির তথ্য আপডেট করতে সমস্যা হয়েছে";
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
    await deleteParty(id);

    revalidatePath("/dashboard/parties");
    revalidatePath("/dashboard");

    return NextResponse.json({
      success: true,
      message: "পার্টি সফলভাবে মুছে ফেলা হয়েছে",
    });
  } catch (error: unknown) {
    console.error("DELETE /api/parties/[id] error:", error);
    const message = error instanceof Error ? error.message : "পার্টি মুছতে সমস্যা হয়েছে";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
