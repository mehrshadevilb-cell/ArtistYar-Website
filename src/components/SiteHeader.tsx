"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowUpLeft, Bot } from "lucide-react";
import { BrandMark } from "./BrandMark";
import { useAuth } from "./AuthProvider";
import { ThemeToggle } from "./ThemeToggle";
import { SafeLink } from "./SafeLink";

const primaryLinks = [
  { href: "/courses", label: "مسیرهای آموزشی" },
  { href: "/online", label: "کلاس آنلاین" },
  { href: "/assistant", label: "راه‌یار AI" },
  { href: "/free-player", label: "آموزش رایگان" },
  { href: "/practice", label: "تمرین‌خانه" },
  { href: "/gallery", label: "گالری خروجی‌ها" },
];

const moreLinks = [
  { href: "/about", label: "درباره آکادمی" },
  { href: "/#flow", label: "مسیر هنرجو" },
  { href: "/#projects", label: "نمونه‌کارها" },
  { href: "/#feedback", label: "بازخورد هنرجوها" },
  { href: "/#faq", label: "سؤالات متداول" },
  { href: "/#quick-consultation", label: "مشاوره رایگان" },
  { href: "/#contact", label: "ارتباط" },
  { href: "/track", label: "پیگیری سفارش" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user, ready } = useAuth();
  const panelHref = user?.role === "admin" ? "/admin" : "/panel";

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <header className="site-header sticky top-0 z-50">
      <div className="container-ay flex min-h-[64px] items-center justify-between gap-3">
        <Link
          href="/"
          className="ay-pressable shrink-0 transition-opacity hover:opacity-80"
          onClick={() => setOpen(false)}
        >
          <BrandMark />
        </Link>

        <nav aria-label="ناوبری اصلی" className="hidden items-center gap-0.5 lg:flex">
          {primaryLinks.map((link) => (
            <SafeLink
              key={link.href}
              href={link.href}
              hard={link.href === "/courses" || link.href === "/assistant"}
              className={`nav-link ${pathname === link.href ? "nav-link-active" : ""}`}
              aria-current={pathname === link.href ? "page" : undefined}
            >
              {link.label}
            </SafeLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2.5 md:flex">
          <ThemeToggle />
          <SafeLink
            href="/assistant"
            hard
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium text-gold-400 transition hover:bg-white/[0.05] hover:text-gold-300"
          >
            <Bot size={14} aria-hidden />
            راه‌یار AI
          </SafeLink>
          {ready && user ? (
            <Link href={panelHref} className="btn-ghost !px-4 !py-2 text-xs">
              پنل من
            </Link>
          ) : (
            <Link href="/login" className="btn-ghost !px-4 !py-2 text-xs">
              ورود
            </Link>
          )}
          <a href="mailto:hello@artistyar.dev" className="header-contact">
            مشاوره رایگان <ArrowUpLeft size={14} aria-hidden="true" />
          </a>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <button
            type="button"
            aria-label={open ? "بستن منو" : "باز کردن منو"}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            className="menu-button ay-pressable"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div
        id="mobile-navigation"
        className={`mobile-menu lg:hidden ${open ? "mobile-menu-open" : ""}`}
        aria-hidden={!open}
      >
        <nav
          aria-label="ناوبری موبایل"
          className="container-ay flex max-h-[min(70dvh,32rem)] flex-col gap-0.5 overflow-y-auto overscroll-contain py-4 pb-[max(1rem,var(--tg-safe-bottom))]"
        >
          {[...primaryLinks, ...moreLinks].map((link) => (
            <SafeLink
              key={link.href}
              href={link.href}
              hard={link.href === "/courses" || link.href === "/assistant"}
              onClick={() => setOpen(false)}
              className="mobile-nav-link"
            >
              {link.label}
            </SafeLink>
          ))}
          {ready && user ? (
            <Link href={panelHref} onClick={() => setOpen(false)} className="mobile-nav-link">
              پنل من
            </Link>
          ) : (
            <Link href="/login" onClick={() => setOpen(false)} className="mobile-nav-link">
              ورود هنرجو
            </Link>
          )}
          <SafeLink
            href="/assistant"
            hard
            onClick={() => setOpen(false)}
            className="btn-primary mt-3 flex items-center justify-center gap-2 text-center"
          >
            <Bot size={16} aria-hidden />
            سؤال از راه‌یار AI
          </SafeLink>
        </nav>
      </div>
    </header>
  );
}
