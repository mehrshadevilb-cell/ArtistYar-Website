"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";

export type PracticeAccess = {
  loading: boolean;
  pro: boolean;
  stageLimit: number; // 0 means unlimited for Pro.
  subscriptionDays: number;
  proExpiresAt: string | null;
};

export function usePracticeAccess() {
  const { user } = useAuth();
  const [access, setAccess] = useState<PracticeAccess>({
    loading: true,
    pro: user?.role === "admin",
    stageLimit: user?.role === "admin" ? 0 : 5,
    subscriptionDays: 0,
    proExpiresAt: null,
  });

  useEffect(() => {
    if (user?.role === "admin") {
      setAccess({ loading: false, pro: true, stageLimit: 500, subscriptionDays: 500, proExpiresAt: null });
      return;
    }

    const params = new URLSearchParams();
    if (user?.id) params.set("userId", user.id);
    if (user?.telegramId) params.set("telegramId", String(user.telegramId));

    let cancelled = false;
    fetch("/api/practice/status" + (params.toString() ? "?" + params.toString() : ""), {
      cache: "no-store",
      credentials: "include",
    })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setAccess({
          loading: false,
          pro: Boolean(d?.pro),
          stageLimit: Math.max(1, Number(d?.stageLimit) || 5),
          subscriptionDays: Math.max(0, Number(d?.subscriptionDays) || 0),
          proExpiresAt: d?.proExpiresAt || null,
        });
      })
      .catch(() => {
        if (!cancelled) setAccess({ loading: false, pro: false, stageLimit: 5, subscriptionDays: 0, proExpiresAt: null });
      });

    return () => { cancelled = true; };
  }, [user?.id, user?.role, user?.telegramId]);

  return { user, ...access };
}
