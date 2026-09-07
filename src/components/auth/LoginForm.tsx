"use client";

import { useState } from "react";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import {
  RiArrowLeftLine,
  RiEyeCloseLine,
  RiEyeLine,
  RiLoader4Line,
  RiLockLine,
  RiMailLine,
  RiShieldUserLine,
} from "@remixicon/react";
import { signIn } from "next-auth/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
        callbackUrl,
      });

      if (res?.error) {
        setError(res.error || "ভুল ইমেইল অথবা পাসওয়ার্ড। আবার চেষ্টা করুন।");
        setIsLoading(false);
      } else if (res?.ok) {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("লগইনে সমস্যা হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।");
      setIsLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-[85vh] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      {/* Background Ambience */}
      <div className="via-background to-background absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-100/50 dark:from-green-950/20" />

      <div className="w-full max-w-md space-y-6">
        {/* Back Link */}
        <div>
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
          >
            <RiArrowLeftLine className="size-4" />
            ওয়েবসাইটে ফিরে যান
          </Link>
        </div>

        {/* Login Card */}
        <Card className="border-border/60 shadow-xl backdrop-blur-sm">
          <CardHeader className="space-y-3 text-center">
            {/* Logo */}
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
                অ্যাডমিন পোর্টাল
              </CardTitle>
              <CardDescription className="text-muted-foreground text-sm">
                সিস্টেম ম্যানেজমেন্টের জন্য আপনার অ্যাকাউন্টে লগইন করুন
              </CardDescription>
            </div>

            {/* Registration status badge */}
            <div className="flex justify-center pt-1">
              <Badge
                variant="outline"
                className="border-primary/20 bg-primary/5 text-primary gap-1 py-1 text-xs"
              >
                <RiShieldUserLine className="size-3.5" />
                শুধুমাত্র অনুমোদিত অ্যাডমিন
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-2">
            {/* Error message banner */}
            {error && (
              <div
                role="alert"
                className="border-destructive/30 bg-destructive/10 text-destructive animate-in fade-in-50 rounded-lg border p-3 text-sm font-medium"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  ইমেইল ঠিকানা
                </Label>
                <div className="relative">
                  <div className="text-muted-foreground pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <RiMailLine className="size-4" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    placeholder="admin@srtradelink.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  পাসওয়ার্ড
                </Label>
                <div className="relative">
                  <div className="text-muted-foreground pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <RiLockLine className="size-4" />
                  </div>
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="pr-10 pl-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex items-center pr-3 transition-colors focus:outline-none"
                    aria-label={showPassword ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখুন"}
                  >
                    {showPassword ? (
                      <RiEyeCloseLine className="size-4" />
                    ) : (
                      <RiEyeLine className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-primary text-primary-foreground hover:bg-primary/90 w-full font-semibold transition-all"
              >
                {isLoading ? (
                  <>
                    <RiLoader4Line className="mr-2 size-4 animate-spin" />
                    লগইন হচ্ছে...
                  </>
                ) : (
                  "লগইন করুন"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
