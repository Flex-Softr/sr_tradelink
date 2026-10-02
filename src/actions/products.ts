"use server";

import { revalidatePath } from "next/cache";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import {
  type Product,
  type ProductInput,
  type ProductTransaction,
  type ProductTransactionInput,
  createProduct,
  createProductTransaction,
  deleteProduct,
  deleteProductTransaction,
  getProducts,
  updateProduct,
  updateProductTransaction,
} from "@/lib/products";

export async function fetchProductsAction(options: { search?: string } = {}) {
  return await getProducts(options);
}

export async function createProductAction(input: ProductInput): Promise<{
  success: boolean;
  data?: Product;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: "অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।" };
    }

    const created = await createProduct(input);
    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/products");
    return { success: true, data: created };
  } catch (error: unknown) {
    console.error("createProductAction error:", error);
    const message = error instanceof Error ? error.message : "পণ্য যোগ করতে সমস্যা হয়েছে";
    return { success: false, error: message };
  }
}

export async function updateProductAction(
  id: string,
  input: Partial<ProductInput>
): Promise<{
  success: boolean;
  data?: Product;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: "অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।" };
    }

    const updated = await updateProduct(id, input);
    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/products");
    return { success: true, data: updated };
  } catch (error: unknown) {
    console.error("updateProductAction error:", error);
    const message = error instanceof Error ? error.message : "পণ্য আপডেট করতে সমস্যা হয়েছে";
    return { success: false, error: message };
  }
}

export async function deleteProductAction(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: "অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।" };
    }

    await deleteProduct(id);
    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/products");
    return { success: true };
  } catch (error: unknown) {
    console.error("deleteProductAction error:", error);
    const message = error instanceof Error ? error.message : "পণ্য মুছে ফেলতে সমস্যা হয়েছে";
    return { success: false, error: message };
  }
}

export async function createProductTransactionAction(input: ProductTransactionInput): Promise<{
  success: boolean;
  data?: ProductTransaction;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: "অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।" };
    }

    const created = await createProductTransaction(input);
    revalidatePath(`/dashboard/products/${input.product_id}`);
    revalidatePath("/dashboard/products");
    revalidatePath("/dashboard");
    return { success: true, data: created };
  } catch (error: unknown) {
    console.error("createProductTransactionAction error:", error);
    const message = error instanceof Error ? error.message : "লেনদেন যোগ করতে সমস্যা হয়েছে";
    return { success: false, error: message };
  }
}

export async function updateProductTransactionAction(
  id: string,
  productId: string,
  input: Partial<ProductTransactionInput>
): Promise<{
  success: boolean;
  data?: ProductTransaction;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: "অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।" };
    }

    const updated = await updateProductTransaction(id, input);
    revalidatePath(`/dashboard/products/${productId}`);
    revalidatePath("/dashboard/products");
    revalidatePath("/dashboard");
    return { success: true, data: updated };
  } catch (error: unknown) {
    console.error("updateProductTransactionAction error:", error);
    const message = error instanceof Error ? error.message : "লেনদেন আপডেট করতে সমস্যা হয়েছে";
    return { success: false, error: message };
  }
}

export async function deleteProductTransactionAction(
  id: string,
  productId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: "অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।" };
    }

    await deleteProductTransaction(id);
    revalidatePath(`/dashboard/products/${productId}`);
    revalidatePath("/dashboard/products");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: unknown) {
    console.error("deleteProductTransactionAction error:", error);
    const message = error instanceof Error ? error.message : "লেনদেন মুছে ফেলতে সমস্যা হয়েছে";
    return { success: false, error: message };
  }
}
