"use client";

import { useState } from "react";

import Image from "next/image";
import Link from "next/link";

import { RiArrowLeftLine, RiLoader4Line, RiMailLine } from "@remixicon/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "An error occurred");
      }

      setStatus("success");
      setMessage("পাসওয়ার্ড রিসেট লিঙ্ক আপনার ইমেইলে পাঠানো হয়েছে।");
    } catch (err: unknown) {
      setStatus("error");
      setMessage(
        err instanceof Error ? err.message : "পাসওয়ার্ড রিসেট লিঙ্ক পাঠাতে সমস্যা হয়েছে।"
      );
    }
  }

  return (
    <div className="relative flex min-h-[85vh] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="via-background to-background absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-100/50 dark:from-green-950/20" />
      <div className="w-full max-w-md space-y-6">
        <div>
          <Link
            href="/login"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
          >
            <RiArrowLeftLine className="size-4" />
            লগইন পেজে ফিরে যান
          </Link>
        </div>

        <Card className="border-border/60 shadow-xl backdrop-blur-sm">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto flex justify-center">
              <div className="ring-primary/20 relative size-14 overflow-hidden rounded-full shadow-md ring-2">
                <Image
                  src="/images/sr-logo.jpeg"
                  alt="SR Tradelink Logo"
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </div>
            </div>
            <div className="space-y-1">
              <CardTitle className="text-foreground text-2xl font-bold tracking-tight">
                পাসওয়ার্ড ভুলে গেছেন?
              </CardTitle>
              <CardDescription className="text-muted-foreground text-sm">
                আপনার ইমেইল দিন, আমরা একটি পাসওয়ার্ড রিসেট লিঙ্ক পাঠাবো।
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-2">
            {status === "error" && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
                {message}
              </div>
            )}

            {status === "success" && (
              <div className="rounded-md bg-green-50 p-3 text-sm text-green-600 dark:bg-green-950/50 dark:text-green-400">
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="font-medium">
                  ইমেইল ঠিকানা <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <div className="text-muted-foreground pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <RiMailLine className="size-4.5" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    required
                    disabled={status === "loading" || status === "success"}
                    placeholder="admin@srtradelink.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={status === "loading" || status === "success" || !email}
                className="w-full text-base font-semibold"
              >
                {status === "loading" ? (
                  <>
                    <RiLoader4Line className="mr-2 size-4 animate-spin" />
                    পাঠানো হচ্ছে...
                  </>
                ) : (
                  "রিসেট লিঙ্ক পাঠান"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
