"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, ArrowUpLeft } from "lucide-react";
import { BrandMark } from "./BrandMark";
import { useAuth } from "./AuthProvider";

const links = [
  { href: "/#about", label: "چرا آرتیست‌یار" },
  { href: "/#paths", label: "روش ما" },
  { href: "/#courses", label: "دوره‌ها" },
  { href: "/#contact", label: "ارتباط" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user, ready } = useAuth();
  const panelHref = user?.role === "admin" ? "/admin" : "/panel";
  return (
    <header className="site-header sticky top-0 z-50">
      <div className="container-ay flex h-[76px] items-center justify-between gap-4">
        <Link href="/" className="shrink-0 transition-opacity hover:opacity-80" onClick={() => setOpen(false)}><BrandMark /></Link>
        <div className="hidden items-center gap-3 md:flex">
          {ready && user ? <Link href={panelHref} className="btn-ghost !px-4 !py-2 text-xs">پنل من</Link> : null}
          <a href="mailto:hello@artistyar.dev" className="header-contact">مشاوره و ارتباط <ArrowUpLeft size={14} /></a>
        </div>
        <button type="button" aria-label={open ? "بستن منو" : "باز کردن منو"} aria-expanded={open} className="menu-button" onClick={() => setOpen(v => !v)}>{open ? <X size={20} /> : <Menu size={20} />}</button>
      </div>
      <div className={`mobile-menu ${open ? "mobile-menu-open" : ""}`} aria-hidden={!open}>
        <nav className="container-ay flex flex-col gap-1 py-5">{links.map(link => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="mobile-nav-link">{link.label}</Link>)}<a href="mailto:hello@artistyar.dev" onClick={() => setOpen(false)} className="btn-primary mt-3 text-center">مشاوره و ارتباط</a></nav>
      </div>
    </header>
  );
}
