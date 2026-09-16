"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowUpLeft } from "lucide-react";
import { BrandMark } from "./BrandMark";
import { useAuth } from "./AuthProvider";

const links = [
  { href: "/free-player", label: "آموزش رایگان" },
  { href: "/#about", label: "چرا آرتیست‌یار" },
  { href: "/#paths", label: "روش ما" },
  { href: "/#flow", label: "مسیر هنرجو" },
  { href: "/#courses", label: "دوره‌ها" },
  { href: "/#contact", label: "ارتباط" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user, ready } = useAuth();
  const panelHref = user?.role === "admin" ? "/admin" : "/panel";
  return (
    <header className="site-header sticky top-0 z-50">
      <div className="container-ay flex h-[76px] items-center justify-between gap-4">
        <Link href="/" className="shrink-0 transition-opacity hover:opacity-80" onClick={() => setOpen(false)}><BrandMark /></Link>
        <nav aria-label="ناوبری اصلی" className="hidden items-center gap-1 lg:flex">
          {links.slice(0, 5).map((link) => (
            <Link key={link.href} href={link.href} className={`nav-link ${pathname === "/" && link.href === "/#about" ? "nav-link-active" : ""}`} aria-current={pathname === "/" && link.href === "/#about" ? "page" : undefined}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <Link href="/track" className="text-xs text-ink-400 transition hover:text-gold-300">
            پیگیری سفارش
          </Link>
          {ready && user ? <Link href={panelHref} className="btn-ghost !px-4 !py-2 text-xs">پنل من</Link> : null}
          {!ready || !user ? <Link href="/login" className="btn-ghost !px-4 !py-2 text-xs">ورود</Link> : null}
          <a href="mailto:hello@artistyar.dev" className="header-contact">مشاوره و ارتباط <ArrowUpLeft size={14} aria-hidden="true" /></a>
        </div>
        <button type="button" aria-label={open ? "بستن منو" : "باز کردن منو"} aria-expanded={open} aria-controls="mobile-navigation" className="menu-button lg:hidden" onClick={() => setOpen(v => !v)}>{open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}</button>
      </div>
      <div id="mobile-navigation" className={`mobile-menu lg:hidden ${open ? "mobile-menu-open" : ""}`} aria-hidden={!open}>
        <nav aria-label="ناوبری موبایل" className="container-ay flex flex-col gap-1 py-5">
          {links.map(link => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="mobile-nav-link">{link.label}</Link>)}
          <Link href="/track" onClick={() => setOpen(false)} className="mobile-nav-link">پیگیری سفارش</Link>
          {ready && user ? <Link href={panelHref} onClick={() => setOpen(false)} className="mobile-nav-link">پنل من</Link> : <Link href="/login" onClick={() => setOpen(false)} className="mobile-nav-link">ورود هنرجو</Link>}
          <a href="mailto:hello@artistyar.dev" onClick={() => setOpen(false)} className="btn-primary mt-3 text-center">مشاوره و ارتباط</a>
        </nav>
      </div>
    </header>
  );
}
