"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, RefreshCw, Search } from "lucide-react";
import { CLASS_STATUS_LABELS, type AyClass, type ClassStatus } from "@/lib/admin/classes/types";

export default function AdminClassesPage() {
  const [items, setItems] = useState<AyClass[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ClassStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "40" });
      if (q.trim()) params.set("q", q.trim());
      if (status !== "all") params.set("status", status);
      const res = await fetch(`/api/admin/classes?${params}`, {
        credentials: "include",
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "خطا");
      setItems(json.items || []);
      setTotal(json.total || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا");
    } finally {
      setLoading(false);
    }
  }, [q, status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createClass() {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/classes", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), status: "draft" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "خطا");
      setShowCreate(false);
      setTitle("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-gold-500">کلاس‌ها</p>
          <h1 className="mt-1 text-xl font-semibold text-sand-50 sm:text-2xl">مدیریت کلاس‌ها</h1>
          <p className="mt-2 max-w-xl text-sm leading-7 text-ink-400">
            منبع واحد حقیقت برای کلاس، جلسه، ثبت‌نام و حضور و غیاب.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/classes/calendar" className="btn-ghost !py-2 text-xs">
            تقویم
          </Link>
          <button type="button" className="btn-ghost !py-2 text-xs" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button type="button" className="btn-ghost !py-2 text-xs" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> کلاس جدید
          </button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search size={14} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جستجوی عنوان…"
            className="min-h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pe-3 ps-9 text-sm text-sand-50 outline-none focus:border-gold-400/40"
            dir="rtl"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ClassStatus | "all")}
          className="min-h-10 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-sand-50"
        >
          <option value="all">همه وضعیت‌ها</option>
          {Object.entries(CLASS_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      {showCreate ? (
        <div className="card-ay space-y-3 p-5">
          <h2 className="text-sm font-medium text-sand-50">ایجاد کلاس</h2>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="عنوان کلاس"
            className="min-h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-sand-50 outline-none focus:border-gold-400/40"
            dir="rtl"
          />
          <div className="flex gap-2">
            <button type="button" className="btn-ghost !py-2 text-xs" onClick={() => void createClass()} disabled={creating}>
              {creating ? "…" : "ایجاد"}
            </button>
            <button type="button" className="btn-ghost !py-2 text-xs" onClick={() => setShowCreate(false)}>
              انصراف
            </button>
          </div>
        </div>
      ) : null}

      {loading && !items.length ? <p className="card-ay p-5 text-sm text-ink-500">در حال بارگذاری…</p> : null}

      {!loading && !items.length ? (
        <div className="card-ay p-10 text-center">
          <p className="text-sm text-sand-50">کلاسی ثبت نشده</p>
        </div>
      ) : null}

      {items.length > 0 ? (
        <>
          <p className="text-xs text-ink-500">{total.toLocaleString("fa-IR")} کلاس</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-start text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] text-ink-500">
                  <th className="px-3 py-2 font-medium">عنوان</th>
                  <th className="px-3 py-2 font-medium">وضعیت</th>
                  <th className="px-3 py-2 font-medium">ظرفیت</th>
                  <th className="px-3 py-2 font-medium">ثبت‌نام فعال</th>
                  <th className="px-3 py-2 font-medium">جلسه بعدی</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="px-3 py-3">
                      <Link href={`/admin/classes/${c.id}`} className="font-medium text-gold-300 hover:underline">
                        {c.title}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-xs text-ink-300">{CLASS_STATUS_LABELS[c.status] || c.status}</td>
                    <td className="px-3 py-3 text-xs tabular-nums text-ink-400">
                      {c.capacity != null ? c.capacity.toLocaleString("fa-IR") : "—"}
                    </td>
                    <td className="px-3 py-3 text-xs tabular-nums text-ink-400">
                      {(c.enrollment_count ?? 0).toLocaleString("fa-IR")}
                    </td>
                    <td className="px-3 py-3 text-xs text-ink-400">
                      {c.upcoming_session
                        ? new Date(c.upcoming_session.scheduled_start).toLocaleString("fa-IR")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
