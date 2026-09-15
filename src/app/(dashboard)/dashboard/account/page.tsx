import { Metadata } from "next";
import { redirect } from "next/navigation";

import { getServerSession } from "next-auth";

import AccountManagement from "@/components/dashboard/AccountManagement";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SafeUser } from "@/lib/users";

export const metadata: Metadata = {
  title: "অ্যাকাউন্ট ও নিরাপত্তা ব্যবস্থাপনা | এস আর ট্রেডলিংক",
  description: "ব্যবহারকারীর প্রোফাইল তথ্য ও লগইন পাসওয়ার্ড পরিবর্তন",
};

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id && !session?.user?.email) {
    redirect("/login");
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
    redirect("/login");
  }

  const safeUser: SafeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    image: user.image,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };

  return <AccountManagement initialUser={safeUser} />;
}
