"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  ArrowUpLeft,
  Bot,
  ChevronDown,
  Wrench,
  LayoutDashboard,
  Gamepad2,
  GraduationCap,
  HelpCircle,
  Info,
} from "lucide-react";
import { BrandMark } from "./BrandMark";
import { useAuth } from "./AuthProvider";
import { ThemeToggle } from "./ThemeToggle";
import { SafeLink } from "./SafeLink";

const primaryNav = [
  { href: "/my-artistyar", label: "داشبورد", Icon: LayoutDashboard },
  { href: "/practice", label: "تمرین", Icon: Gamepad2 },
] as const;

const toolsItems = [
  { href: "/ai", label: "فضای AI" },
  { href: "/music-analyzer", label: "تحلیل موسیقی" },
  { href: "/ai-music", label: "تولید موسیقی" },
  { href: "/studio", label: "استودیو" },
  { href: "/separate", label: "جداسازی وکال" },
  { href: "/arrangement", label: "سفارش تنظیم" },
] as const;

const afterToolsNav = [
  { href: "/assistant", label: "راه‌یار AI", Icon: Bot, hard: true },
  { href: "/courses", label: "پکیج‌های آموزشی", Icon: GraduationCap, hard: false },
  { href: "/faq", label: "پرسش‌های متداول", Icon: HelpCircle, hard: false },
] as const;

const moreItems = [
  { href: "/about", label: "درباره آکادمی" },
  { href: "/online", label: "کلاس آنلاین" },
  { href: "/free-player", label: "آموزش رایگان" },
  { href: "/gallery", label: "گالری خروجی‌ها" },\n  { href: "/plugins", label: "VST و پلاگین‌ها" },
  { href: "/#feedback", label: "بازخورد هنرجوها" },
  { href: "/#quick-consultation", label: "مشاوره رایگان" },
  { href: "/track", label: "پیگیری سفارش" },
] as const;

function isActive(pathname: string, href: string) {
  if (href.startsWith("/#")) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { user, ready } = useAuth();
  const panelHref = user?.role === "admin" ? "/admin" : "/panel";

  useEffect(() => {
    setOpen(false);
    setToolsOpen(false);
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      menuButtonRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!toolsOpen && !moreOpen) return;
    const onPointer = (e: MouseEvent) => {
      const t = e.target as Node;
      if (toolsOpen && toolsRef.current && !toolsRef.current.contains(t)) setToolsOpen(false);
      if (moreOpen && moreRef.current && !moreRef.current.contains(t)) setMoreOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setToolsOpen(false);
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [toolsOpen, moreOpen]);

  const toolsActive = toolsItems.some((item) => isActive(pathname, item.href));

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
          {primaryNav.map(({ href, label, Icon }) => (
            <SafeLink
              key={href}
              href={href}
              className={`nav-link inline-flex items-center gap-1.5 ${
                isActive(pathname, href) ? "nav-link-active" : ""
              }`}
              aria-current={isActive(pathname, href) ? "page" : undefined}
            >
              <Icon size={14} aria-hidden className="opacity-70" />
              {label}
            </SafeLink>
          ))}

          <div className="relative" ref={toolsRef}>
            <button
              type="button"
              className={`nav-link inline-flex items-center gap-1.5 ${
                toolsActive || toolsOpen ? "nav-link-active" : ""
              }`}
              aria-expanded={toolsOpen}
              aria-haspopup="menu"
              onClick={() => {
                setToolsOpen((v) => !v);
                setMoreOpen(false);
              }}
            >
              <Wrench size={14} aria-hidden className="opacity-70" />
              ابزار
              <ChevronDown
                size={14}
                aria-hidden
                className={`transition-transform duration-200 ${toolsOpen ? "rotate-180" : ""}`}
              />
            </button>
            {toolsOpen ? (
              <div
                role="menu"
                className="nav-dropdown absolute top-full right-0 z-50 mt-1 min-w-[13rem] rounded-xl border border-white/10 bg-ink-950/95 p-1.5 shadow-xl backdrop-blur-xl"
              >
                {toolsItems.map((item) => (
                  <SafeLink
                    key={item.href}
                    href={item.href}
                    role="menuitem"
                    className={`block rounded-lg px-3 py-2 text-sm transition hover:bg-white/[0.06] hover:text-gold-300 ${
                      isActive(pathname, item.href) ? "text-gold-400" : "text-sand-100"
                    }`}
                    onClick={() => setToolsOpen(false)}
                  >
                    {item.label}
                  </SafeLink>
                ))}
              </div>
            ) : null}
          </div>

          {afterToolsNav.map(({ href, label, Icon, hard }) => (
            <SafeLink
              key={href}
              href={href}
              hard={hard}
              className={`nav-link inline-flex items-center gap-1.5 ${
                isActive(pathname, href) ? "nav-link-active" : ""
              }`}
              aria-current={isActive(pathname, href) ? "page" : undefined}
            >
              <Icon size={14} aria-hidden className="opacity-80" />
              {label}
            </SafeLink>
          ))}

          <div className="relative" ref={moreRef}>
            <button
              type="button"
              className={`nav-link inline-flex items-center gap-1.5 ${moreOpen ? "nav-link-active" : ""}`}
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              onClick={() => {
                setMoreOpen((v) => !v);
                setToolsOpen(false);
              }}
            >
              <Info size={14} aria-hidden className="opacity-70" />
              درباره آکادمی
              <ChevronDown
                size={14}
                aria-hidden
                className={`transition-transform duration-200 ${moreOpen ? "rotate-180" : ""}`}
              />
            </button>
            {moreOpen ? (
              <div
                role="menu"
                className="nav-dropdown absolute top-full left-0 z-50 mt-1 min-w-[13rem] rounded-xl border border-white/10 bg-ink-950/95 p-1.5 shadow-xl backdrop-blur-xl"
              >
                {moreItems.map((item) => (
                  <SafeLink
                    key={item.href + item.label}
                    href={item.href}
                    role="menuitem"
                    className={`block rounded-lg px-3 py-2 text-sm transition hover:bg-white/[0.06] hover:text-gold-300 ${
                      isActive(pathname, item.href) ? "text-gold-400" : "text-sand-100"
                    }`}
                    onClick={() => setMoreOpen(false)}
                  >
                    {item.label}
                  </SafeLink>
                ))}
              </div>
            ) : null}
          </div>
        </nav>

        <div className="hidden items-center gap-2.5 md:flex">
          <ThemeToggle />
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
            ref={menuButtonRef}
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
          {primaryNav.map(({ href, label, Icon }) => (
            <SafeLink
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              tabIndex={open ? 0 : -1}
              className="mobile-nav-link inline-flex items-center gap-2"
            >
              <Icon size={16} aria-hidden className="opacity-70" />
              {label}
            </SafeLink>
          ))}

          <p className="mobile-nav-group-label px-4 pb-1 pt-3 text-[10px] font-medium tracking-wider text-ink-500">
            ابزار
          </p>
          {toolsItems.map((item) => (
            <SafeLink
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              tabIndex={open ? 0 : -1}
              className="mobile-nav-link"
            >
              {item.label}
            </SafeLink>
          ))}

          {afterToolsNav.map(({ href, label, Icon, hard }) => (
            <SafeLink
              key={href}
              href={href}
              hard={hard}
              onClick={() => setOpen(false)}
              tabIndex={open ? 0 : -1}
              className="mobile-nav-link inline-flex items-center gap-2"
            >
              <Icon size={16} aria-hidden className="opacity-70" />
              {label}
            </SafeLink>
          ))}

          <p className="mobile-nav-group-label px-4 pb-1 pt-3 text-[10px] font-medium tracking-wider text-ink-500">
            درباره آکادمی
          </p>
          {moreItems.map((item) => (
            <SafeLink
              key={item.href + item.label}
              href={item.href}
              onClick={() => setOpen(false)}
              tabIndex={open ? 0 : -1}
              className="mobile-nav-link"
            >
              {item.label}
            </SafeLink>
          ))}

          {ready && user ? (
            <Link
              href={panelHref}
              onClick={() => setOpen(false)}
              tabIndex={open ? 0 : -1}
              className="mobile-nav-link"
            >
              پنل من
            </Link>
          ) : (
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              tabIndex={open ? 0 : -1}
              className="mobile-nav-link"
            >
              ورود هنرجو
            </Link>
          )}
          <SafeLink
            href="/assistant"
            hard
            onClick={() => setOpen(false)}
            tabIndex={open ? 0 : -1}
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
