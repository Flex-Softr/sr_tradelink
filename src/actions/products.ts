"use server";

import { revalidatePath } from "next/cache";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import {
  type Product,
  type ProductInput,
  createProduct,
  deleteProduct,
  getProducts,
  updateProduct,
} from "@/lib/products";

export async function fetchProductsAction(options: { search?: string; badge?: string } = {}) {
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
    return { success: true };
  } catch (error: unknown) {
    console.error("deleteProductAction error:", error);
    const message = error instanceof Error ? error.message : "পণ্য মুছে ফেলতে সমস্যা হয়েছে";
    return { success: false, error: message };
  }
}
