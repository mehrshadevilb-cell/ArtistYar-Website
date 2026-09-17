"use client";

import { RequireAuth } from "@/components/RequireAuth";
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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth role="admin">
      <PanelShell title="Admin Panel" nav={nav}>
        {children}
      </PanelShell>
    </RequireAuth>
  );
}
