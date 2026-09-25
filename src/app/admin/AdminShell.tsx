"use client";

import { PanelShell } from "@/components/PanelShell";
import { ADMIN_NAV } from "@/lib/admin/nav";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const nav = ADMIN_NAV.flatMap((group) =>
    group.items.filter((item) => item.enabled !== false).map((item) => ({
      href: item.href,
      label: item.label,
    })),
  );
  return <PanelShell title="پنل ادمین" nav={nav} showCommunity={false}>{children}</PanelShell>;
}
