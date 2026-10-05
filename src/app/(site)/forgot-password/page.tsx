import { Suspense } from "react";

import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getServerSession } from "next-auth";

import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import { authOptions } from "@/lib/auth";

export const metadata: Metadata = {
  title: "পাসওয়ার্ড ভুলে গেছেন? | SR Tradelink",
  description: "পাসওয়ার্ড রিসেট করার অনুরোধ করুন",
};

export default async function ForgotPasswordPage() {
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
      <ForgotPasswordForm />
    </Suspense>
  );
}
