"use client";

import { RiLogoutBoxRLine } from "@remixicon/react";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";

export default function LogoutButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/50"
    >
      <RiLogoutBoxRLine className="size-4" />
      লগআউট
    </Button>
  );
}
