"use client";

import { useState, useTransition } from "react";

import Image from "next/image";
import Link from "next/link";

import {
  RiArrowRightLine,
  RiCalendarLine,
  RiCheckDoubleLine,
  RiCheckLine,
  RiCloseCircleLine,
  RiCloseLine,
  RiErrorWarningLine,
  RiEyeLine,
  RiEyeOffLine,
  RiKeyLine,
  RiLoader4Line,
  RiLockPasswordLine,
  RiLogoutBoxRLine,
  RiMailLine,
  RiSaveLine,
  RiShieldCheckLine,
  RiShieldUserLine,
  RiUser3Line,
  RiUserSettingsLine,
} from "@remixicon/react";
import { signOut } from "next-auth/react";

import { changePasswordAction, updateAccountProfileAction } from "@/actions/account";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SafeUser } from "@/lib/users";
import { cn, sanitizeImageUrl } from "@/lib/utils";

interface AccountManagementProps {
  initialUser: SafeUser;
}

export default function AccountManagement({ initialUser }: AccountManagementProps) {
  const [user, setUser] = useState<SafeUser>(initialUser);

  // Profile Form State
  const [profileName, setProfileName] = useState(initialUser.name || "");
  const [profileImage, setProfileImage] = useState(initialUser.image || "");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [isProfilePending, startProfileTransition] = useTransition();

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isPasswordPending, startPasswordTransition] = useTransition();

  const userInitial = user.name ? user.name.charAt(0).toUpperCase() : "A";
  const roleName = user.role?.toUpperCase() || "USER";
  const isAdmin = user.role?.toLowerCase() === "admin";

  const formattedJoinDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString("bn-BD", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "উপলব্ধ নয়";

  const safeAvatar = sanitizeImageUrl(profileImage || user.image);

  // Handle Profile Update
  function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    if (!profileName.trim()) {
      setProfileError("ব্যবহারকারীর নাম খালি রাখা যাবে না।");
      return;
    }

    startProfileTransition(async () => {
      const res = await updateAccountProfileAction({
        name: profileName.trim(),
        image: profileImage.trim() || null,
      });

      if (res.success && res.data) {
        setUser(res.data);
        setProfileSuccess(res.message || "প্রোফাইল তথ্য সফলভাবে সংরক্ষণ করা হয়েছে!");
      } else {
        setProfileError(res.error || "প্রোফাইল আপডেট করতে সমস্যা হয়েছে।");
      }
    });
  }

  // Handle Password Change
  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError("অনুগ্রহ করে আপনার বর্তমান পাসওয়ার্ড প্রদান করুন।");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setPasswordError("নতুন পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে।");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("নতুন পাসওয়ার্ড এবং নিশ্চিতকরণ পাসওয়ার্ড মিলছে না।");
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError("নতুন পাসওয়ার্ড বর্তমান পাসওয়ার্ড থেকে ভিন্ন হতে হবে।");
      return;
    }

    startPasswordTransition(async () => {
      const res = await changePasswordAction({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (res.success) {
        setPasswordSuccess(res.message || "পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordError(res.error || "পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে।");
      }
    });
  }

  return (
    <div className="space-y-6 pb-12">
      {/* ======================================================== */}
      {/* 1. TOP HERO / PROFILE BANNER */}
      {/* ======================================================== */}
      <Card className="border-border/70 overflow-hidden shadow-sm">
        <div className="bg-linear-to-r from-emerald-800 via-green-700 to-teal-800 p-6 text-white sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="relative size-18 shrink-0 overflow-hidden rounded-full border-3 border-white/30 bg-white/10 shadow-lg sm:size-20">
                {safeAvatar ? (
                  <Image
                    src={safeAvatar}
                    alt={user.name || "User Avatar"}
                    fill
                    sizes="80px"
                    className="object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <Avatar size="lg" className="size-full">
                    <AvatarFallback className="bg-emerald-950/80 text-2xl font-bold text-white">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                    {user.name || "অজ্ঞাত ব্যবহারকারী"}
                  </h1>
                  <Badge
                    variant="secondary"
                    className="bg-white/20 px-2.5 py-0.5 text-xs font-semibold text-white uppercase backdrop-blur-md"
                  >
                    <RiShieldUserLine className="mr-1 inline size-3.5" />
                    {roleName}
                  </Badge>
                </div>
                <p className="flex items-center gap-1.5 text-xs text-emerald-100/90 sm:text-sm">
                  <RiMailLine className="size-4 shrink-0" />
                  <span>{user.email}</span>
                </p>
                <p className="flex items-center gap-1.5 text-xs text-emerald-200/80">
                  <RiCalendarLine className="size-3.5 shrink-0" />
                  <span>যোগদানের তারিখ: {formattedJoinDate}</span>
                </p>
              </div>
            </div>

            {/* Quick Actions in Banner */}
            <div className="flex flex-wrap items-center gap-2 sm:self-center">
              {isAdmin && (
                <Link href="/dashboard/users">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-white/30 bg-white/10 text-white hover:bg-white hover:text-emerald-900"
                  >
                    <RiUserSettingsLine className="size-4" />
                    <span>সকল ব্যবহারকারী</span>
                  </Button>
                </Link>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="gap-1.5 border-white/30 bg-white/10 text-white hover:bg-rose-600 hover:text-white"
              >
                <RiLogoutBoxRLine className="size-4" />
                <span>লগআউট</span>
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* ======================================================== */}
      {/* 2. MAIN FORMS (GRID: PASSWORD & PROFILE) */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Password Change (7 cols) */}
        <div className="space-y-6 lg:col-span-7">
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="border-border/40 border-b pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <RiLockPasswordLine className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-lg text-slate-900 dark:text-white">
                    পাসওয়ার্ড পরিবর্তন (Change Password)
                  </CardTitle>
                  <CardDescription>
                    আপনার অ্যাকাউন্টের নিরাপত্তা নিশ্চিত করতে নিয়মিত পাসওয়ার্ড পরিবর্তন করুন
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              {/* Error Alert */}
              {passwordError && (
                <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                  <RiCloseCircleLine className="mt-0.5 size-5 shrink-0 text-rose-600 dark:text-rose-400" />
                  <div className="flex-1 font-medium">{passwordError}</div>
                  <button
                    type="button"
                    onClick={() => setPasswordError(null)}
                    className="text-rose-500 hover:text-rose-700"
                  >
                    <RiCloseLine className="size-4" />
                  </button>
                </div>
              )}

              {/* Success Alert */}
              {passwordSuccess && (
                <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <RiCheckDoubleLine className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div className="flex-1 font-medium">{passwordSuccess}</div>
                  <button
                    type="button"
                    onClick={() => setPasswordSuccess(null)}
                    className="text-emerald-500 hover:text-emerald-700"
                  >
                    <RiCloseLine className="size-4" />
                  </button>
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-4.5">
                {/* Current Password */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="current-password"
                    className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    বর্তমান পাসওয়ার্ড (Current Password) <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="আপনার বর্তমান পাসওয়ার্ড দিন"
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword((prev) => !prev)}
                      className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      aria-label={showCurrentPassword ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখুন"}
                    >
                      {showCurrentPassword ? (
                        <RiEyeOffLine className="size-4" />
                      ) : (
                        <RiEyeLine className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="new-password"
                    className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    নতুন পাসওয়ার্ড (New Password) <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="ন্যূনতম ৬ অক্ষরের নতুন পাসওয়ার্ড দিন"
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      aria-label={showNewPassword ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখুন"}
                    >
                      {showNewPassword ? (
                        <RiEyeOffLine className="size-4" />
                      ) : (
                        <RiEyeLine className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="confirm-password"
                    className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    নতুন পাসওয়ার্ড নিশ্চিত করুন (Confirm Password){" "}
                    <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="নতুন পাসওয়ার্ডটি পুনরায় লিখুন"
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      aria-label={showConfirmPassword ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখুন"}
                    >
                      {showConfirmPassword ? (
                        <RiEyeOffLine className="size-4" />
                      ) : (
                        <RiEyeLine className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Password Requirements Guide */}
                <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3 text-xs dark:border-slate-800 dark:bg-slate-900/50">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    নিরাপদ পাসওয়ার্ডের নির্দেশিকা:
                  </span>
                  <ul className="mt-1.5 space-y-1 text-slate-600 dark:text-slate-400">
                    <li className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          newPassword.length >= 6 ? "bg-emerald-500" : "bg-slate-300"
                        )}
                      />
                      <span>ন্যূনতম ৬ অক্ষর বা তার বেশি</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          newPassword && confirmPassword && newPassword === confirmPassword
                            ? "bg-emerald-500"
                            : "bg-slate-300"
                        )}
                      />
                      <span>উভয় পাসওয়ার্ডের মিল থাকা আবশ্যক</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={isPasswordPending || !currentPassword || !newPassword}
                    className="w-full gap-2 bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 sm:w-auto"
                  >
                    {isPasswordPending ? (
                      <RiLoader4Line className="size-4 animate-spin" />
                    ) : (
                      <RiKeyLine className="size-4" />
                    )}
                    <span>পাসওয়ার্ড আপডেট করুন</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Profile & Security Summary (5 cols) */}
        <div className="space-y-6 lg:col-span-5">
          {/* Profile Edit Card */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="border-border/40 border-b pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                  <RiUser3Line className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-lg text-slate-900 dark:text-white">
                    প্রোফাইল তথ্য (Profile Info)
                  </CardTitle>
                  <CardDescription>আপনার প্রদর্শিত নাম ও প্রোফাইল ছবি আপডেট করুন</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              {/* Error Alert */}
              {profileError && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                  <RiErrorWarningLine className="size-4 shrink-0 text-rose-600" />
                  <span>{profileError}</span>
                </div>
              )}

              {/* Success Alert */}
              {profileSuccess && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <RiCheckLine className="size-4 shrink-0 text-emerald-600" />
                  <span>{profileSuccess}</span>
                </div>
              )}

              <form onSubmit={handleProfileSubmit} className="space-y-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="profile-name"
                    className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    পূর্ণ নাম (Full Name) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="profile-name"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="আপনার নাম লিখুন"
                    required
                  />
                </div>

                {/* Email Address (Read-only) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="profile-email"
                      className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      ইমেইল ঠিকানা (Email)
                    </Label>
                    <span className="text-[11px] text-slate-400">অপরিবর্তনীয়</span>
                  </div>
                  <Input
                    id="profile-email"
                    value={user.email}
                    disabled
                    className="cursor-not-allowed bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  />
                </div>

                {/* Avatar Image URL */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="profile-image"
                    className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    প্রোফাইল ছবির লিঙ্ক (Avatar URL)
                  </Label>
                  <Input
                    id="profile-image"
                    value={profileImage}
                    onChange={(e) => setProfileImage(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                  />
                  <p className="text-[11px] text-slate-400">
                    সরাসরি ওয়েব ইমেজ লিঙ্ক ব্যবহার করুন (ঐচ্ছিক)
                  </p>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={isProfilePending || !profileName.trim()}
                    className="w-full gap-2 bg-slate-900 text-white shadow-xs hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                  >
                    {isProfilePending ? (
                      <RiLoader4Line className="size-4 animate-spin" />
                    ) : (
                      <RiSaveLine className="size-4" />
                    )}
                    <span>প্রোফাইল সংরক্ষণ করুন</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Security & System Info */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <RiShieldCheckLine className="size-5 text-emerald-600 dark:text-emerald-400" />
                <CardTitle className="text-base text-slate-900 dark:text-white">
                  নিরাপত্তা ও সেশন স্থিতি
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">এনক্রিপশন অ্যালগরিদম</span>
                <Badge variant="outline" className="font-mono text-[11px] text-emerald-700">
                  Argon2id (Cryptographic Salt)
                </Badge>
              </div>

              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">ভূমিকা ও অধিকার</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{roleName}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">সেশন স্থিতি</span>
                <div className="flex items-center gap-1.5 font-medium text-emerald-600">
                  <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
                  <span>সক্রিয় (Active)</span>
                </div>
              </div>

              {isAdmin && (
                <div className="pt-2">
                  <Link
                    href="/dashboard/users"
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <span className="font-medium">সকল ব্যবহারকারী অ্যাকাউন্ট পরিচালনা</span>
                    <RiArrowRightLine className="size-4" />
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
