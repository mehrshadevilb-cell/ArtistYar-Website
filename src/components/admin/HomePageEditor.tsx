"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Save, RotateCcw } from "lucide-react";
import {
  DEFAULT_HOMEPAGE,
  type HomepageConfig,
  type HomeSectionConfig,
} from "@/data/homepage";

export function HomePageEditor() {
  const [config, setConfig] = useState<HomepageConfig>(DEFAULT_HOMEPAGE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/homepage", { credentials: "include" });
      const data = await r.json();
      if (!r.ok || !data.ok) throw new Error(data.error || "load_failed");
      setConfig(data.config);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در بارگذاری");
      setConfig(DEFAULT_HOMEPAGE);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function updateSection(id: string, patch: Partial<HomeSectionConfig>) {
    setConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  }

  function move(id: string, dir: -1 | 1) {
    setConfig((prev) => {
      const sorted = [...prev.sections].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex((s) => s.id === id);
      const j = idx + dir;
      if (idx < 0 || j < 0 || j >= sorted.length) return prev;
      const a = sorted[idx];
      const b = sorted[j];
      const next = prev.sections.map((s) => {
        if (s.id === a.id) return { ...s, order: b.order };
        if (s.id === b.id) return { ...s, order: a.order };
        return s;
      });
      return { ...prev, sections: next };
    });
  }

  function updateProof(i: number, field: "label" | "detail", value: string) {
    setConfig((prev) => {
      const proofItems = prev.proofItems.map((p, idx) =>
        idx === i ? { ...p, [field]: value } : p,
      );
      return { ...prev, proofItems };
    });
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const r = await fetch("/api/admin/homepage", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      const data = await r.json();
      if (!r.ok || !data.ok) {
        throw new Error(
          [data.error, data.hint].filter(Boolean).join(" — ") || "save_failed",
        );
      }
      setConfig(data.config);
      setMessage("ذخیره شد");
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در ذخیره");
    } finally {
      setSaving(false);
    }
  }

  const sorted = [...config.sections].sort((a, b) => a.order - b.order);

  if (loading) {
    return <p className="text-sm text-ink-400">در حال بارگذاری تنظیمات صفحه اصلی…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-medium text-sand-50">بخش‌های صفحه اصلی</h3>
          <p className="mt-1 text-xs leading-6 text-ink-400">
            نمایش، ترتیب و متن هر بخش را کنترل کن. بدون جدول site_settings مقادیر پیش‌فرض اعمال می‌شود.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-ghost !px-3 !py-2 text-xs" onClick={() => setConfig(DEFAULT_HOMEPAGE)}>
            <RotateCcw size={14} className="ml-1 inline" />
            بازنشانی
          </button>
          <button type="button" className="btn-primary !px-4 !py-2 text-xs" disabled={saving} onClick={() => void save()}>
            <Save size={14} className="ml-1 inline" />
            {saving ? "…" : "ذخیره"}
          </button>
        </div>
      </div>

      {message ? <p className="text-xs text-emerald-300">{message}</p> : null}
      {error ? <p className="text-xs text-red-300">{error}</p> : null}

      <div className="space-y-3">
        {sorted.map((s, i) => (
          <div key={s.id} className="card-ay space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-ink-500">{s.id}</span>
                <strong className="text-sm text-sand-50">{s.title || s.id}</strong>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" className="rounded-lg border border-white/10 p-1.5 text-ink-300 hover:text-sand-50" onClick={() => move(s.id, -1)} disabled={i === 0} aria-label="بالا">
                  <ArrowUp size={14} />
                </button>
                <button type="button" className="rounded-lg border border-white/10 p-1.5 text-ink-300 hover:text-sand-50" onClick={() => move(s.id, 1)} disabled={i === sorted.length - 1} aria-label="پایین">
                  <ArrowDown size={14} />
                </button>
                <button type="button" className={`rounded-lg border p-1.5 ${s.visible ? "border-emerald-500/30 text-emerald-300" : "border-white/10 text-ink-500"}`} onClick={() => updateSection(s.id, { visible: !s.visible })} aria-label={s.visible ? "مخفی" : "نمایش"}>
                  {s.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="block text-xs text-ink-400">
                عنوان بخش
                <input className="input-ay mt-1 text-sm" value={s.title} onChange={(e) => updateSection(s.id, { title: e.target.value })} />
              </label>
              <label className="block text-xs text-ink-400">
                ابرو (eyebrow)
                <input className="input-ay mt-1 text-sm" value={s.eyebrow} onChange={(e) => updateSection(s.id, { eyebrow: e.target.value })} />
              </label>
              <label className="block text-xs text-ink-400">
                توضیح
                <input className="input-ay mt-1 text-sm" value={s.subtitle} onChange={(e) => updateSection(s.id, { subtitle: e.target.value })} />
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="card-ay space-y-3 p-4">
        <h4 className="text-sm font-medium text-sand-50">نوار قابلیت‌ها (زیر هیرو)</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          {config.proofItems.map((p, i) => (
            <div key={i} className="grid gap-2">
              <input className="input-ay text-sm" value={p.label} onChange={(e) => updateProof(i, "label", e.target.value)} placeholder="عنوان" />
              <input className="input-ay text-sm" value={p.detail} onChange={(e) => updateProof(i, "detail", e.target.value)} placeholder="جزئیات" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
