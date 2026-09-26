"use server";

import { revalidatePath } from "next/cache";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import {
  type GetPartiesOptions,
  type GetPartyTransactionsOptions,
  type Party,
  type PartyInput,
  type PartyTransaction,
  type PartyTransactionInput,
  type PartyTransactionSummary,
  createParty,
  createPartyTransaction,
  deleteParty,
  deletePartyTransaction,
  getParties,
  getPartyById,
  getPartyTransactionSummary,
  getPartyTransactions,
  updateParty,
  updatePartyTransaction,
} from "@/lib/parties";

export async function fetchPartiesAction(options: GetPartiesOptions = {}): Promise<Party[]> {
  return await getParties(options);
}

export async function fetchPartyByIdAction(id: string): Promise<Party | null> {
  return await getPartyById(id);
}

export async function createPartyAction(input: PartyInput): Promise<{
  success: boolean;
  data?: Party;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: "অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।" };
    }

    const created = await createParty(input);
    revalidatePath("/dashboard/parties");
    revalidatePath("/dashboard");
    return { success: true, data: created };
  } catch (error: unknown) {
    console.error("createPartyAction error:", error);
    const message = error instanceof Error ? error.message : "পার্টি যোগ করতে সমস্যা হয়েছে";
    return { success: false, error: message };
  }
}

export async function updatePartyAction(
  id: string,
  input: Partial<PartyInput>
): Promise<{
  success: boolean;
  data?: Party;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: "অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।" };
    }

    const updated = await updateParty(id, input);
    revalidatePath(`/dashboard/parties/${id}`);
    revalidatePath("/dashboard/parties");
    revalidatePath("/dashboard");
    return { success: true, data: updated };
  } catch (error: unknown) {
    console.error("updatePartyAction error:", error);
    const message =
      error instanceof Error ? error.message : "পার্টির তথ্য আপডেট করতে সমস্যা হয়েছে";
    return { success: false, error: message };
  }
}

export async function deletePartyAction(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: "অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।" };
    }

    await deleteParty(id);
    revalidatePath("/dashboard/parties");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: unknown) {
    console.error("deletePartyAction error:", error);
    const message = error instanceof Error ? error.message : "পার্টি মুছে ফেলতে সমস্যা হয়েছে";
    return { success: false, error: message };
  }
}

export async function fetchPartyTransactionsAction(
  partyId: string,
  options: GetPartyTransactionsOptions = {}
): Promise<{ transactions: PartyTransaction[]; total: number }> {
  return await getPartyTransactions(partyId, options);
}

export async function fetchPartySummaryAction(partyId: string): Promise<PartyTransactionSummary> {
  return await getPartyTransactionSummary(partyId);
}

export async function createPartyTransactionAction(input: PartyTransactionInput): Promise<{
  success: boolean;
  data?: PartyTransaction;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: "অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।" };
    }

    const created = await createPartyTransaction(input);
    revalidatePath(`/dashboard/parties/${input.party_id}`);
    revalidatePath("/dashboard/parties");
    revalidatePath("/dashboard");
    return { success: true, data: created };
  } catch (error: unknown) {
    console.error("createPartyTransactionAction error:", error);
    const message = error instanceof Error ? error.message : "লেনদেন যোগ করতে সমস্যা হয়েছে";
    return { success: false, error: message };
  }
}

export async function updatePartyTransactionAction(
  id: string,
  partyId: string,
  input: Partial<PartyTransactionInput>
): Promise<{
  success: boolean;
  data?: PartyTransaction;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: "অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।" };
    }

    const updated = await updatePartyTransaction(id, input);
    revalidatePath(`/dashboard/parties/${partyId}`);
    revalidatePath("/dashboard/parties");
    revalidatePath("/dashboard");
    return { success: true, data: updated };
  } catch (error: unknown) {
    console.error("updatePartyTransactionAction error:", error);
    const message = error instanceof Error ? error.message : "লেনদেন আপডেট করতে সমস্যা হয়েছে";
    return { success: false, error: message };
  }
}

export async function deletePartyTransactionAction(
  id: string,
  partyId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: "অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।" };
    }

    await deletePartyTransaction(id);
    revalidatePath(`/dashboard/parties/${partyId}`);
    revalidatePath("/dashboard/parties");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: unknown) {
    console.error("deletePartyTransactionAction error:", error);
    const message = error instanceof Error ? error.message : "লেনদেন মুছে ফেলতে সমস্যা হয়েছে";
    return { success: false, error: message };
  }
}
