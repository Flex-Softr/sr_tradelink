"use server";

import { revalidatePath } from "next/cache";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import {
  type Customer,
  type CustomerInput,
  type CustomerType,
  createCustomer,
  deleteCustomer,
  getCustomers,
  updateCustomer,
} from "@/lib/customers";

export async function fetchCustomersAction(
  options: {
    search?: string;
    type?: CustomerType | "all";
    is_vip?: boolean;
    limit?: number;
    skip?: number;
  } = {}
) {
  return await getCustomers(options);
}

export async function createCustomerAction(input: CustomerInput): Promise<{
  success: boolean;
  data?: Customer;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: "অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।" };
    }

    const created = await createCustomer(input);
    revalidatePath("/dashboard");
    return { success: true, data: created };
  } catch (error: unknown) {
    console.error("createCustomerAction error:", error);
    const message = error instanceof Error ? error.message : "গ্রাহক যোগ করতে সমস্যা হয়েছে";
    return { success: false, error: message };
  }
}

export async function updateCustomerAction(
  id: string,
  input: Partial<CustomerInput>
): Promise<{
  success: boolean;
  data?: Customer;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: "অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।" };
    }

    const updated = await updateCustomer(id, input);
    revalidatePath("/dashboard");
    return { success: true, data: updated };
  } catch (error: unknown) {
    console.error("updateCustomerAction error:", error);
    const message =
      error instanceof Error ? error.message : "গ্রাহকের তথ্য আপডেট করতে সমস্যা হয়েছে";
    return { success: false, error: message };
  }
}

export async function deleteCustomerAction(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: "অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।" };
    }

    await deleteCustomer(id);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: unknown) {
    console.error("deleteCustomerAction error:", error);
    const message = error instanceof Error ? error.message : "গ্রাহক মুছে ফেলতে সমস্যা হয়েছে";
    return { success: false, error: message };
  }
}
