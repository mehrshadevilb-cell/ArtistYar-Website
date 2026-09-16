"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import type { LiveProduct } from "@/components/LiveProductCard";
import { SectionHeading } from "@/components/SectionHeading";
import { StatusChip } from "@/components/StatusChip";
import { uploadOrderReceipt } from "@/lib/rahyar-api";

export default function CoursesPage() {
  const [items, setItems] = useState<LiveProduct[]>([]);
  const [source, setSource] = useState("در حال بارگذاری…");
  const [selected, setSelected] = useState<LiveProduct | null>(null);
  const [msg, setMsg] = useState("");
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [orderPhone, setOrderPhone] = useState("");
  const [cardNumber, setCardNumber] = useState<string | null>(null);
  const [cardHolder, setCardHolder] = useState<string | null>(null);
  const [cardCopied, setCardCopied] = useState(false);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [receiptMsg, setReceiptMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/rahyar/products").then((r) => r.json()).then((data) => {
      setSource(data.source || "unknown"); setItems(data.items || []);
    }).catch(() => setSource("خطا در دریافت مسیرها"));
  }, []);

  async function onOrder(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!selected) return;
    setBusy(true); setMsg(""); setPaymentId(null); setReceipt(null); setReceiptMsg(""); setCardNumber(null); setCardHolder(null); setCardCopied(false);
    const fd = new FormData(e.currentTarget); const phone = String(fd.get("phone") || "");
    try {
      const res = await fetch("/api/rahyar/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ product_id: selected.id, full_name: fd.get("full_name"), phone, note: fd.get("note") || undefined }) });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.error || data.detail || "ثبت سفارش ناموفق بود.");
      setMsg(`${data.message || "ثبت شد."}\nشماره پرداخت: ${data.payment_id}\nمبلغ: ${Number(data.amount || 0).toLocaleString("fa-IR")} تومان`);
      setCardNumber(data.card?.number || null); setCardHolder(data.card?.holder || null);
      setPaymentId(Number(data.payment_id)); setOrderPhone(phone);
    } catch (error) { setMsg(error instanceof Error ? error.message : "ثبت سفارش ناموفق بود."); }
    finally { setBusy(false); }
  }

  async function onReceipt(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!paymentId || !receipt) return;
    setReceiptBusy(true); setReceiptMsg("");
    try { const result = await uploadOrderReceipt(paymentId, orderPhone, receipt); setReceiptMsg(result.message || "رسید با موفقیت ارسال شد."); }
    catch (error) { setReceiptMsg(error instanceof Error ? error.message : "ارسال رسید ناموفق بود."); }
    finally { setReceiptBusy(false); }
  }

  return <section className="container-ay py-16">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><SectionHeading eyebrow="مسیرهای آموزشی" title="تنظیم، میکس و مسترینگ؛ درست و اصولی" subtitle="مسیرت را انتخاب کن، تمرین کن و هر چیزی که یاد می‌گیری روی پروژه واقعی اجرا کن." /><StatusChip tone={source === "rahyar" ? "ok" : "warn"}>{source === "rahyar" ? "کاتالوگ زنده" : source}</StatusChip></div>
    <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((item) => <article key={item.id} id={`p-${item.id}`} className="card-ay flex h-full flex-col p-6"><div className="flex items-start justify-between gap-3"><StatusChip tone="gold">{item.delivery_type === "telegram" ? "کانال تلگرام" : "دوره دیجیتال"}</StatusChip><StatusChip tone={item.is_active === false ? "warn" : "ok"}>{item.is_active === false ? "غیرفعال" : "فعال"}</StatusChip></div><h3 className="mt-5 text-xl font-semibold text-sand-50">{item.title}</h3><p className="mt-3 flex-1 text-sm leading-7 text-ink-400">{item.description || "آموزش کاربردی برای ساختن موسیقی بهتر."}</p><div className="mt-6 flex items-center justify-between border-t border-white/[0.06] pt-4"><span className="text-sm font-medium text-gold-400">{item.price > 0 ? `${item.price.toLocaleString("fa-IR")} تومان` : "—"}</span><button type="button" className="text-xs text-sand-100 underline-offset-4 hover:text-gold-300 hover:underline" aria-label={`شروع مسیر ${item.title}`} disabled={item.is_active === false} onClick={() => { setSelected(item); setMsg(""); }}>شروع مسیر</button></div></article>)}</div>
    {selected ? <div className="card-ay mx-auto mt-12 max-w-lg p-7"><div className="flex items-start justify-between gap-3"><h3 className="text-lg font-medium text-sand-50">شروع مسیر: {selected.title}</h3><StatusChip tone="gold">پرداخت کارت‌به‌کارت</StatusChip></div><p className="mt-2 text-xs leading-6 text-ink-500">مشخصاتت را وارد کن، سپس شماره کارت مقصد و امکان بارگذاری رسید را همین‌جا می‌بینی. بررسی نهایی توسط تیم آرتیست‌یار انجام می‌شود.</p><form className="mt-5 space-y-3" onSubmit={onOrder}><input className="input-ay" name="full_name" placeholder="نام کامل…" autoComplete="name" required /><input className="input-ay" name="phone" type="tel" inputMode="tel" placeholder="09xxxxxxxxx…" autoComplete="tel" required /><input className="input-ay" name="note" placeholder="الان روی چه چیزی کار می‌کنی؟ (اختیاری)…" /><div className="flex gap-2"><button type="submit" className="btn-primary flex-1" disabled={busy}>{busy ? "در حال ثبت…" : "نمایش اطلاعات پرداخت"}</button><button type="button" className="btn-ghost" onClick={() => setSelected(null)}>بستن</button></div></form>{msg ? <div className="mt-5 rounded-2xl border border-gold-500/20 bg-gold-500/[.06] p-4" aria-live="polite"><pre className="whitespace-pre-wrap text-xs leading-6 text-gold-300">{msg}</pre>{cardNumber ? <div className="mt-4 rounded-xl border border-gold-500/20 bg-black/20 p-3"><p className="text-xs text-ink-400">شماره کارت مقصد{cardHolder ? ` — ${cardHolder}` : ""}</p><div className="mt-2 flex items-center gap-2"><code dir="ltr" className="flex-1 text-sm tracking-wider text-gold-300">{cardNumber}</code><button type="button" className="btn-ghost !px-3 !py-2 text-xs" onClick={() => { void navigator.clipboard.writeText(cardNumber).then(() => { setCardCopied(true); window.setTimeout(() => setCardCopied(false), 1800); }); }}>{cardCopied ? "کپی شد" : "کپی"}</button></div></div> : null}</div> : null}{paymentId ? <form className="mt-5 space-y-3 border-t border-white/[.07] pt-5" onSubmit={onReceipt}><div><p className="text-sm font-medium text-sand-50">رسید پرداخت را همین‌جا ارسال کن</p><p className="mt-1 text-xs leading-6 text-ink-500">فرمت‌های مجاز: تصویر یا PDF، حداکثر ۱۰ مگابایت.</p></div><input className="block w-full rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-ink-300 file:mr-3 file:rounded-lg file:border-0 file:bg-gold-500/15 file:px-3 file:py-2 file:text-gold-300" type="file" accept="image/*,.pdf,application/pdf" required onChange={(e) => setReceipt(e.target.files?.[0] || null)} /><button type="submit" className="btn-primary w-full" disabled={receiptBusy || !receipt}>{receiptBusy ? "در حال ارسال رسید…" : "ارسال رسید برای بررسی"}</button>{receiptMsg ? <p className="rounded-xl bg-emerald-500/10 p-3 text-xs leading-6 text-emerald-300" aria-live="polite">{receiptMsg}</p> : null}</form> : null}{paymentId ? <Link href={`/track?payment_id=${paymentId}`} className="mt-4 inline-flex text-xs text-sand-100 underline decoration-gold-500/60 underline-offset-4 hover:text-gold-300">پیگیری وضعیت سفارش</Link> : null}</div> : null}
  </section>;
}
