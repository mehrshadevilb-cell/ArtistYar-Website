"use client";

import { PanelShell } from "@/components/PanelShell";

const nav = [
  { href: "/admin", label: "گزارش امروز" },
  { href: "/admin/payments", label: "پرداخت‌ها" },
  { href: "/admin/practice/subscriptions", label: "اشتراک Practice Pro" },
  { href: "/admin/reservations", label: "رزروها" },
  { href: "/admin/content", label: "مدیریت محتوا" },
  { href: "/admin/students", label: "هنرجویان" },
  { href: "/admin/enrollments", label: "کلاس‌ها و ثبت‌نام‌ها" },
  { href: "/admin/analytics", label: "تحلیل و آمار" },
  { href: "/admin/ai", label: "Admin AI Assistant" },
  { href: "/admin/music-generator", label: "AI Music Generator" },
  { href: "/admin/system", label: "وضعیت سیستم" },
  { href: "/admin/settings", label: "تنظیمات پیشرفته" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <PanelShell title="پنل ادمین" nav={nav}>
      {children}
    </PanelShell>
  );
}
