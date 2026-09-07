import { redirect } from "next/navigation";

import { getServerSession } from "next-auth";

import DashboardNavbar from "@/components/layout/DashboardNavbar";
import { authOptions } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login?callbackUrl=/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <DashboardNavbar user={session.user} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
