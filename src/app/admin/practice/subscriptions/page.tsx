"use client";

import { useEffect, useMemo, useState } from "react";
import { Crown, RefreshCw, Search, UserPlus, CheckCircle2 } from "lucide-react";

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
};

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
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [search, setSearch] = useState("");
  const [selectedName, setSelectedName] = useState("");

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const [r1, r2, analyticsResponse] = await Promise.all([
        fetch("/api/admin/practice/payment-requests", { cache: "no-store", credentials: "include" }),
        fetch("/api/admin/practice/subscription", { cache: "no-store", credentials: "include" }),
        fetch("/api/admin/practice/analytics", { cache: "no-store", credentials: "include" }),
      ]);
      const analyticsData = await analyticsResponse.json().catch(() => ({}));
      const d1 = await r1.json().catch(() => ({}));
      const d2 = await r2.json().catch(() => ({}));
      if (r1.ok) setRequests(d1.requests || []);
      if (r2.ok) setSubs(d2.subscriptions || []);
      if (analyticsResponse.ok && analyticsData.ok) setAnalytics(analyticsData);
      if (!r1.ok && !r2.ok) setErr(d1.error || d2.error || "خطا در دریافت داده");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredStudents = useMemo(() => {
    const list = analytics?.students || [];
    const q = search.trim().toLowerCase();
    if (!q) return list.slice(0, 12);
    return list
      .filter((s) => {
        const name = String(s.full_name || "").toLowerCase();
        const uname = String(s.username || "").toLowerCase();
        const id = String(s.user_id || "").toLowerCase();
        return name.includes(q) || uname.includes(q) || id.includes(q);
      })
      .slice(0, 20);
  }, [analytics, search]);

  const pickStudent = (s: Student) => {
    setUserId(s.user_id);
    setSelectedName(s.full_name || s.username || s.user_id);
    setSearch(s.full_name || s.username || s.user_id);
    setMsg("");
    setErr("");
  };

  const review = async (id: string, action: "approve" | "reject") => {
    setBusy(id + action);
    try {
      const r = await fetch("/api/admin/practice/payment-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ requestId: id, action }),
      });
      if (r.ok) await load();
    } finally {
      setBusy("");
    }
  };

  const grant = async () => {
    setMsg("");
    setErr("");
    if (!userId.trim() && !telegramId.trim()) {
      setErr("اول یک هنرجو را از لیست انتخاب کن، یا User ID / Telegram ID را وارد کن.");
      return;
    }
    setBusy("grant");
    try {
      const r = await fetch("/api/admin/practice/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId: userId.trim() || telegramId.trim(),
          telegramId: telegramId.trim() || undefined,
          months,
          note: note || (selectedName ? `manual grant for ${selectedName}` : "manual admin grant"),
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) {
        setErr(d.error || "فعال‌سازی ناموفق بود.");
        return;
      }
      setMsg(d.message || "اشتراک Pro بدون پرداخت فعال شد.");
      setUserId("");
      setTelegramId("");
      setNote("");
      setSelectedName("");
      setSearch("");
      await load();
    } finally {
      setBusy("");
    }
  };

  const revoke = async (subscriptionId: string) => {
    setBusy(subscriptionId + "revoke");
    setErr("");
    setMsg("");
    try {
      const response = await fetch("/api/admin/practice/subscription", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ subscriptionId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        setErr(data.error || "لغو اشتراک ناموفق بود.");
        return;
      }
      setMsg("اشتراک Pro هنرجو لغو شد و در پروفایل او اعمال شد.");
      await load();
    } finally {
      setBusy("");
    }
  };

  const activeNow = subs.filter((s) => s.status === "active" && new Date(s.expires_at) > new Date());

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">PRACTICE / PRO</p>
          <h1 className="mt-2 text-2xl font-semibold text-sand-50">اشتراک Practice Pro</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-ink-400">
            بدون پرداخت می‌توانی دستی Pro بدهی: هنرجو را جستجو کن → انتخاب کن → تعداد ماه را بزن → «فعال‌سازی Pro».
            تغییر فوری در پروفایل تمرین و وضعیت Pro دیده می‌شود.
          </p>
        </div>
        <button type="button" className="btn-ghost !px-3 !py-2" onClick={() => void load()} aria-label="به‌روزرسانی">
          <RefreshCw size={15} />
        </button>
      </div>

      <div className="rounded-2xl border border-gold-400/25 bg-gold-400/[.06] p-5">
        <div className="flex items-start gap-3">
          <UserPlus className="mt-0.5 shrink-0 text-gold-300" size={20} />
          <div className="space-y-2 text-sm leading-7 text-ink-300">
            <p className="font-medium text-sand-50">نحوه فعال‌سازی دستی (بدون کارت‌به‌کارت)</p>
            <ol className="list-decimal pr-5 text-ink-400">
              <li>نام یا بخشی از نام هنرجو را در کادر جستجو بنویس.</li>
              <li>روی ردیف هنرجو کلیک کن تا شناسه‌اش پر شود.</li>
              <li>تعداد ماه (۱ تا ۱۲) را انتخاب کن و «فعال‌سازی Pro» را بزن.</li>
              <li>اگر فقط Telegram ID داری، همان را در فیلد جداگانه وارد کن.</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="card-ay p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Crown size={18} className="text-gold-300" />
          <h2 className="text-lg font-medium text-sand-50">فعال‌سازی دستی اشتراک</h2>
        </div>

        <div className="mt-4">
          <label className="mb-2 flex items-center gap-2 text-xs text-ink-500">
            <Search size={14} /> جستجوی هنرجو (نام / یوزرنیم / User ID)
          </label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="مثلاً: علی · mehdi · uuid..."
            className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-sand-50 outline-none focus:border-gold-400/40"
          />
          {filteredStudents.length > 0 && (
            <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-white/[.08] divide-y divide-white/[.06]">
              {filteredStudents.map((s) => (
                <button
                  key={s.user_id}
                  type="button"
                  onClick={() => pickStudent(s)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-right transition hover:bg-white/[.04] ${
                    userId === s.user_id ? "bg-gold-400/10" : ""
                  }`}
                >
                  <div>
                    <strong className="block text-sm text-sand-50">{s.full_name || s.username || "بدون نام"}</strong>
                    <span className="mt-0.5 block text-[11px] text-ink-500">
                      {s.sessions} جلسه · دقت {s.average_accuracy}%
                    </span>
                  </div>
                  <span className="max-w-[40%] truncate font-mono text-[10px] text-gold-300/80">{s.user_id}</span>
                </button>
              ))}
            </div>
          )}
          {search.trim() && filteredStudents.length === 0 && (
            <p className="mt-2 text-xs text-ink-500">هنرجویی با این عبارت پیدا نشد. می‌توانی User ID را دستی وارد کنی.</p>
          )}
        </div>

        {selectedName && (
          <p className="mt-3 flex items-center gap-2 text-sm text-emerald-200">
            <CheckCircle2 size={16} /> انتخاب‌شده: <strong>{selectedName}</strong>
          </p>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value);
              setSelectedName("");
            }}
            placeholder="User ID (خودکار پر می‌شود)"
            className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-sand-50 outline-none focus:border-gold-400/40"
          />
          <input
            value={telegramId}
            onChange={(e) => setTelegramId(e.target.value)}
            placeholder="Telegram ID (اختیاری — alias)"
            className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-sand-50 outline-none focus:border-gold-400/40"
          />
          <select
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-sand-50 outline-none focus:border-gold-400/40"
          >
            {[1, 2, 3, 6, 12].map((m) => (
              <option key={m} value={m}>
                {m} ماه
              </option>
            ))}
          </select>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="یادداشت (اختیاری)"
            className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-sand-50 outline-none focus:border-gold-400/40 sm:col-span-2"
          />
          <button type="button" className="btn-primary" disabled={busy === "grant"} onClick={() => void grant()}>
            {busy === "grant" ? "…" : "فعال‌سازی Pro (بدون پرداخت)"}
          </button>
        </div>
        {msg && <p className="mt-3 text-sm text-emerald-200">{msg}</p>}
        {err && <p className="mt-3 text-sm text-red-300">{err}</p>}
      </div>

      {analytics ? (
        <div className="space-y-4">
          <div>
            <p className="eyebrow">PRACTICE ANALYTICS</p>
            <h2 className="mt-2 text-xl font-semibold text-sand-50">گزارش استفاده و تمدید</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card-ay p-4">
              <span className="text-xs text-ink-500">کل جلسات</span>
              <strong className="mt-2 block text-2xl text-sand-50">{analytics.summary.totalSessions.toLocaleString("fa-IR")}</strong>
            </div>
            <div className="card-ay p-4">
              <span className="text-xs text-ink-500">جلسات Voicing</span>
              <strong className="mt-2 block text-2xl text-cyan-200">{analytics.summary.voicingSessions.toLocaleString("fa-IR")}</strong>
            </div>
            <div className="card-ay p-4">
              <span className="text-xs text-ink-500">Pro فعال</span>
              <strong className="mt-2 block text-2xl text-emerald-200">{analytics.summary.activePro.toLocaleString("fa-IR")}</strong>
            </div>
            <div className="card-ay p-4">
              <span className="text-xs text-ink-500">تمدیدها</span>
              <strong className="mt-2 block text-2xl text-gold-300">{analytics.summary.renewals.toLocaleString("fa-IR")}</strong>
            </div>
          </div>
        </div>
      ) : null}

      <div className="card-ay overflow-hidden">
        <div className="border-b border-white/[.07] p-4 text-sm text-ink-400">
          {loading ? "در حال دریافت…" : `${activeNow.length} اشتراک فعال`}
        </div>
        <div className="divide-y divide-white/[.06]">
          {activeNow.length === 0 && !loading ? (
            <p className="p-5 text-sm text-ink-500">هنوز اشتراک فعالی ثبت نشده.</p>
          ) : (
            activeNow.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div>
                  <p className="text-sm text-sand-50">
                    User ID: <span className="select-all text-gold-300">{s.user_id}</span>
                  </p>
                  <p className="mt-1 text-xs text-ink-500">
                    از {new Date(s.started_at).toLocaleDateString("fa-IR")} تا{" "}
                    {new Date(s.expires_at).toLocaleDateString("fa-IR")} ·{" "}
                    {Number(s.price_toman).toLocaleString("fa-IR")} تومان
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] text-emerald-200">
                    ACTIVE
                  </span>
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
          {loading
            ? "در حال دریافت…"
            : requests.length
              ? `${requests.length} درخواست در انتظار`
              : "درخواستی در انتظار بررسی نیست"}
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
