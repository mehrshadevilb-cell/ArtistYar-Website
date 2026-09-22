"use client";

import { RequireAuth } from "@/components/RequireAuth";
import { PanelShell } from "@/components/PanelShell";

const nav = [
  { href: "/my-artistyar", label: "My ArtistYar" },
  { href: "/learn", label: "مسیر یادگیری" },
  { href: "/practice", label: "تمرین" },
  { href: "/projects", label: "پروژه‌ها" },
  { href: "/files", label: "My Files" },
  { href: "/panel/courses", label: "دوره‌های من" },
  { href: "/panel/reservations", label: "رزروها" },
  { href: "/panel/profile", label: "پروفایل و همگام‌سازی" },
];

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth role="student">
      <PanelShell title="پنل هنرجو" nav={nav}>
        {children}
      </PanelShell>
    </RequireAuth>
  );
}
