"use server";

import { revalidatePath } from "next/cache";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import {
  type CreateUserInput,
  type GetUsersOptions,
  type PaginatedUsersResult,
  type SafeUser,
  type UpdateUserInput,
  createUser,
  deleteUser,
  getUsers,
  updateUser,
} from "@/lib/users";

export async function fetchUsersAction(
  options: GetUsersOptions = {}
): Promise<PaginatedUsersResult> {
  return await getUsers(options);
}

export async function createUserAction(input: CreateUserInput): Promise<{
  success: boolean;
  data?: SafeUser;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: "অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।" };
    }

    const created = await createUser(input);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/users");
    return { success: true, data: created };
  } catch (error: unknown) {
    console.error("createUserAction error:", error);
    const message = error instanceof Error ? error.message : "ব্যবহারকারী যোগ করতে সমস্যা হয়েছে";
    return { success: false, error: message };
  }
}

export async function updateUserAction(
  id: string,
  input: UpdateUserInput
): Promise<{
  success: boolean;
  data?: SafeUser;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: "অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।" };
    }

    const updated = await updateUser(id, input);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/users");
    return { success: true, data: updated };
  } catch (error: unknown) {
    console.error("updateUserAction error:", error);
    const message = error instanceof Error ? error.message : "ব্যবহারকারী আপডেট করতে সমস্যা হয়েছে";
    return { success: false, error: message };
  }
}

export async function deleteUserAction(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: "অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।" };
    }

    const currentUserId = (session.user as { id?: string }).id;
    await deleteUser(id, currentUserId);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/users");
    return { success: true };
  } catch (error: unknown) {
    console.error("deleteUserAction error:", error);
    const message = error instanceof Error ? error.message : "ব্যবহারকারী মুছে ফেলতে ব্যর্থ হয়েছে";
    return { success: false, error: message };
  }
}
