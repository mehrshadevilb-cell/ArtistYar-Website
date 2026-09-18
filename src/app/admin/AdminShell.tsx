"use client";

import { PanelShell } from "@/components/PanelShell";

const nav = [
  { href: "/admin", label: "گزارش امروز" },
  { href: "/admin/payments", label: "پرداخت‌ها" },
  { href: "/admin/practice/subscriptions", label: "اشتراک Practice Pro" },
  { href: "/admin/reservations", label: "رزروها" },
  { href: "/admin/videos", label: "مدیریت ویدیوها" },
  { href: "/admin/students", label: "هنرجویان" },
  { href: "/admin/enrollments", label: "کلاس‌ها و ثبت‌نام‌ها" },
  { href: "/admin/analytics", label: "تحلیل و آمار" },
  { href: "/admin/media", label: "مدیریت محتوا" },
  { href: "/admin/free-education", label: "آموزش رایگان" },
  { href: "/admin/ai", label: "AI Agent" },
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
