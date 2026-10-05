import { Suspense } from "react";

import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getServerSession } from "next-auth";

import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import { authOptions } from "@/lib/auth";

export const metadata: Metadata = {
  title: "নতুন পাসওয়ার্ড সেট করুন | SR Tradelink",
  description: "আপনার নতুন পাসওয়ার্ড সেট করুন",
};

export default async function ResetPasswordPage() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/dashboard");
  }
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[85vh] items-center justify-center">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
