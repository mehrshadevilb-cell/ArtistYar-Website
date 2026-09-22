"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, Bot, Eye, Gauge, GraduationCap, MousePointerClick, RefreshCw, Users } from "lucide-react";

type Data = { snapshot?: any; synthesis?: string; summary?: any };
const fmt = (n: number) => Number(n || 0).toLocaleString("fa-IR");
const parse = (s: string) => {
  try {
    const raw = (s || "").trim().replace(/^\`\`\`(?:json)?\s*/i, "").replace(/\s*\`\`\`$/, "").trim();
    return JSON.parse(raw);
  } catch { return null; }
};

function Bars({ items }: { items: any[] }) {
  const max = Math.max(1, ...items.map((x) => Number(x.count || 0)));
  return <div className="space-y-3">{items.length ? items.map((x) => <div key={x.label || x.path || x.event}>
    <div className="flex justify-between text-xs"><span dir="ltr" className="truncate text-ink-300">{x.label || x.path || x.event}</span><b className="text-gold-400">{fmt(x.count)}</b></div>
    <div className="mt-1 h-2 rounded-full bg-white/5"><div className="h-full rounded-full bg-gold-400/70" style={{ width: `${Math.max(3, Number(x.count || 0) / max * 100)}%` }} /></div>
  </div>) : <p className="text-xs text-ink-600">هنوز داده‌ای ثبت نشده است.</p>}</div>;
}

function Card({ title, value, icon: Icon, sub }: { title: string; value: string; icon: any; sub?: string }) {
  return <div className="card-ay p-5"><Icon size={18} className="text-gold-400" /><p className="mt-4 text-xs text-ink-500">{title}</p><p className="mt-2 text-3xl font-semibold text-sand-50">{value}</p>{sub && <p className="mt-1 text-[11px] text-ink-600">{sub}</p>}</div>;
}

async function fetchJson(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { cache: "no-store", credentials: "include", headers: { Accept: "application/json" }, signal: controller.signal });
    const text = await response.text();
    let body: any = null;
    try { body = text ? JSON.parse(text) : null; } catch {
      throw new Error(response.status >= 500
        ? "سرور پاسخ نامعتبر داد (احتمالاً خطای داخلی بک‌اند)."
        : `پاسخ نامعتبر از سرویس آمار (HTTP ${response.status}).`);
    }
    if (response.status === 401 && typeof window !== "undefined") {
      const next = `${window.location.pathname}${window.location.search}`;
      window.location.assign(`/login?next=${encodeURIComponent(next)}`);
      throw new Error("نیاز به ورود ادمین");
    }
    if (!response.ok) {
      const msg = body?.message || body?.detail || body?.error;
      if (typeof msg === "string" && msg.trim()) throw new Error(msg);
      if (response.status === 403) throw new Error("دسترسی آمار بک‌اند رد شد — WEB_ADMIN_API_KEY را یکسان کن.");
      if (response.status >= 500) throw new Error("خطای داخلی سرور آمار. چند دقیقه بعد دوباره تلاش کن.");
      throw new Error(`دریافت آمار ناموفق بود (HTTP ${response.status}).`);
    }
    return body;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new Error("زمان پاسخ سرویس تمام شد.");
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState("");
  const [aiError, setAiError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setAiLoading(true);
    setError("");
    setAiError("");

    try {
      const summary = await fetchJson(`/api/rahyar/admin/analytics?days=${days}`, 20000);
      setData((current) => ({ ...(current || {}), summary }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "دریافت داده‌های اصلی تحلیل ناموفق بود.");
    } finally {
      setLoading(false);
    }

    try {
      const ai = await fetchJson(`/api/rahyar/admin/analytics/ai?days=${days}`, 90000);
      setData((current) => ({ ...(current || {}), ...ai }));
    } catch (reason) {
      setAiError(reason instanceof Error ? reason.message : "تحلیل AI فعلاً در دسترس نیست.");
    } finally {
      setAiLoading(false);
    }
  }, [days]);

  useEffect(() => { void load(); }, [load]);

  const s = data?.snapshot || data?.summary?.snapshot;
  const t = parse(data?.synthesis || "");
  const conv = s?.conversion || {};
  const funnel = [["بازدید", s?.traffic?.page_views || 0], ["شروع سفارش", conv.orders_started || 0], ["سفارش", conv.orders_created || 0], ["Checkout", conv.checkout || 0], ["درخواست کلاس", conv.class_inquiries || 0], ["کلیک ربات", conv.bot_clicks || 0]];

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">/ مرکز تحلیل سایت</p><h2 className="mt-3 text-2xl font-semibold text-sand-50">Analytics · نمودارها · AI Diagnostics</h2><p className="mt-2 text-sm leading-7 text-ink-400">ترافیک، رفتار، قیف تبدیل، منابع ورودی، دستگاه‌ها و تحلیل موازی AI.</p></div><div className="flex gap-2">{[7, 30, 90].map((n) => <button key={n} onClick={() => setDays(n)} className={`rounded-lg border px-3 py-2 text-xs ${days === n ? "border-gold-400/40 text-gold-400" : "border-white/10 text-ink-400"}`}>{n} روز</button>)}<button onClick={() => void load()} className="btn-ghost !py-2 text-xs"><RefreshCw size={14} className="inline" /> بروزرسانی</button></div></div>
    {error && <p className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-300">{error}</p>}
    {loading ? <p className="text-sm text-ink-500">در حال دریافت داده‌ها…</p> : null}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card title="بازدید صفحه" value={fmt(s?.traffic?.page_views || data?.summary?.site?.page_views_period || 0)} icon={Eye} sub={`${days} روز`} />
      <Card title="بازدیدکننده یکتا" value={fmt(s?.traffic?.unique_visitors || 0)} icon={Users} />
      <Card title="رویدادها" value={fmt(s?.traffic?.events || 0)} icon={Activity} />
      <Card title="نرخ تبدیل تقریبی" value={`${fmt(Math.round(((conv.orders_created || 0) / Math.max(1, s?.traffic?.page_views || 1)) * 1000) / 10)}%`} icon={Gauge} />
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="card-ay p-5"><h3 className="mb-4 text-sm text-sand-50">قیف تبدیل</h3><Bars items={funnel.map(([label, count]) => ({ label, count }))} /></section>
      <section className="card-ay p-5"><h3 className="mb-4 text-sm text-sand-50">مسیرهای پربازدید</h3><Bars items={s?.top_paths || []} /></section>
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="card-ay p-5"><h3 className="mb-4 flex items-center gap-2 text-sm text-sand-50"><MousePointerClick size={16} className="text-gold-400" />رویدادهای کلیدی</h3><Bars items={s?.top_events || []} /></section>
      <section className="card-ay p-5"><h3 className="mb-4 text-sm text-sand-50">دستگاه‌ها / منابع</h3><Bars items={[...(s?.devices || []), ...(s?.referrers || [])].slice(0, 12)} /></section>
    </div>
    <section className="card-ay border border-emerald-400/20 bg-emerald-400/[.035] p-5"><div className="flex items-center gap-2"><Bot size={18} className="text-emerald-400" /><h3 className="text-base font-medium text-sand-50">AI Website Analyst</h3>{aiLoading && <span className="text-[10px] text-ink-500">در حال تحلیل…</span>}</div><p className="mt-1 text-xs text-ink-500">۳ متخصص موازی + Lead Synthesis؛ بدون حدس‌زدن داده.</p>{aiError && <p className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs text-amber-200">{aiError}</p>}{t?.summary && <p className="mt-4 rounded-xl border border-white/10 p-4 text-sm leading-7 text-sand-100">{t.summary}</p>}<div className="mt-4 space-y-2">{(t?.priority_findings || []).map((x: any, i: number) => <div key={i} className="rounded-xl border border-white/10 p-3 text-xs leading-6"><b className="text-gold-400">{x.severity}</b> · <span className="text-sand-50">{x.finding}</span><p className="text-ink-500">شواهد: {x.evidence}</p></div>)}</div></section>
    <div className="grid gap-4 lg:grid-cols-3">{[["آزمایش‌ها / اقدامات", t?.experiments], ["بررسی فنی", t?.engineering_checks], ["UX / محتوا", t?.content_ux_checks]].map(([title, items]) => <section key={String(title)} className="card-ay p-5"><h3 className="text-sm text-sand-50">{title}</h3><ul className="mt-4 space-y-2 text-xs leading-6 text-ink-400">{(items || []).map((x: string, i: number) => <li key={i}>• {x}</li>)}</ul></section>)}</div>
    <section className="card-ay p-5"><div className="flex gap-2 text-sm text-sand-50"><GraduationCap size={17} className="text-gold-400" />وضعیت کلی دیتابیس</div><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 text-xs text-ink-400"><div>بازدید ۷ روز: <b className="text-sand-50">{fmt(data?.summary?.site?.page_views_7d)}</b></div><div>بازدید {days} روز: <b className="text-sand-50">{fmt(data?.summary?.site?.page_views_period)}</b></div><div>کل ثبت‌نام: <b className="text-sand-50">{fmt(data?.summary?.education?.total_enrollments)}</b></div><div>رویداد AI ادمین: <b className="text-sand-50">{fmt(data?.summary?.ai_agent?.admin_ai_events_period ?? data?.summary?.ai_agent?.admin_ai_events_30d)}</b></div></div></section>
  </div>;
}
