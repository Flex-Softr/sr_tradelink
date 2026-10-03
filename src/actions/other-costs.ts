"use server";

import { revalidatePath } from "next/cache";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import {
  type GetOtherCostsOptions,
  type OtherCost,
  type OtherCostInput,
  type PaginatedOtherCostsResult,
  createOtherCost,
  deleteOtherCost,
  getAllOtherCosts,
  getPaginatedOtherCosts,
  updateOtherCost,
} from "@/lib/other-costs";

export async function fetchOtherCostsAction(options: GetOtherCostsOptions = {}) {
  return await getAllOtherCosts(options);
}

export async function fetchPaginatedOtherCostsAction(
  options: GetOtherCostsOptions = {}
): Promise<PaginatedOtherCostsResult> {
  return await getPaginatedOtherCosts(options);
}

export async function createOtherCostAction(input: OtherCostInput): Promise<{
  success: boolean;
  data?: OtherCost;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: "অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।" };
    }

    const created = await createOtherCost(input);
    revalidatePath("/dashboard/other-costs");
    revalidatePath("/dashboard");
    return { success: true, data: created };
  } catch (error: unknown) {
    console.error("createOtherCostAction error:", error);
    const message = error instanceof Error ? error.message : "খরচ যোগ করতে সমস্যা হয়েছে";
    return { success: false, error: message };
  }
}

export async function updateOtherCostAction(
  id: string,
  input: Partial<OtherCostInput>
): Promise<{
  success: boolean;
  data?: OtherCost;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: "অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।" };
    }

    const updated = await updateOtherCost(id, input);
    revalidatePath("/dashboard/other-costs");
    revalidatePath("/dashboard");
    return { success: true, data: updated };
  } catch (error: unknown) {
    console.error("updateOtherCostAction error:", error);
    const message = error instanceof Error ? error.message : "খরচের তথ্য আপডেট করতে সমস্যা হয়েছে";
    return { success: false, error: message };
  }
}

export async function deleteOtherCostAction(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: "অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।" };
    }

    await deleteOtherCost(id);
    revalidatePath("/dashboard/other-costs");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: unknown) {
    console.error("deleteOtherCostAction error:", error);
    const message = error instanceof Error ? error.message : "খরচ মুছে ফেলতে সমস্যা হয়েছে";
    return { success: false, error: message };
  }
}
