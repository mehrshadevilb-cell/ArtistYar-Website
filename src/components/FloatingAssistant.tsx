"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Persistent floating CTA for RahYar AI — visible on every page except /assistant.
 * Makes the AI differentiator obvious from the first second.
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
    const t = window.setTimeout(() => setVisible(true), 600);
    return () => window.clearTimeout(t);
  }, []);

  if (pathname?.startsWith("/assistant") || pathname?.startsWith("/admin") || pathname?.startsWith("/panel")) {
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
      className={`fixed z-[60] transition-all duration-500 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      } bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))] sm:bottom-7 sm:left-7`}
    >
      <div
        className={`mb-3 hidden max-w-[16rem] origin-bottom-left transition-all duration-300 sm:block ${
          expanded ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        }`}
      >
        <div className="relative rounded-2xl border border-gold-500/25 bg-[#141411]/95 p-4 shadow-[0_20px_50px_-20px_rgba(0,0,0,.85)] backdrop-blur-xl">
          <button
            type="button"
            onClick={dismiss}
            className="absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-lg text-ink-500 transition hover:bg-white/[0.06] hover:text-ink-300"
            aria-label="بستن"
          >
            <X size={14} />
          </button>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-gold-400">
            <Sparkles size={14} />
            فرق این سایت
          </div>
          <p className="text-[13px] leading-6 text-ink-200">
            فقط دوره نمی‌فروشیم — <strong className="text-sand-50">راه‌یار AI</strong> از همین لحظه
            کنارته: عیب‌یابی میکس، مسیر یادگیری و قدم بعدی.
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
          className="group relative flex items-center gap-2.5 rounded-full border border-gold-500/30 bg-gold-500 px-4 py-3 text-sm font-medium text-ink-950 shadow-[0_12px_40px_-8px_rgba(201,162,39,.55)] transition hover:bg-gold-400 hover:shadow-[0_16px_48px_-8px_rgba(201,162,39,.7)] active:scale-[0.97] sm:px-5"
          onMouseEnter={() => setExpanded(true)}
          onFocus={() => setExpanded(true)}
          aria-label="سؤال از راه‌یار AI — دستیار آموزشی آرتیست‌یار"
        >
          <span className="relative grid h-8 w-8 place-items-center rounded-full bg-ink-950/15">
            <Bot size={18} aria-hidden />
            <span className="absolute -left-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400 ring-2 ring-gold-500" />
          </span>
          <span className="hidden sm:inline">سؤال از راه‌یار</span>
          <span className="sm:hidden">راه‌یار AI</span>
        </Link>

        <button
          type="button"
          onClick={dismiss}
          className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-ink-950/80 text-ink-500 backdrop-blur transition hover:border-white/20 hover:text-ink-300 sm:hidden"
          aria-label="بستن میانبر دستیار"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
