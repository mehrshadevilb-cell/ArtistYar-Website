"use client";

import { PanelShell } from "@/components/PanelShell";

const nav = [
  { href: "/admin", label: "گزارش امروز" },
  { href: "/admin/payments", label: "پرداخت‌ها" },
  { href: "/admin/reservations", label: "رزروها" },
  { href: "/admin/videos", label: "مدیریت ویدیوها" },
  { href: "/admin/students", label: "هنرجویان" },
  { href: "/admin/media", label: "مدیریت محتوا" },
  { href: "/admin/ai", label: "AI Agent" },
  { href: "/admin/system", label: "وضعیت سیستم" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <PanelShell title="Admin Panel" nav={nav}>
      {children}
    </PanelShell>
  );
}
