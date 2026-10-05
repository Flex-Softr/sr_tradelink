"use client";

import { useState } from "react";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { RiEyeCloseLine, RiEyeLine, RiLoader4Line, RiLockLine } from "@remixicon/react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  if (!token) {
    return (
      <div className="flex min-h-[85vh] items-center justify-center px-4">
        <Card className="border-border/60 w-full max-w-md p-8 text-center shadow-xl">
          <h2 className="mb-4 text-xl font-bold">অবৈধ লিঙ্ক</h2>
          <p className="text-muted-foreground mb-6">পাসওয়ার্ড রিসেট লিঙ্কটি অবৈধ বা অনুপস্থিত।</p>
          <Link href="/forgot-password" className={buttonVariants({ variant: "default" })}>
            নতুন রিসেট লিঙ্ক অনুরোধ করুন
          </Link>
        </Card>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (password !== confirmPassword) {
      setStatus("error");
      setMessage("পাসওয়ার্ড মিলছে না।");
      return;
    }

    if (password.length < 6) {
      setStatus("error");
      setMessage("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "An error occurred");
      }

      setStatus("success");
      setMessage("পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে।");

      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err: unknown) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "পাসওয়ার্ড পরিবর্তন করতে সমস্যা হয়েছে।");
    }
  }

  return (
    <div className="relative flex min-h-[85vh] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="via-background to-background absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-100/50 dark:from-green-950/20" />
      <div className="w-full max-w-md space-y-6">
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
                নতুন পাসওয়ার্ড সেট করুন
              </CardTitle>
              <CardDescription className="text-muted-foreground text-sm">
                আপনার অ্যাকাউন্টের জন্য নতুন শক্তিশালী পাসওয়ার্ড প্রদান করুন।
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
                {message} লগইন পেজে রিডাইরেক্ট করা হচ্ছে...
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="password" className="font-medium">
                  নতুন পাসওয়ার্ড <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <div className="text-muted-foreground pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <RiLockLine className="size-4.5" />
                  </div>
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    disabled={status === "loading" || status === "success"}
                    placeholder="নতুন পাসওয়ার্ড"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10 pl-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex items-center pr-3 transition-colors focus:outline-none"
                  >
                    {showPassword ? (
                      <RiEyeCloseLine className="size-4.5" />
                    ) : (
                      <RiEyeLine className="size-4.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="font-medium">
                  পাসওয়ার্ড নিশ্চিত করুন <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <div className="text-muted-foreground pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <RiLockLine className="size-4.5" />
                  </div>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    required
                    disabled={status === "loading" || status === "success"}
                    placeholder="পাসওয়ার্ড পুনরায় লিখুন"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-10 pl-9"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={
                  status === "loading" || status === "success" || !password || !confirmPassword
                }
                className="w-full text-base font-semibold"
              >
                {status === "loading" ? (
                  <>
                    <RiLoader4Line className="mr-2 size-4 animate-spin" />
                    সংরক্ষণ করা হচ্ছে...
                  </>
                ) : (
                  "পাসওয়ার্ড পরিবর্তন করুন"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
