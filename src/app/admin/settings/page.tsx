"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  RefreshCw,
  Settings2,
  Sparkles,
  Link2,
  Shield,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";

type ProviderInfo = {
  id: string;
  name: string;
  baseUrl: string;
  chatStyle: string;
  hasKey: boolean;
  defaultModels: string[];
};

type ModelBucket = {
  provider: { id: string; name: string; configured: boolean };
  models: Array<{ id: string; provider: string; rank?: number }>;
};

type SettingsPayload = {
  ok: boolean;
  session?: { username: string };
  backend?: string;
  supabase?: boolean;
  features?: Record<string, boolean>;
  envPresence?: Record<string, boolean>;
  providers?: ProviderInfo[];
  models?: ModelBucket[] | null;
  community?: Array<{
    href: string;
    title: string;
    short: string;
    description: string;
    kind: string;
  }>;
  nodeEnv?: string;
  generatedAt?: string;
  error?: string;
};

const FEATURE_LABELS: Record<string, string> = {
  assistantEnabled: "دستیار راه‌یار AI",
  freePlayerEnabled: "پلیر آموزش رایگان",
  onlineClassesEnabled: "کلاس آنلاین",
  registrationEnabled: "ثبت‌نام هنرجو",
  maintenanceMode: "حالت تعمیرات",
};

const FEATURE_HINTS: Record<string, string> = {
  assistantEnabled: "با ASSISTANT_DISABLED=1 روی Render خاموش می‌شود",
  freePlayerEnabled: "با FREE_PLAYER_DISABLED=1 خاموش می‌شود",
  onlineClassesEnabled: "با ONLINE_CLASSES_DISABLED=1 خاموش می‌شود",
  registrationEnabled: "با REGISTRATION_DISABLED=1 خاموش می‌شود",
  maintenanceMode: "با MAINTENANCE_MODE=1 فعال می‌شود",
};

const LOCAL_FLAGS_KEY = "artistyar_admin_feature_overrides";

export default function AdminSettingsPage() {
  const [data, setData] = useState<SettingsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [error, setError] = useState("");
  const [localFlags, setLocalFlags] = useState<Record<string, boolean>>({});
  const [savedNote, setSavedNote] = useState("");

  const load = useCallback(async (withDiscover = false) => {
    if (withDiscover) setDiscovering(true);
    else setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/settings${withDiscover ? "?discover=1" : ""}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = (await res.json()) as SettingsPayload;
      if (!res.ok) throw new Error(json.error || "دسترسی غیرمجاز یا خطا");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "بارگذاری تنظیمات ناموفق بود");
    } finally {
      setLoading(false);
      setDiscovering(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
    try {
      const raw = window.localStorage.getItem(LOCAL_FLAGS_KEY);
      if (raw) setLocalFlags(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      /* ignore */
    }
  }, [load]);

  function toggleLocalFlag(key: string) {
    setLocalFlags((prev) => {
      const next = { ...prev, [key]: !(prev[key] ?? data?.features?.[key] ?? true) };
      try {
        window.localStorage.setItem(LOCAL_FLAGS_KEY, JSON.stringify(next));
        setSavedNote("ترجیح محلی ذخیره شد (فقط روی این مرورگر ادمین).");
      } catch {
        setSavedNote("ذخیره‌سازی مرورگر در دسترس نیست.");
      }
      return next;
    });
  }

  function effectiveFlag(key: string): boolean {
    if (key in localFlags) return Boolean(localFlags[key]);
    return Boolean(data?.features?.[key]);
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow flex items-center gap-2">
            <Settings2 size={14} />
            تنظیمات پیشرفته
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-sand-50">مرکز کنترل پنل ادمین</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-ink-400">
            وضعیت env، providerهای AI، featureها و لینک‌های جامعه را اینجا ببین. تغییر دائمی env فقط از Render انجام
            می‌شود.
          </p>
          {data?.generatedAt ? (
            <p className="mt-2 text-xs text-ink-500">
              آخرین بروزرسانی: {new Date(data.generatedAt).toLocaleString("fa-IR")} · {data.nodeEnv}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-ghost min-h-11 !px-4 text-xs" onClick={() => void load(false)} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            تازه‌سازی
          </button>
          <button
            type="button"
            className="btn-primary min-h-11 !px-4 text-xs"
            onClick={() => void load(true)}
            disabled={discovering}
          >
            <Sparkles size={14} />
            {discovering ? "در حال کشف مدل‌ها…" : "کشف مدل‌های AI"}
          </button>
        </div>
      </header>

      {error ? (
        <p className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-300" role="alert">
          {error}
        </p>
      ) : null}
      {savedNote ? <p className="text-xs text-gold-400">{savedNote}</p> : null}

      {/* Snapshot */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card-ay p-4">
          <p className="text-xs text-ink-500">نشست ادمین</p>
          <p className="mt-1 text-sm font-medium text-sand-50">{data?.session?.username || (loading ? "…" : "—")}</p>
        </div>
        <div className="card-ay p-4">
          <p className="text-xs text-ink-500">Backend</p>
          <p className="mt-1 truncate text-sm font-medium text-sand-50" title={data?.backend}>
            {data?.backend || (loading ? "…" : "—")}
          </p>
        </div>
        <div className="card-ay p-4">
          <p className="text-xs text-ink-500">Supabase</p>
          <p className={`mt-1 text-sm font-medium ${data?.supabase ? "text-emerald-400" : "text-red-400"}`}>
            {loading ? "…" : data?.supabase ? "متصل" : "ناقص"}
          </p>
        </div>
        <div className="card-ay p-4">
          <p className="text-xs text-ink-500">AI Providers</p>
          <p className="mt-1 text-sm font-medium text-gold-400">
            {loading ? "…" : `${data?.providers?.length || 0} فعال`}
          </p>
        </div>
      </div>

      {/* Feature flags */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <ToggleLeft size={16} className="text-gold-400" />
          <h3 className="text-lg font-medium text-sand-50">قابلیت‌های سایت</h3>
        </div>
        <p className="text-xs leading-6 text-ink-500">
          وضعیت اصلی از env روی سرور خوانده می‌شود. سوئیچ محلی فقط یادداشت مرورگر ادمین است و سایت عمومی را عوض
          نمی‌کند.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.keys(FEATURE_LABELS).map((key) => {
            const on = effectiveFlag(key);
            const serverOn = Boolean(data?.features?.[key]);
            return (
              <div key={key} className="card-ay flex items-start justify-between gap-4 p-5">
                <div>
                  <p className="font-medium text-sand-50">{FEATURE_LABELS[key]}</p>
                  <p className="mt-1 text-xs leading-6 text-ink-500">{FEATURE_HINTS[key]}</p>
                  <p className="mt-2 text-[11px] text-ink-500">سرور: {serverOn ? "روشن" : "خاموش"}</p>
                </div>
                <button
                  type="button"
                  className="ay-pressable shrink-0 rounded-full p-1 text-gold-400"
                  onClick={() => toggleLocalFlag(key)}
                  aria-label={FEATURE_LABELS[key]}
                >
                  {on ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-ink-500" />}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Env presence */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-gold-400" />
          <h3 className="text-lg font-medium text-sand-50">وضعیت کلیدهای env</h3>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(data?.envPresence || {}).map(([name, present]) => (
            <div key={name} className="card-ay flex items-center gap-3 p-3">
              {present ? (
                <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
              ) : (
                <XCircle size={16} className="shrink-0 text-red-400" />
              )}
              <code className="truncate text-xs text-ink-300">{name}</code>
            </div>
          ))}
          {loading && !data ? <p className="text-sm text-ink-500">در حال بارگذاری…</p> : null}
        </div>
        <div className="card-ay flex items-start gap-2 p-4 text-xs leading-6 text-ink-400">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-gold-400" />
          مقدار واقعی کلیدها هرگز در پنل نمایش داده نمی‌شود — فقط وجود/عدم وجود.
        </div>
      </section>

      {/* AI providers */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-gold-400" />
            <h3 className="text-lg font-medium text-sand-50">Providerهای AI</h3>
          </div>
          <Link href="/admin/ai" className="text-xs text-gold-400 hover:text-gold-300">
            صفحه AI Agent ←
          </Link>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {(data?.providers || []).map((p) => (
            <article key={p.id} className="card-ay p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-medium text-sand-50">{p.name}</h4>
                  <p className="mt-1 truncate text-xs text-ink-500" title={p.baseUrl}>
                    {p.baseUrl}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                    p.hasKey ? "bg-emerald-400/10 text-emerald-300" : "bg-red-400/10 text-red-300"
                  }`}
                >
                  {p.hasKey ? "کلید دارد" : "بدون کلید"}
                </span>
              </div>
              <p className="mt-3 text-[11px] text-ink-500">سبک: {p.chatStyle}</p>
              {p.defaultModels.length ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.defaultModels.slice(0, 4).map((m) => (
                    <span key={m} className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-ink-400">
                      {m}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
          {!loading && !(data?.providers || []).length ? (
            <p className="card-ay p-5 text-sm text-ink-400">هیچ providerی در env پیکربندی نشده.</p>
          ) : null}
        </div>

        {data?.models ? (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-sand-50">مدل‌های کشف‌شده</h4>
            {data.models.map((bucket) => (
              <div key={bucket.provider.id} className="card-ay p-4">
                <p className="text-sm text-sand-50">
                  {bucket.provider.name}{" "}
                  <span className="text-xs text-ink-500">({bucket.models.length} مدل)</span>
                </p>
                <div className="mt-3 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                  {bucket.models.slice(0, 30).map((m) => (
                    <span
                      key={`${bucket.provider.id}-${m.id}`}
                      className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] text-ink-300"
                    >
                      {m.id}
                      {m.rank != null ? <span className="ml-1 text-ink-500">·{m.rank}</span> : null}
                    </span>
                  ))}
                  {!bucket.models.length ? <span className="text-xs text-ink-500">مدلی یافت نشد</span> : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-ink-500">برای لیست زنده مدل‌ها دکمه «کشف مدل‌های AI» را بزن.</p>
        )}
      </section>

      {/* Community */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Link2 size={16} className="text-gold-400" />
          <h3 className="text-lg font-medium text-sand-50">لینک‌های جامعه (سایت)</h3>
        </div>
        <p className="text-xs leading-6 text-ink-500">
          این لینک‌ها از <code className="text-gold-400">src/data/community.ts</code> خوانده می‌شوند و در فوتر و
          صفحات عمومی نمایش داده می‌شوند.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {(data?.community || []).map((item) => (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="card-ay ay-pressable block p-5 transition hover:border-gold-500/30"
            >
              <p className="text-[10px] uppercase tracking-[0.16em] text-ink-500">{item.kind}</p>
              <strong className="mt-2 block text-sm text-sand-50">{item.title}</strong>
              <p className="mt-2 text-xs leading-6 text-ink-400">{item.description}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs text-gold-400">
                {item.short} <ExternalLink size={12} />
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* Quick links */}
      <section className="card-ay p-6">
        <h3 className="text-sm font-medium text-sand-50">میانبرها</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/admin/system" className="btn-ghost min-h-11 !py-2 text-xs">
            تشخیص سیستم
          </Link>
          <Link href="/admin/ai" className="btn-ghost min-h-11 !py-2 text-xs">
            AI Agent
          </Link>
          <Link href="/admin/content?tab=media" className="btn-ghost min-h-11 !py-2 text-xs">
            مدیریت محتوا
          </Link>
          <Link href="/admin/students" className="btn-ghost min-h-11 !py-2 text-xs">
            هنرجویان
          </Link>
          <Link href="/admin/analytics" className="btn-ghost min-h-11 !py-2 text-xs">
            آمار
          </Link>
        </div>
      </section>
    </div>
  );
}
