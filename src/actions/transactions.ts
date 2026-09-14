"use server";

import { revalidatePath } from "next/cache";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import {
  type CentralSalesReportResult,
  type CustomerTransactionSummary,
  type GetCentralSalesReportOptions,
  type GetTransactionsOptions,
  type Transaction,
  type TransactionInput,
  createTransaction,
  deleteTransaction,
  getCentralSalesReportData,
  getCustomerTransactionSummary,
  getTransactionsByCustomerId,
  updateTransaction,
} from "@/lib/transactions";

export async function fetchCentralSalesReportAction(
  options: GetCentralSalesReportOptions = {}
): Promise<CentralSalesReportResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।");
  }
  return await getCentralSalesReportData(options);
}

export async function fetchTransactionsAction(
  customerId: string,
  options: GetTransactionsOptions = {}
) {
  return await getTransactionsByCustomerId(customerId, options);
}

export async function fetchCustomerSummaryAction(
  customerId: string
): Promise<CustomerTransactionSummary> {
  return await getCustomerTransactionSummary(customerId);
}

export async function createTransactionAction(input: TransactionInput): Promise<{
  success: boolean;
  data?: Transaction;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: "অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।" };
    }

    const created = await createTransaction(input);
    revalidatePath(`/dashboard/customers/${input.customer_id}`);
    revalidatePath("/dashboard/customers");
    revalidatePath("/dashboard");
    return { success: true, data: created };
  } catch (error: unknown) {
    console.error("createTransactionAction error:", error);
    const message = error instanceof Error ? error.message : "লেনদেন যোগ করতে সমস্যা হয়েছে";
    return { success: false, error: message };
  }
}

export async function updateTransactionAction(
  id: string,
  customerId: string,
  input: Partial<TransactionInput>
): Promise<{
  success: boolean;
  data?: Transaction;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: "অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।" };
    }

    const updated = await updateTransaction(id, input);
    revalidatePath(`/dashboard/customers/${customerId}`);
    revalidatePath("/dashboard/customers");
    revalidatePath("/dashboard");
    return { success: true, data: updated };
  } catch (error: unknown) {
    console.error("updateTransactionAction error:", error);
    const message = error instanceof Error ? error.message : "লেনদেন আপডেট করতে সমস্যা হয়েছে";
    return { success: false, error: message };
  }
}

export async function deleteTransactionAction(
  id: string,
  customerId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: "অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।" };
    }

    await deleteTransaction(id);
    revalidatePath(`/dashboard/customers/${customerId}`);
    revalidatePath("/dashboard/customers");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: unknown) {
    console.error("deleteTransactionAction error:", error);
    const message = error instanceof Error ? error.message : "লেনদেন মুছে ফেলতে সমস্যা হয়েছে";
    return { success: false, error: message };
  }
}
