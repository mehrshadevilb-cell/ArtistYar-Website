"use client";

import { useEffect, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

export function ProGate({ onBack, title, body }: { onBack: () => void; title: string; body: string }) {
  const { user } = useAuth();
  const [pro, setPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [reference, setReference] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (user?.role === "admin") {
      setPro(true);
      setLoading(false);
      return;
    }
    if (!user?.id) {
      setPro(false);
      setLoading(false);
      return;
    }
    fetch("/api/practice/status?userId=" + encodeURIComponent(user.id), { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setPro(Boolean(d?.pro)); })
      .catch(() => { if (!cancelled) setPro(false); })
      .finally(() => { if (!cancelled) setLoading(false); });
    fetch("/api/practice/payment-request", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setCardNumber(d?.cardNumber || "");
        setCardHolder(d?.cardHolder || "");
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user?.id, user?.role]);

  async function submit() {
    if (!user?.id || !reference.trim()) {
      setError("وارد حساب شو و کد پیگیری را وارد کن.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/practice/payment-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId: user.id, reference: reference.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error || "ثبت ناموفق بود.");
        return;
      }
      setSent(true);
    } catch {
      setError("ارتباط برقرار نشد.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <section className="mt-10">
        <button type="button" className="btn-ghost" onClick={onBack}>بازگشت</button>
        <div className="card-ay mt-5 p-8 text-center">در حال بررسی Pro…</div>
      </section>
    );
  }

  if (pro) {
    return (
      <section className="mt-10">
        <button type="button" className="btn-ghost" onClick={onBack}>بازگشت</button>
        <div className="card-ay mt-5 p-8">
          <p className="eyebrow text-emerald-200">PRO ACTIVE</p>
          <h1 className="mt-3 text-2xl text-sand-50">{title}</h1>
          <p className="mt-3 text-sm leading-8 text-ink-400">{body}</p>
          <p className="mt-4 text-sm text-emerald-200">اشتراک Pro فعال است.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-10">
      <button type="button" className="btn-ghost" onClick={onBack}>بازگشت</button>
      <div className="card-ay mt-5 p-8 text-center">
        <LockKeyhole className="mx-auto text-gold-300" size={34} />
        <p className="eyebrow mt-5">PRACTICE PRO · ۴۰٬۰۰۰ تومان / ماه</p>
        <h1 className="mt-3 text-2xl font-semibold text-sand-50">{title}</h1>
        <p className="mt-3 text-sm leading-8 text-ink-400">{body}</p>
        <div className="mx-auto mt-6 max-w-md rounded-2xl border border-gold-400/20 p-5 text-right">
          <p className="text-xs text-ink-500">کارت‌به‌کارت</p>
          <strong className="mt-1 block text-sand-100" dir="ltr">{cardNumber || "شماره کارت در env"}</strong>
          <strong className="mt-1 block text-sm text-sand-100">{cardHolder || "صاحب کارت"}</strong>
          {sent ? (
            <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/[.06] p-4 text-sm text-emerald-200">درخواست ثبت شد؛ پس از تأیید ادمین، Pro فعال می‌شود.</div>
          ) : (
            <>
              <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="کد پیگیری / شماره تراکنش" className="mt-4 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-sand-50 outline-none focus:border-gold-400/40" />
              <button type="button" className="btn-primary mt-3 w-full" onClick={submit} disabled={busy}>{busy ? "در حال ثبت…" : "ثبت پرداخت"}</button>
              {error && <p className="mt-3 text-xs text-red-300">{error}</p>}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
