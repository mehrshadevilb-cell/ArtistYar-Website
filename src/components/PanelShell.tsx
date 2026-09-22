"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { CommunityLinks } from "./CommunityLinks";

type NavItem = { href: string; label: string };

export function PanelShell({
  title,
  nav,
  children,
  subtitle,
  showCommunity = true,
}: {
  title: string;
  nav: NavItem[];
  children: React.ReactNode;
  /** Optional description under the greeting. Defaults to student copy. */
  subtitle?: string;
  /** Hide community links (useful for admin). Default true. */
  showCommunity?: boolean;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const isAdmin = title.includes("ادمین") || pathname.startsWith("/admin");
  const greetingName = user?.fullName || user?.username || (isAdmin ? "ادمین" : "هنرجو");
  const description =
    subtitle ??
    (isAdmin
      ? "مدیریت هنرجویان، محتوا، پرداخت‌ها و سیستم از این پنل انجام می‌شود."
      : "دوره‌ها، رزروها و همگام‌سازی حسابت با راه‌یار از این‌جا مدیریت می‌شود.");

  return (
    <div className="container-ay panel-stage py-10 sm:py-12">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="panel-heading">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold-500">{title}</p>
          <h1 className="mt-2 text-balance text-2xl font-semibold tracking-tight text-sand-50 sm:text-3xl">
            سلام، {greetingName}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-7 text-ink-400">{description}</p>
        </div>
        <button type="button" onClick={logout} className="btn-ghost min-h-11 !py-2 text-xs">
          خروج
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="card-ay panel-nav h-fit p-3 lg:sticky lg:top-24">
          <nav aria-label={isAdmin ? "ناوبری پنل ادمین" : "ناوبری پنل هنرجو"} className="flex flex-col gap-1">
            {nav.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/panel" &&
                  item.href !== "/admin" &&
                  pathname.startsWith(`${item.href}/`));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`ay-pressable rounded-xl px-3 py-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 ${
                    active
                      ? "bg-gold-500/15 text-gold-300"
                      : "text-ink-300 hover:bg-white/[0.04] hover:text-sand-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          {showCommunity && (
            <div className="mt-4 border-t border-white/[0.06] pt-4">
              <p className="px-2 text-[10px] font-medium uppercase tracking-[0.16em] text-ink-500">جامعه</p>
              <div className="mt-3 px-1">
                <CommunityLinks variant="pills" />
              </div>
            </div>
          )}
        </aside>
        <div className="panel-content min-w-0">{children}</div>
      </div>
    </div>
  );
}
