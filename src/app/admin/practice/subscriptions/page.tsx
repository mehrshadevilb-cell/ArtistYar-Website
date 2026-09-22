"use client";

import { useEffect, useMemo, useState } from "react";
import { Crown, RefreshCw, Search, UserPlus, CheckCircle2, Copy, AlertTriangle } from "lucide-react";

type PaymentRequest = {
  id: string;
  user_id: string;
  reference: string;
  amount_toman: number;
  status: string;
  created_at: string;
};

type Sub = {
  id: string;
  user_id: string;
  status: string;
  price_toman: number;
  started_at: string;
  expires_at: string;
};

type Student = {
  user_id: string;
  full_name: string;
  username?: string;
  sessions: number;
  voicing_sessions: number;
  average_accuracy: number;
};

type Analytics = {
  summary: {
    totalSessions: number;
    voicingSessions: number;
    activePro: number;
    totalSubscriptions: number;
    renewals: number;
    approvedPayments: number;
    revenue: number;
  };
  students: Student[];
  monthly: Array<{ month: string; sessions: number; voicing: number; renewals: number; revenue: number }>;
  subscriptionsTableReady?: boolean;
};

const SETUP_SQL = `create table if not exists public.practice_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  status text not null default 'active' check (status in ('active','cancelled','expired')),
  price_toman integer not null default 0,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists practice_subscriptions_user_idx on public.practice_subscriptions(user_id, status, expires_at desc);
create index if not exists practice_subscriptions_active_idx on public.practice_subscriptions(status, expires_at desc);
alter table public.practice_subscriptions enable row level security;
notify pgrst, 'reload schema';`;

export default function PracticeSubscriptionsAdmin() {
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [userId, setUserId] = useState("");
  const [telegramId, setTelegramId] = useState("");
  const [months, setMonths] = useState(1);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [setupSql, setSetupSql] = useState("");
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [directoryStudents, setDirectoryStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    setErr("");
    setSetupSql("");
    try {
      const [reqRes, subRes, analyticsRes, studentsRes] = await Promise.all([
        fetch("/api/admin/practice/payment-requests", { credentials: "include" }),
        fetch("/api/admin/practice/subscriptions", { credentials: "include" }),
        fetch("/api/admin/practice/analytics", { credentials: "include" }),
        fetch("/api/admin/practice/students", { credentials: "include" }),
      ]);

      if (reqRes.ok) {
        const data = await reqRes.json();
        setRequests(Array.isArray(data?.requests) ? data.requests : Array.isArray(data) ? data : []);
      }
      if (subRes.ok) {
        const data = await subRes.json();
        setSubs(Array.isArray(data?.subscriptions) ? data.subscriptions : Array.isArray(data) ? data : []);
      } else if (subRes.status === 503) {
        const data = await subRes.json().catch(() => ({}));
        if (data?.setupSql || data?.sql) setSetupSql(data.setupSql || data.sql || SETUP_SQL);
      }
      if (analyticsRes.ok) {
        const data = await analyticsRes.json();
        setAnalytics(data);
      }
      if (studentsRes.ok) {
        const data = await studentsRes.json();
        setDirectoryStudents(Array.isArray(data?.students) ? data.students : Array.isArray(data) ? data : []);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "خطا در دریافت داده‌ها");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = directoryStudents.length ? directoryStudents : analytics?.students || [];
    if (!q) return list;
    return list.filter(
      (s) =>
        s.user_id.toLowerCase().includes(q) ||
        (s.full_name || "").toLowerCase().includes(q) ||
        (s.username || "").toLowerCase().includes(q),
    );
  }, [directoryStudents, analytics, search]);

  const grant = async () => {
    if (!userId.trim() && !telegramId.trim()) {
      setErr("User ID یا Telegram ID را وارد کن");
      return;
    }
    setBusy("grant");
    setMsg("");
    setErr("");
    try {
      const res = await fetch("/api/admin/practice/subscriptions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId.trim() || undefined,
          telegram_id: telegramId.trim() || undefined,
          months: Number(months) || 1,
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || data?.message || "اعطای اشتراک ناموفق بود");
      setMsg("اشتراک با موفقیت فعال شد.");
      setUserId("");
      setTelegramId("");
      setNote("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "خطا");
    } finally {
      setBusy("");
    }
  };

  const review = async (id: string, action: "approve" | "reject") => {
    setBusy(id + action);
    setMsg("");
    setErr("");
    try {
      const res = await fetch("/api/admin/practice/payment-requests/" + id, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || data?.message || "عملیات ناموفق بود");
      setMsg(action === "approve" ? "تأیید و فعال‌سازی انجام شد." : "درخواست رد شد.");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "خطا");
    } finally {
      setBusy("");
    }
  };

  const revoke = async (subscriptionId: string) => {
    if (!window.confirm("اشتراک Practice Pro این کاربر لغو شود؟ این عمل بلافاصله اعمال می‌شود.")) return;
    setBusy(subscriptionId + "revoke");
    setMsg("");
    setErr("");
    try {
      const res = await fetch("/api/admin/practice/subscriptions/" + subscriptionId, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || data?.message || "لغو اشتراک ناموفق بود");
      setMsg("اشتراک لغو شد.");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "خطا");
    } finally {
      setBusy("");
    }
  };

  const copySql = () => {
    void navigator.clipboard.writeText(setupSql || SETUP_SQL);
    setMsg("SQL کپی شد.");
  };

  const summary = analytics?.summary;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Practice Pro</p>
          <h2 className="mt-2 text-2xl font-semibold text-sand-50">اشتراک‌ها و درخواست‌های پرداخت</h2>
          <p className="mt-2 text-sm leading-7 text-ink-400">
            فعال‌سازی دستی، بررسی درخواست‌های پرداخت و لغو اشتراک‌های فعال.
          </p>
        </div>
        <button type="button" className="btn-ghost gap-2" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          به‌روزرسانی
        </button>
      </div>

      {err ? (
        <p className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs leading-6 text-red-300" role="alert">
          {err}
        </p>
      ) : null}
      {msg ? (
        <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs leading-6 text-emerald-300" role="status">
          <CheckCircle2 className="ml-1 inline" size={14} />
          {msg}
        </p>
      ) : null}

      {setupSql ? (
        <div className="card-ay space-y-3 border-amber-400/20 bg-amber-400/5 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 shrink-0 text-amber-300" size={18} />
            <div>
              <p className="text-sm font-medium text-amber-100">جدول practice_subscriptions آماده نیست</p>
              <p className="mt-1 text-xs leading-6 text-ink-400">
                SQL زیر را در Supabase SQL Editor اجرا کن تا جدول و ایندکس‌ها ساخته شوند.
              </p>
            </div>
          </div>
          <pre className="max-h-40 overflow-auto rounded-lg bg-black/40 p-3 text-[11px] leading-5 text-ink-300">{setupSql || SETUP_SQL}</pre>
          <button type="button" className="btn-ghost gap-2 text-xs" onClick={copySql}>
            <Copy size={14} /> کپی SQL
          </button>
        </div>
      ) : null}

      {summary ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card-ay p-4">
            <p className="text-[11px] text-ink-500">اشتراک فعال</p>
            <p className="mt-1 text-2xl font-semibold text-gold-300">{summary.activePro}</p>
          </div>
          <div className="card-ay p-4">
            <p className="text-[11px] text-ink-500">کل اشتراک‌ها</p>
            <p className="mt-1 text-2xl font-semibold text-sand-50">{summary.totalSubscriptions}</p>
          </div>
          <div className="card-ay p-4">
            <p className="text-[11px] text-ink-500">پرداخت تأییدشده</p>
            <p className="mt-1 text-2xl font-semibold text-sand-50">{summary.approvedPayments}</p>
          </div>
          <div className="card-ay p-4">
            <p className="text-[11px] text-ink-500">درآمد (تومان)</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-300">{Number(summary.revenue).toLocaleString("fa-IR")}</p>
          </div>
        </div>
      ) : null}

      <div className="card-ay space-y-4 p-5">
        <div className="flex items-center gap-3">
          <UserPlus className="text-gold-400" size={20} />
          <div>
            <h3 className="font-medium text-sand-50">اعطای دستی اشتراک</h3>
            <p className="mt-1 text-xs text-ink-500">User ID یا Telegram ID + تعداد ماه</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1.5 text-xs text-ink-400">
            User ID
            <input className="input-ay" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="uuid یا id" />
          </label>
          <label className="space-y-1.5 text-xs text-ink-400">
            Telegram ID
            <input className="input-ay" value={telegramId} onChange={(e) => setTelegramId(e.target.value)} placeholder="اختیاری" />
          </label>
          <label className="space-y-1.5 text-xs text-ink-400">
            تعداد ماه
            <input className="input-ay" type="number" min={1} max={24} value={months} onChange={(e) => setMonths(Number(e.target.value) || 1)} />
          </label>
          <label className="space-y-1.5 text-xs text-ink-400">
            یادداشت
            <input className="input-ay" value={note} onChange={(e) => setNote(e.target.value)} placeholder="اختیاری" />
          </label>
        </div>
        <button type="button" className="btn-primary gap-2" disabled={busy === "grant"} onClick={() => void grant()}>
          <Crown size={16} />
          {busy === "grant" ? "در حال فعال‌سازی…" : "فعال‌سازی اشتراک"}
        </button>
      </div>

      <div className="card-ay overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[.07] p-4">
          <h3 className="text-sm font-medium text-sand-50">دانشجویان Practice</h3>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500" size={14} />
            <input
              className="input-ay !py-2 !pr-9 text-xs"
              placeholder="جستجو نام / id"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="max-h-64 overflow-auto">
          <table className="w-full text-right text-xs">
            <thead className="sticky top-0 bg-black/40 text-ink-500">
              <tr>
                <th className="p-3 font-medium">کاربر</th>
                <th className="p-3 font-medium">جلسات</th>
                <th className="p-3 font-medium">صداگذاری</th>
                <th className="p-3 font-medium">دقت میانگین</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[.05]">
              {filteredStudents.slice(0, 40).map((s) => (
                <tr key={s.user_id} className="hover:bg-white/[.02]">
                  <td className="p-3">
                    <p className="text-sand-50">{s.full_name || s.username || "—"}</p>
                    <p className="mt-0.5 select-all text-[10px] text-ink-500">{s.user_id}</p>
                  </td>
                  <td className="p-3 text-ink-300">{s.sessions}</td>
                  <td className="p-3 text-ink-300">{s.voicing_sessions}</td>
                  <td className="p-3 text-ink-300">{s.average_accuracy ? Math.round(s.average_accuracy * 100) / 100 : "—"}</td>
                </tr>
              ))}
              {!filteredStudents.length && !loading ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-ink-500">
                    دانشجویی یافت نشد
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card-ay overflow-hidden">
        <div className="border-b border-white/[.07] p-4 text-sm text-ink-400">
          اشتراک‌های فعال ({subs.filter((s) => s.status === "active").length})
        </div>
        <div className="divide-y divide-white/[.06]">
          {loading && !subs.length ? (
            <p className="p-5 text-xs text-ink-500">در حال دریافت…</p>
          ) : !subs.length ? (
            <p className="p-5 text-xs text-ink-500">اشتراک فعالی ثبت نشده</p>
          ) : (
            subs.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div>
                  <p className="text-sm text-sand-50 select-all">{s.user_id}</p>
                  <p className="mt-1 text-xs text-ink-500">
                    {s.status} · از {new Date(s.started_at).toLocaleDateString("fa-IR")} تا{" "}
                    {new Date(s.expires_at).toLocaleDateString("fa-IR")} · {Number(s.price_toman).toLocaleString("fa-IR")} تومان
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[11px] text-emerald-200">ACTIVE</span>
                  <button
                    type="button"
                    className="btn-ghost !px-3 !py-1.5 text-[11px] text-red-200"
                    disabled={busy.length > 0}
                    onClick={() => void revoke(s.id)}
                  >
                    {busy === s.id + "revoke" ? "…" : "لغو اشتراک"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card-ay overflow-hidden">
        <div className="border-b border-white/[.07] p-4 text-sm text-ink-400">
          {loading ? "در حال دریافت…" : requests.length ? `${requests.length} درخواست در انتظار` : "درخواستی در انتظار بررسی نیست"}
        </div>
        <div className="divide-y divide-white/[.06]">
          {requests.map((x) => (
            <div key={x.id} className="p-5">
              <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <p className="text-sm text-sand-50">
                    User ID: <span className="select-all">{x.user_id}</span>
                  </p>
                  <p className="mt-1 text-xs text-ink-500">
                    کد پیگیری: <strong className="select-all text-gold-300">{x.reference}</strong> ·{" "}
                    {new Date(x.created_at).toLocaleString("fa-IR")}
                  </p>
                  <p className="mt-1 text-xs text-ink-500">
                    مبلغ: {Number(x.amount_toman).toLocaleString("fa-IR")} تومان
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="btn-primary !px-4 !py-2 text-xs"
                    disabled={busy.length > 0}
                    onClick={() => void review(x.id, "approve")}
                  >
                    {busy === x.id + "approve" ? "…" : "تأیید و فعال‌سازی"}
                  </button>
                  <button
                    className="btn-ghost !px-4 !py-2 text-xs"
                    disabled={busy.length > 0}
                    onClick={() => void review(x.id, "reject")}
                  >
                    {busy === x.id + "reject" ? "…" : "رد"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
