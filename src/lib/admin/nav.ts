/**
 * Compact admin information architecture.
 * Top-level navigation intentionally stays small; deeper capabilities remain reachable
 * from the consolidated workspaces and existing deep links.
 */

export type AdminNavItem = {
  href: string;
  label: string;
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
    id: "dashboard",
    label: "مرکز کنترل",
    items: [{ href: "/admin", label: "پیشخوان" }],
  },
  {
    id: "users",
    label: "کاربران",
    items: [{ href: "/admin/users", label: "کاربران و آموزش" }],
  },
  {
    id: "business",
    label: "کسب‌وکار",
    items: [{ href: "/admin/commerce", label: "فروش و رزرو" }],
  },
  {
    id: "management",
    label: "مدیریت",
    items: [{ href: "/admin/manage", label: "مدیریت سایت و سیستم" }],
  },
];

export function enabledAdminRoutes(): AdminNavItem[] {
  return ADMIN_NAV.flatMap((group) => group.items.filter((item) => item.enabled !== false));
}

export function findNavLabel(pathname: string): string | null {
  const routes = enabledAdminRoutes();
  const exact = routes.find((route) => route.href === pathname);
  if (exact) return exact.label;
  if (pathname.startsWith("/admin/users")) return "کاربران و آموزش";
  if (pathname.startsWith("/admin/commerce")) return "فروش و رزرو";
  if (pathname.startsWith("/admin/manage")) return "مدیریت سایت و سیستم";
  return null;
}
