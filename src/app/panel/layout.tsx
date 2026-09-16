"use client";

import { RequireAuth } from "@/components/RequireAuth";
import { PanelShell } from "@/components/PanelShell";

const nav = [
  { href: "/panel", label: "نمای کلی" },
  { href: "/panel/courses", label: "دوره‌های من" },
  { href: "/panel/reservations", label: "رزروها" },
  { href: "/panel/profile", label: "پروفایل و همگام‌سازی" },
];

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth role="student">
      <PanelShell title="Student Panel" nav={nav}>
        {children}
      </PanelShell>
    </RequireAuth>
  );
}
