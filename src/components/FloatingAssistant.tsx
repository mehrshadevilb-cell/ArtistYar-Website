"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Minimal live FAB for RahYar AI — Apple-style press + soft glass tip.
 * Hidden on /assistant, /admin, /panel.
 */
export function FloatingAssistant() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const wasDismissed = sessionStorage.getItem("ay_ai_fab_dismissed") === "1";
    setDismissed(wasDismissed);
    const t = window.setTimeout(() => setVisible(true), 480);
    return () => window.clearTimeout(t);
  }, []);

  if (
    pathname?.startsWith("/assistant") ||
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/panel")
  ) {
    return null;
  }
  if (dismissed || !visible) return null;

  function dismiss(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDismissed(true);
    sessionStorage.setItem("ay_ai_fab_dismissed", "1");
  }

  return (
    <div
      className={`floating-assistant fixed z-[70] ${
        visible ? "fa-enter" : "fa-exit"
      } bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))] sm:bottom-7 sm:left-7`}
    >
      {/* Soft ambient glow — bixa-like presence */}
      <div className="fa-ambient" aria-hidden="true" />

      <div
        className={`fa-tip mb-3 hidden max-w-[15.5rem] origin-bottom-left sm:block ${
          expanded ? "fa-tip-open" : "fa-tip-closed"
        }`}
      >
        <div className="fa-tip-card relative rounded-2xl border border-white/[0.1] bg-[#121210]/82 p-4 shadow-[0_24px_60px_-28px_rgba(0,0,0,.9)] backdrop-blur-2xl">
          <button
            type="button"
            onClick={dismiss}
            className="ay-pressable absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-lg text-ink-500 transition hover:bg-white/[0.06] hover:text-ink-300"
            aria-label="بستن"
          >
            <X size={14} />
          </button>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-gold-400">
            <Sparkles size={13} className="opacity-90" />
            فرق این سایت
          </div>
          <p className="text-[13px] leading-6 text-ink-200">
            فقط دوره نمی‌فروشیم — <strong className="text-sand-50">راه‌یار AI</strong> از همین
            لحظه کنارته: عیب‌یابی میکس، مسیر یادگیری و قدم بعدی.
          </p>
          <Link
            href="/assistant"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-gold-400 transition hover:text-gold-300"
            onClick={() => setExpanded(false)}
          >
            شروع گفت‌وگو
            <span aria-hidden>←</span>
          </Link>
        </div>
      </div>

      <div className="flex items-end gap-2">
        <Link
          href="/assistant"
          className="fa-cta ay-pressable group relative flex items-center gap-2.5 rounded-full border border-gold-500/35 bg-gold-500 px-4 py-3 text-sm font-medium text-ink-950 sm:px-5"
          onMouseEnter={() => setExpanded(true)}
          onFocus={() => setExpanded(true)}
          onMouseLeave={() => setExpanded(false)}
          aria-label="سؤال از راه‌یار AI — دستیار آموزشی آرتیست‌یار"
        >
          <span className="fa-cta-icon relative grid h-8 w-8 place-items-center rounded-full bg-ink-950/15">
            <Bot size={18} aria-hidden />
            <span className="fa-live-dot absolute -left-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-gold-500" />
          </span>
          <span className="hidden sm:inline">سؤال از راه‌یار</span>
          <span className="sm:hidden">راه‌یار AI</span>
        </Link>

        <button
          type="button"
          onClick={dismiss}
          className="ay-pressable grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-ink-950/75 text-ink-500 backdrop-blur-md transition hover:border-white/20 hover:text-ink-300 sm:hidden"
          aria-label="بستن میانبر دستیار"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
