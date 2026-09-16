"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BrandMark } from "./BrandMark";
import { useAuth } from "./AuthProvider";

const links = [
  { href: "/", label: "خانه" },
  { href: "/courses", label: "دوره‌ها" },
  { href: "/online", label: "کلاس آنلاین" },
  { href: "/assistant", label: "دستیار AI" },
  { href: "/about", label: "درباره" },
  { href: "/contact", label: "تماس" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { user, ready } = useAuth();

  const panelHref = user?.role === "admin" ? "/admin" : "/panel";

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-ink-950/70 backdrop-blur-xl transition-shadow duration-300">
      <div className="container-ay flex h-16 items-center justify-between gap-4">
        <Link href="/" className="shrink-0 transition-opacity hover:opacity-90" onClick={() => setOpen(false)}>
          <BrandMark />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3.5 py-2 text-sm transition duration-300 ${
                  active
                    ? "bg-white/[0.06] text-sand-50 shadow-[0_0_20px_-8px_rgba(201,162,39,0.35)]"
                    : "text-ink-400 hover:bg-white/[0.04] hover:text-sand-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {ready && user ? (
            <Link href={panelHref} className="btn-primary !px-4 !py-2 text-xs">
              پنل من
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn-ghost !px-4 !py-2 text-xs">
                ورود
              </Link>
              <Link href="/courses" className="btn-primary !px-4 !py-2 text-xs">
                شروع یادگیری
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          aria-label="منو"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 transition hover:border-white/20 md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="text-lg">{open ? "×" : "≡"}</span>
        </button>
      </div>

      <div
        className={`overflow-hidden border-t border-white/[0.06] bg-ink-950/95 transition-all duration-300 md:hidden ${
          open ? "max-h-96 opacity-100" : "max-h-0 border-transparent opacity-0"
        }`}
      >
        <div className="flex flex-col gap-1 px-5 py-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-xl px-3 py-3 text-sm text-sand-100 transition hover:bg-white/[0.04]"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href={user ? panelHref : "/login"}
            onClick={() => setOpen(false)}
            className="mt-2 rounded-xl border border-white/10 px-3 py-3 text-center text-sm transition hover:border-gold-500/30"
          >
            {user ? "پنل من" : "ورود"}
          </Link>
        </div>
      </div>
    </header>
  );
}
