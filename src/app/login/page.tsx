import { Suspense } from "react";

import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getServerSession } from "next-auth";

import LoginForm from "@/components/auth/LoginForm";
import { authOptions } from "@/lib/auth";

export const metadata: Metadata = {
  title: "লগইন | SR Tradelink",
  description: "এসআর ট্রেডলিংক অ্যাডমিন পোর্টাল লগইন",
};

export default async function LoginPage() {
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
      <LoginForm />
    </Suspense>
  );
}
