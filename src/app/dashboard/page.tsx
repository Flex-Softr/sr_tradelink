import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  RiArrowRightUpLine,
  RiCheckDoubleLine,
  RiDatabase2Line,
  RiGlobalLine,
  RiProductHuntLine,
  RiShieldCheckLine,
  RiUserStarLine,
} from "@remixicon/react";
import { getServerSession } from "next-auth";

import LogoutButton from "@/components/dashboard/LogoutButton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { products } from "@/data/products";
import { authOptions } from "@/lib/auth";

export const metadata: Metadata = {
  title: "ড্যাশবোর্ড | SR Tradelink Admin",
  description: "এসআর ট্রেডলিংক অ্যাডমিন ম্যানেজমেন্ট ড্যাশবোর্ড",
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const user = session.user;

  return (
    <div className="min-h-screen bg-slate-50/50 pt-24 pb-16 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Welcome Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-green-600/20 ring-inset dark:bg-green-950/50 dark:text-green-400 dark:ring-green-500/20">
                <RiUserStarLine className="mr-1 size-3.5" />
                অ্যাডমিন পোর্টাল
              </span>
              <Badge variant="outline" className="text-xs uppercase">
                {user?.role || "ADMIN"}
              </Badge>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              স্বাগতম, {user?.name || "অ্যাডমিন"}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              লগইন করা ইমেইল:{" "}
              <span className="font-medium text-slate-700 dark:text-slate-300">{user?.email}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RiGlobalLine className="size-4" />
              মূল ওয়েবসাইট দেখুন
            </Link>
            <LogoutButton />
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                মোট পণ্য (ক্যাটালগ)
              </CardTitle>
              <RiProductHuntLine className="size-5 text-green-600 dark:text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {products.length} টি
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                স্ট্যাটিক ডাটা মডিউলে সংরক্ষিত
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                অ্যাডমিন রোল
              </CardTitle>
              <RiShieldCheckLine className="size-5 text-blue-600 dark:text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {user?.role === "ADMIN" ? "Super Admin" : user?.role || "ADMIN"}
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                পূর্ণ সিস্টেম নিয়ন্ত্রণের ক্ষমতা
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                ডাটাবেস সংযোগ
              </CardTitle>
              <RiDatabase2Line className="size-5 text-purple-600 dark:text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
                MongoDB
                <span className="inline-flex size-2 rounded-full bg-green-500" />
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Prisma ORM এর মাধ্যমে সংযুক্ত
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                নিরাপত্তা এনক্রিপশন
              </CardTitle>
              <RiCheckDoubleLine className="size-5 text-emerald-600 dark:text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">Argon2id</div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                NextAuth JWT সেশন সুরক্ষিত
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Product Catalog Section */}
        <div className="mt-8">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                  পণ্যের তালিকা
                </CardTitle>
                <CardDescription>ওয়েবসাইটে প্রদর্শিত বর্তমান পণ্যসমূহের তালিকা</CardDescription>
              </div>
              <Link
                href="/#products"
                className="inline-flex items-center gap-1 text-sm font-medium text-green-700 hover:text-green-800 dark:text-green-400"
              >
                সাইটে দেখুন <RiArrowRightUpLine className="size-4" />
              </Link>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                  <thead className="bg-slate-100/75 text-xs text-slate-700 uppercase dark:bg-slate-900 dark:text-slate-400">
                    <tr>
                      <th scope="col" className="px-4 py-3">
                        ছবি ও নাম
                      </th>
                      <th scope="col" className="px-4 py-3">
                        বিবরণ
                      </th>
                      <th scope="col" className="px-4 py-3">
                        প্যাকেজিং / ওজন
                      </th>
                      <th scope="col" className="px-4 py-3">
                        ব্যাজ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {products.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="relative size-10 flex-shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100 dark:border-slate-800">
                              <Image
                                src={item.image}
                                alt={item.name}
                                fill
                                sizes="40px"
                                className="object-cover"
                              />
                            </div>
                            <span className="font-medium text-slate-900 dark:text-white">
                              {item.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                          {item.subtitle}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">
                          {item.price}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="text-xs">
                            {item.badge}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
