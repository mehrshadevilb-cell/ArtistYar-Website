"use client";

import { useEffect, useState } from "react";
import { Check, Clock3, X } from "lucide-react";

type Reservation = { id: number; student_id: number; student_name: string; course_name: string; requested_date: string; requested_time: string; status: string; payment_proof: string | null; admin_notes: string | null; created_at: string };
const labels: Record<string, string> = { payment_submitted: "رسید ارسال شده", pending: "در انتظار بررسی" };

export default function AdminReservationsPage() {
  const [rows, setRows] = useState<Reservation[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);

  async function load() {
    setLoading(true); setError("");
    try { const response = await fetch("/api/rahyar/admin/reservations", { cache: "no-store", credentials: "include" }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "دریافت رزروها ناموفق بود."); setRows(Array.isArray(data) ? data : []); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "دریافت رزروها ناموفق بود."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function review(row: Reservation, action: "confirm" | "reject") {
    const notes = action === "reject" ? window.prompt("دلیل رد رزرو را وارد کن:", "مدرک پرداخت قابل تأیید نیست") : null;
    if (action === "reject" && notes === null) return;
    setBusy(row.id); setError(""); setMessage("");
    try { const response = await fetch("/api/rahyar/admin/reservations", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: row.id, action, notes }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || data.detail || "عملیات ناموفق بود."); setMessage(data.message || "عملیات انجام شد."); setRows((items) => items.filter((item) => item.id !== row.id)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "عملیات ناموفق بود."); }
    finally { setBusy(null); }
  }

  return <div className="space-y-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">/ بررسی رزرو</p><h2 className="mt-3 text-2xl font-semibold text-sand-50">صف رزروهای نیازمند بررسی</h2><p className="mt-2 text-sm leading-7 text-ink-400">فقط رزروهای دارای رسید پرداخت نمایش داده می‌شوند؛ تأیید از همین‌جا وضعیت مشترک ربات و سایت را تغییر می‌دهد.</p></div><button type="button" className="btn-ghost !px-4" onClick={() => void load()} disabled={loading}>به‌روزرسانی</button></div>{error ? <p className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs leading-6 text-red-300" role="alert">{error}</p> : null}{message ? <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs leading-6 text-emerald-300" role="status">{message}</p> : null}{loading ? <div className="card-ay p-6 text-sm text-ink-400">در حال دریافت رزروها…</div> : null}{!loading && !rows.length ? <div className="card-ay p-6 text-sm leading-7 text-ink-400">رزرو معلقی برای بررسی وجود ندارد.</div> : null}<div className="grid gap-4 lg:grid-cols-2">{rows.map((row) => <article key={row.id} className="card-ay p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-ink-500">رزرو #{row.id} · هنرجو #{row.student_id}</p><h3 className="mt-2 text-base font-medium text-sand-50">{row.student_name || "بدون نام"}</h3><p className="mt-1 text-sm text-gold-400">{row.course_name}</p></div><span className="rounded-full bg-amber-400/10 px-2.5 py-1 text-[10px] text-amber-300">{labels[row.status] || row.status}</span></div><div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-white/[.06] bg-white/[.02] p-3 text-xs"><div><span className="text-ink-500">تاریخ</span><p className="mt-1 text-sand-100" dir="ltr">{row.requested_date}</p></div><div><span className="text-ink-500">ساعت</span><p className="mt-1 text-sand-100" dir="ltr">{row.requested_time}</p></div></div>{row.payment_proof ? <p className="mt-3 truncate text-xs text-ink-400">مدرک پرداخت: <span dir="ltr">{row.payment_proof}</span></p> : null}<div className="mt-4 flex gap-2"><button type="button" className="btn-primary flex-1 !px-3 !py-2 text-xs" onClick={() => void review(row, "confirm")} disabled={busy === row.id}><Check size={14} />تأیید رزرو</button><button type="button" className="btn-ghost flex-1 !border-red-300/20 !px-3 !py-2 text-xs !text-red-300" onClick={() => void review(row, "reject")} disabled={busy === row.id}><X size={14} />رد رزرو</button></div><p className="mt-3 flex items-center gap-1 text-[10px] text-ink-500"><Clock3 size={12} />ثبت شده: {row.created_at ? new Date(row.created_at).toLocaleString("fa-IR") : "—"}</p></article>)}</div></div>;
}
