/**
 * Admin navigation information architecture.
 * Existing working routes stay enabled. Future modules are marked coming-soon.
 */

export type AdminNavItem = {
  href: string;
  label: string;
  /** When false, shown as disabled / coming soon */
  enabled?: boolean;
  badge?: string;
};

export type AdminNavGroup = {
  id: string;
  label: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    id: "core",
    label: "مرکز کنترل",
    items: [
      { href: "/admin", label: "نمای کلی" },
      { href: "/admin/problems", label: "مرکز مشکلات" },
      { href: "/admin/search", label: "جستجوی سراسری" },
    ],
  },
  {
    id: "users",
    label: "کاربران و CRM",
    items: [
      { href: "/admin/students", label: "هنرجویان" },
      { href: "/admin/enrollments", label: "ثبت‌نام‌های راه‌یار" },
      { href: "/admin/teachers", label: "مدرس‌ها", enabled: false },
      { href: "/admin/leads", label: "لیدها", enabled: false },
      { href: "/admin/support", label: "پشتیبانی", enabled: false },
    ],
  },
  {
    id: "classes",
    label: "کلاس‌ها",
    items: [
      { href: "/admin/classes", label: "کلاس‌ها" },
      { href: "/admin/classes/calendar", label: "تقویم کلاس‌ها" },
      { href: "/admin/homework", label: "تکالیف", enabled: false },
    ],
  },
  {
    id: "education",
    label: "آموزش",
    items: [
      { href: "/admin/content", label: "محتوا و آموزش" },
    ],
  },
  {
    id: "commerce",
    label: "تجارت",
    items: [
      { href: "/admin/commerce", label: "مرکز تجارت" },
      { href: "/admin/payments", label: "پرداخت‌ها" },
      { href: "/admin/reservations", label: "رزروها" },
      { href: "/admin/practice/subscriptions", label: "اشتراک Practice Pro" },
      { href: "/admin/orders", label: "سفارش‌ها", enabled: false },
      { href: "/admin/coupons", label: "کد تخفیف", enabled: false },
      { href: "/admin/finance", label: "مالی", enabled: false },
    ],
  },
  {
    id: "ai",
    label: "هوش مصنوعی",
    items: [
      { href: "/admin/ai", label: "راه‌یار (Admin AI)" },
      { href: "/admin/music-generator", label: "Music Generator" },
      { href: "/admin/ai/providers", label: "Providers", enabled: false },
      { href: "/admin/ai/models", label: "مدل‌ها", enabled: false },
      { href: "/admin/ai/prompts", label: "پرامپت‌ها", enabled: false },
      { href: "/admin/ai/usage", label: "مصرف", enabled: false },
    ],
  },
  {
    id: "insights",
    label: "بینش",
    items: [
      { href: "/admin/analytics", label: "تحلیل و آمار" },
      { href: "/admin/seo", label: "سئو" },
    ],
  },
  {
    id: "system",
    label: "سیستم",
    items: [
      { href: "/admin/system", label: "سلامت سیستم" },
      { href: "/admin/audit", label: "گزارش حسابرسی" },
      { href: "/admin/automation", label: "اتوماسیون" },
      { href: "/admin/settings", label: "تنظیمات" },
    ],
  },
];

/** Flat list of enabled routes for active-state detection and search. */
export function enabledAdminRoutes(): AdminNavItem[] {
  return ADMIN_NAV.flatMap((g) => g.items.filter((i) => i.enabled !== false));
}

export function findNavLabel(pathname: string): string | null {
  const routes = enabledAdminRoutes();
  const exact = routes.find((r) => r.href === pathname);
  if (exact) return exact.label;
  const prefix = routes
    .filter((r) => r.href !== "/admin" && pathname.startsWith(`${r.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return prefix?.label ?? null;
}
