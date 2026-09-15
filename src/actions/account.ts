"use server";

import { revalidatePath } from "next/cache";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import type { SafeUser } from "@/lib/users";
import { sanitizeImageUrl } from "@/lib/utils";

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UpdateProfileInput {
  name?: string | null;
  image?: string | null;
}

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Fetch the currently authenticated user's full profile details
 */
export async function getCurrentUserAccountAction(): Promise<ActionResult<SafeUser>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id && !session?.user?.email) {
      return { success: false, error: "অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।" };
    }

    const userId = session.user.id;
    const userEmail = session.user.email?.toLowerCase().trim();

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id: userId }, ...(userEmail ? [{ email: userEmail }] : [])],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!user) {
      return { success: false, error: "ব্যবহারকারী অ্যাকাউন্ট খুঁজে পাওয়া যায়নি।" };
    }

    return {
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    };
  } catch (error: unknown) {
    console.error("getCurrentUserAccountAction error:", error);
    const message =
      error instanceof Error ? error.message : "অ্যাকাউন্ট তথ্য লোড করতে সমস্যা হয়েছে";
    return { success: false, error: message };
  }
}

/**
 * Change the logged-in user's password with current password verification
 */
export async function changePasswordAction(
  input: ChangePasswordInput
): Promise<ActionResult<{ updated: boolean }>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id && !session?.user?.email) {
      return { success: false, error: "অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।" };
    }

    const { currentPassword, newPassword, confirmPassword } = input;

    if (!currentPassword?.trim()) {
      return { success: false, error: "বর্তমান পাসওয়ার্ড প্রদান করা আবশ্যক।" };
    }

    if (!newPassword || newPassword.trim().length < 6) {
      return {
        success: false,
        error: "নতুন পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে।",
      };
    }

    if (newPassword !== confirmPassword) {
      return {
        success: false,
        error: "নতুন পাসওয়ার্ড এবং নিশ্চিতকরণ পাসওয়ার্ড মিলছে না।",
      };
    }

    if (currentPassword === newPassword) {
      return {
        success: false,
        error: "নতুন পাসওয়ার্ড বর্তমান পাসওয়ার্ড থেকে ভিন্ন হতে হবে।",
      };
    }

    const userId = session.user.id;
    const userEmail = session.user.email?.toLowerCase().trim();

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id: userId }, ...(userEmail ? [{ email: userEmail }] : [])],
      },
    });

    if (!user) {
      return { success: false, error: "ব্যবহারকারী অ্যাকাউন্ট পাওয়া যায়নি।" };
    }

    // Verify current password against argon2 hash
    const isCurrentValid = await verifyPassword(currentPassword, user.password);
    if (!isCurrentValid) {
      return { success: false, error: "বর্তমান পাসওয়ার্ডটি সঠিক নয়।" };
    }

    // Hash new password using Argon2id
    const hashedNewPassword = await hashPassword(newPassword.trim());

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedNewPassword,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/account");
    revalidatePath("/dashboard/users");

    return {
      success: true,
      data: { updated: true },
      message: "আপনার পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে! ✅",
    };
  } catch (error: unknown) {
    console.error("changePasswordAction error:", error);
    const message =
      error instanceof Error ? error.message : "পাসওয়ার্ড পরিবর্তন করতে সমস্যা হয়েছে";
    return { success: false, error: message };
  }
}

/**
 * Update the logged-in user's profile information (Name, Avatar Image)
 */
export async function updateAccountProfileAction(
  input: UpdateProfileInput
): Promise<ActionResult<SafeUser>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id && !session?.user?.email) {
      return { success: false, error: "অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।" };
    }

    const userId = session.user.id;
    const userEmail = session.user.email?.toLowerCase().trim();

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id: userId }, ...(userEmail ? [{ email: userEmail }] : [])],
      },
    });

    if (!user) {
      return { success: false, error: "ব্যবহারকারী অ্যাকাউন্ট পাওয়া যায়নি।" };
    }

    const dataToUpdate: { name?: string | null; image?: string | null } = {};

    if (input.name !== undefined) {
      const cleanName = input.name?.trim();
      if (!cleanName) {
        return { success: false, error: "ব্যবহারকারীর নাম খালি রাখা যাবে না।" };
      }
      dataToUpdate.name = cleanName;
    }

    if (input.image !== undefined) {
      dataToUpdate.image = sanitizeImageUrl(input.image);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        created_at: true,
        updated_at: true,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/account");
    revalidatePath("/dashboard/users");

    return {
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        image: updated.image,
        created_at: updated.created_at,
        updated_at: updated.updated_at,
      },
      message: "প্রোফাইল তথ্য সফলভাবে আপডেট হয়েছে! ✅",
    };
  } catch (error: unknown) {
    console.error("updateAccountProfileAction error:", error);
    const message = error instanceof Error ? error.message : "প্রোফাইল আপডেট করতে সমস্যা হয়েছে";
    return { success: false, error: message };
  }
}
