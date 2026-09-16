"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import type { UserRole } from "@/lib/auth";

export function RequireAuth({
  children,
  role,
}: {
  children: React.ReactNode;
  role?: UserRole;
}) {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (role && user.role !== role) {
      router.replace(user.role === "admin" ? "/admin" : "/panel");
    }
  }, [ready, user, role, router]);

  if (!ready || !user) {
    return (
      <div className="container-ay py-24 text-center text-sm text-ink-400">
        در حال بررسی نشست...
      </div>
    );
  }
  if (role && user.role !== role) return null;
  return <>{children}</>;
}
