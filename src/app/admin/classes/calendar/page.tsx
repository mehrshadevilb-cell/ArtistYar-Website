"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { SESSION_STATUS_LABELS, type SessionStatus } from "@/lib/admin/classes/types";

type CalendarSession = {
  id: string;
  class_id: string;
  class_title?: string;
  scheduled_start: string;
  scheduled_end: string;
  status: SessionStatus;
  timezone?: string;
  meeting_url?: string | null;
  location?: string | null;
};

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function shiftDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeek(date: Date) {
  const next = new Date(date);
  const day = next.getDay();
  next.setDate(next.getDate() - day);
  next.setHours(0, 0, 0, 0);
  return next;
}

export default function AdminClassesCalendarPage() {
  const [anchor, setAnchor] = useState(() => new Date());
  const [items, setItems] = useState<CalendarSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const from = useMemo(() => startOfWeek(anchor), [anchor]);
  const to = useMemo(() => shiftDays(from, 6), [from]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/classes/calendar?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}&limit=500`,
        { credentials: "include", cache: "no-store" },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "دریافت تقویم جلسات ناموفق بود.");
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "دریافت تقویم جلسات ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const days = Array.from({ length: 7 }, (_, index) => shiftDays(from, index));
  const grouped = useMemo(() => {
    const map = new Map<string, CalendarSession[]>();
    for (const item of items) {
      const key = localDateKey(new Date(item.scheduled_start));
      const list = map.get(key) || [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  }, [items]);

  return (
    <div className="space-y-6" dir="rtl">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">/ کلاس‌ها · تقویم</p>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold text-sand-50">
            <CalendarDays size={22} className="text-gold-400" />
            تقویم جلسات
          </h1>
          <p className="mt-2 text-sm leading-7 text-ink-400">
            جلسات واقعی کلاس‌ها از همان منبع canonical کلاس و جلسه نمایش داده می‌شوند.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/classes" className="btn-ghost !py-2 text-xs">مدیریت کلاس‌ها</Link>
          <button type="button" className="btn-ghost !py-2 text-xs" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            بروزرسانی
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" className="btn-ghost !px-3" onClick={() => setAnchor((value) => shiftDays(value, -7))} aria-label="هفته قبل">
          <ChevronRight size={16} />
        </button>
        <p className="text-sm font-medium text-sand-50">
          {from.toLocaleDateString("fa-IR", { day: "numeric", month: "long" })} تا{" "}
          {to.toLocaleDateString("fa-IR", { day: "numeric", month: "long", year: "numeric" })}
        </p>
        <div className="flex gap-2">
          <button type="button" className="btn-ghost !py-2 text-xs" onClick={() => setAnchor(new Date())}>امروز</button>
          <button type="button" className="btn-ghost !px-3" onClick={() => setAnchor((value) => shiftDays(value, 7))} aria-label="هفته بعد">
            <ChevronLeft size={16} />
          </button>
        </div>
      </div>

      {error ? <p className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-300" role="alert">{error}</p> : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        {days.map((day) => {
          const key = localDateKey(day);
          const sessions = grouped.get(key) || [];
          return (
            <section key={key} className="card-ay min-h-44 p-3">
              <div className="border-b border-white/[.06] pb-2">
                <p className="text-[11px] text-ink-500">{day.toLocaleDateString("fa-IR", { weekday: "long" })}</p>
                <p className="mt-1 text-sm font-semibold text-sand-50">{day.toLocaleDateString("fa-IR", { day: "numeric", month: "short" })}</p>
              </div>
              <div className="mt-3 space-y-2">
                {sessions.map((session) => (
                  <Link key={session.id} href={`/admin/classes/${session.class_id}`} className="block rounded-xl border border-white/[.07] bg-white/[.02] p-3 hover:border-gold-400/30">
                    <p className="text-xs font-medium text-sand-50">{session.class_title || "کلاس بدون عنوان"}</p>
                    <p className="mt-1 text-[11px] text-gold-300" dir="ltr">
                      {new Date(session.scheduled_start).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}
                      {" – "}
                      {new Date(session.scheduled_end).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <p className="mt-1 text-[10px] text-ink-500">{SESSION_STATUS_LABELS[session.status] || session.status}</p>
                  </Link>
                ))}
                {!sessions.length ? <p className="py-3 text-center text-[11px] text-ink-600">جلسه‌ای نیست</p> : null}
              </div>
            </section>
          );
        })}
      </div>

      {!loading && !items.length ? <div className="card-ay p-6 text-center text-sm text-ink-500">در این بازه جلسه‌ای ثبت نشده است.</div> : null}
    </div>
  );
}
