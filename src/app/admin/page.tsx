"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Check = { id: string; label: string; ok: boolean; detail: string };
type Problem = { severity: string };
type Payment = { status?: string };
type Reservation = { status?: string };

export default function AdminHomePage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [checks, setChecks] = useState<Check[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/rahyar/admin/payments", { credentials: "include", cache: "no-store" }).then((r) => r.json()),
      fetch("/api/rahyar/admin/reservations", { credentials: "include", cache: "no-store" }).then((r) => r.json()),
      fetch("/api/admin/diagnostics", { credentials: "include", cache: "no-store" }).then((r) => r.json()),
      fetch("/api/admin/problems", { credentials: "include", cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([p, r, d, pr]) => {
        setPayments(Array.isArray(p) ? p : p.payments || []);
        setReservations(Array.isArray(r) ? r : r.reservations || []);
        setChecks(d.checks || []);
        setProblems(pr.problems || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const success = payments.filter((p) => ["success", "successful", "paid", "confirmed"].includes(String(p.status))).length;
  const pending = payments.filter((p) => ["pending", "submitted", "payment_submitted"].includes(String(p.status))).length;
  const critical = problems.filter((p) => ["critical", "high"].includes(p.severity)).length;

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">/ مرکز کنترل</p>
        <h2 className="mt-3 text-2xl font-semibold text-sand-50">پیشخوان</h2>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-ink-400">
          خلاصه وضعیت عملیاتی سایت؛ جزئیات هر حوزه داخل چهار workspace اصلی مدیریت می‌شود.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric t="پرداخت موفق" v={loading ? "…" : success} />
        <Metric t="پرداخت نیازمند بررسی" v={loading ? "…" : pending} />
        <Metric t="رزروها" v={loading ? "…" : reservations.length} />
        <Metric t="مشکلات مهم" v={loading ? "…" : critical} />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          ["کاربران و آموزش", "/admin/users"],
          ["فروش و رزرو", "/admin/commerce"],
          ["مدیریت سایت و سیستم", "/admin/manage"],
        ].map(([label, href]) => (
          <Link key={href} href={href} className="card-ay p-5 hover:border-gold-500/30">
            <p className="font-medium text-sand-50">{label}</p>
            <p className="mt-2 text-xs text-ink-500">ورود به workspace ←</p>
          </Link>
        ))}
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-medium text-sand-50">سلامت سرویس‌ها</h3>
        {checks.map((check) => (
          <div key={check.id} className="card-ay flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm text-sand-50">{check.label}</p>
              <p className="mt-1 text-xs text-ink-500">{check.detail}</p>
            </div>
            <span className={check.ok ? "text-emerald-400" : "text-red-400"}>{check.ok ? "OK" : "FAIL"}</span>
          </div>
        ))}
      </section>
    </div>
  );
}

function Metric({ t, v }: { t: string; v: string | number }) {
  return (
    <div className="card-ay p-5">
      <p className="text-xs text-ink-500">{t}</p>
      <p className="mt-2 text-2xl font-semibold text-sand-50">{v}</p>
    </div>
  );
}
