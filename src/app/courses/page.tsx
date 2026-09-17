"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, Copy, ShieldCheck } from "lucide-react";
import type { LiveProduct } from "@/components/LiveProductCard";
import { SectionHeading } from "@/components/SectionHeading";
import { StatusChip } from "@/components/StatusChip";
import { uploadOrderReceipt } from "@/lib/rahyar-api";

function coverTone(title: string): string {
  if (title.includes("راه‌یار") || title.includes("راهیار")) return "from-gold-500/25 via-amber-900/20 to-ink-950";
  if (title.includes("تئوری")) return "from-sky-500/20 via-indigo-900/25 to-ink-950";
  if (title.includes("آرتیست")) return "from-violet-500/20 via-fuchsia-900/20 to-ink-950";
  return "from-white/10 via-white/[0.03] to-ink-950";
}

export default function CoursesPage() {
  const [items, setItems] = useState<LiveProduct[]>([]);
  const [source, setSource] = useState("در حال بارگذاری…");
  const [selected, setSelected] = useState<LiveProduct | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [orderPhone, setOrderPhone] = useState("");
  const [cardNumber, setCardNumber] = useState<string | null>(null);
  const [cardHolder, setCardHolder] = useState<string | null>(null);
  const [cardCopied, setCardCopied] = useState(false);
  const [copyToast, setCopyToast] = useState(false);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [receiptMsg, setReceiptMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/rahyar/products")
      .then((r) => r.json())
      .then((data) => {
        setSource(data.source || "unknown");
        setItems(data.items || []);
      })
      .catch(() => setSource("خطا در دریافت مسیرها"));
  }, []);

  async function onOrder(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    setMsg("");
    setPaymentId(null);
    setReceipt(null);
    setReceiptMsg("");
    setCardNumber(null);
    setCardHolder(null);
    setCardCopied(false);
    const fd = new FormData(e.currentTarget);
    const phone = String(fd.get("phone") || "");
    try {
      const res = await fetch("/api/rahyar/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: selected.id,
          full_name: fd.get("full_name"),
          phone,
          note: fd.get("note") || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.error || data.detail || "ثبت سفارش ناموفق بود.");
      setMsg(
        `${data.message || "ثبت شد."}\nشماره پرداخت: ${data.payment_id}\nمبلغ: ${Number(data.amount || 0).toLocaleString("fa-IR")} تومان`,
      );
      setCardNumber(data.card?.number || null);
      setCardHolder(data.card?.holder || null);
      setPaymentId(Number(data.payment_id));
      setOrderPhone(phone);
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "ثبت سفارش ناموفق بود.");
    } finally {
      setBusy(false);
    }
  }

  async function onReceipt(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!paymentId || !receipt) return;
    setReceiptBusy(true);
    setReceiptMsg("");
    try {
      const result = await uploadOrderReceipt(paymentId, orderPhone, receipt);
      setReceiptMsg(result.message || "رسید با موفقیت ارسال شد.");
    } catch (error) {
      setReceiptMsg(error instanceof Error ? error.message : "ارسال رسید ناموفق بود.");
    } finally {
      setReceiptBusy(false);
    }
  }

  async function copyCardNumber() {
    if (!cardNumber) return;
    try {
      await navigator.clipboard.writeText(cardNumber);
      setCardCopied(true);
      setCopyToast(true);
      window.setTimeout(() => setCardCopied(false), 1800);
      window.setTimeout(() => setCopyToast(false), 2800);
    } catch {
      setCopyToast(false);
    }
  }

  function detailFor(item: LiveProduct) {
    const title = item.title.trim();
    if (title.includes("راه‌یار") || title.includes("راهیار")) {
      return {
        intro:
          "بسته کامل آموزش تنظیم، میکس و مسترینگ؛ برای وقتی که می‌خواهی مسیر تولید موسیقی را از پایه تا خروجی نهایی منظم جلو ببری.",
        points: [
          "مبانی تولید موسیقی و تصمیم‌گیری درست در پروژه",
          "تنظیم، انتخاب صدا، لایه‌گذاری و ساختار قطعه",
          "میکس و مسترینگ با تمرکز روی شنیدن و حل مسئله",
        ],
        access: "دسترسی آموزشی از طریق SpotPlayer بعد از تأیید پرداخت",
      };
    }
    if (title.includes("تئوری")) {
      return {
        intro:
          "برای اینکه ملودی، آکورد و ساختار را از روی حدس انتخاب نکنی؛ تئوری را کاربردی و در ارتباط با تولید موسیقی یاد می‌گیری.",
        points: [
          "هارمونی، ریتم و ساختار قطعه",
          "ساخت ملودی و انتخاب آکورد با درک روشن‌تر",
          "تمرین گوش‌نوازی برای تصمیم‌های موسیقایی دقیق‌تر",
        ],
        access: "دسترسی آموزشی از طریق SpotPlayer بعد از تأیید پرداخت",
      };
    }
    return {
      intro:
        "دسترسی به محتوای اختصاصی آرتیست‌یار برای هنرجویی که می‌خواهد روی ضبط، ادیت و فایل‌های واقعی تولید موسیقی بیشتر تمرین کند.",
      points: [
        "کانال محتوای ضبط و ادیت",
        "فایل‌ها و منابع کاربردی برای تمرین",
        "همراهی و پشتیبانی در فضای تلگرام",
      ],
      access: "دسترسی به کانال‌های تلگرام پس از تأیید پرداخت",
    };
  }

  return (
    <section className="container-ay py-16 sm:py-20">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading
          eyebrow="محصولات آکادمی راه‌یار"
          title="مسیرت را از جای درست شروع کن"
          subtitle="هر محصول برای یک مرحله از یادگیری طراحی شده؛ توضیحات را ببین، مسیر مناسب را انتخاب کن و درخواستت را برای تأیید در راه‌یار بفرست."
        />
        <StatusChip tone={source === "rahyar" ? "ok" : "warn"}>
          {source === "rahyar" ? "کاتالوگ زنده" : source}
        </StatusChip>
      </div>

      <div className="product-grid mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => {
          const detail = detailFor(item);
          const isExpanded = expandedId === item.id;
          const hasImage = Boolean(item.thumbnail);
          return (
            <article key={item.id} id={`p-${item.id}`} className="card-ay flex h-full flex-col overflow-hidden">
              <div className="relative aspect-[16/10] overflow-hidden border-b border-white/[0.06]">
                {hasImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.thumbnail!}
                    alt={item.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className={`flex h-full w-full items-end justify-between bg-gradient-to-br p-5 ${coverTone(item.title)}`}>
                    <span className="text-4xl font-semibold tracking-tight text-sand-50/90">
                      {item.title.replace(/\s+/g, "").slice(0, 1)}
                    </span>
                    <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] text-ink-300 backdrop-blur-sm">
                      {item.delivery_type === "telegram" ? "تلگرام" : "دیجیتال"}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-start justify-between gap-3">
                  <StatusChip tone="gold">
                    {item.delivery_type === "telegram" ? "کانال تلگرام" : "دوره دیجیتال"}
                  </StatusChip>
                  <StatusChip tone={item.is_active === false ? "warn" : "ok"}>
                    {item.is_active === false ? "غیرفعال" : "فعال"}
                  </StatusChip>
                </div>
                <h3 className="mt-5 text-xl font-semibold text-sand-50">{item.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-7 text-ink-400">
                  {item.description || detail.intro}
                </p>
                <button
                  type="button"
                  className="mt-4 inline-flex items-center gap-1 self-start text-xs text-gold-400 hover:text-gold-300"
                  aria-expanded={isExpanded}
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  جزئیات مسیر{" "}
                  <ChevronDown
                    size={14}
                    className={isExpanded ? "rotate-180 transition-transform" : "transition-transform"}
                  />
                </button>
                {isExpanded ? (
                  <div className="course-detail mt-4 border-t border-white/[.07] pt-4">
                    <p className="text-xs leading-6 text-ink-300">{detail.intro}</p>
                    <ul className="mt-3 space-y-2 text-xs leading-6 text-ink-400">
                      {detail.points.map((point) => (
                        <li key={point} className="flex gap-2">
                          <Check size={14} className="mt-1 shrink-0 text-gold-400" />
                          {point}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 flex gap-2 text-[11px] leading-5 text-ink-500">
                      <ShieldCheck size={14} className="mt-0.5 shrink-0 text-gold-500" />
                      {detail.access}
                    </p>
                  </div>
                ) : null}
                <div className="mt-6 flex items-center justify-between border-t border-white/[0.06] pt-4">
                  <span className="text-sm font-medium text-gold-400">
                    {item.price > 0 ? `${item.price.toLocaleString("fa-IR")} تومان` : "—"}
                  </span>
                  <button
                    type="button"
                    className="text-xs text-sand-100 underline-offset-4 hover:text-gold-300 hover:underline"
                    aria-label={`شروع مسیر ${item.title}`}
                    disabled={item.is_active === false}
                    onClick={() => {
                      setSelected(item);
                      setMsg("");
                    }}
                  >
                    شروع مسیر
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {selected ? (
        <div className="card-ay mx-auto mt-12 max-w-lg p-7">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-medium text-sand-50">شروع مسیر: {selected.title}</h3>
            <StatusChip tone="gold">پرداخت و تأیید</StatusChip>
          </div>
          <p className="mt-2 text-xs leading-6 text-ink-500">
            مشخصاتت را وارد کن، سپس شماره کارت مقصد و امکان بارگذاری رسید را همین‌جا می‌بینی. پرداخت در راه‌یار بررسی
            می‌شود و بعد از تأیید، دسترسی مناسب محصول برایت فعال خواهد شد.
          </p>
          <form className="mt-5 space-y-3" onSubmit={onOrder}>
            <input className="input-ay" name="full_name" placeholder="نام کامل…" autoComplete="name" required />
            <input
              className="input-ay"
              name="phone"
              type="tel"
              inputMode="tel"
              placeholder="09xxxxxxxxx…"
              autoComplete="tel"
              required
            />
            <input className="input-ay" name="note" placeholder="الان روی چه چیزی کار می‌کنی؟ (اختیاری)…" />
            <div className="flex gap-2">
              <button type="submit" className="btn-primary flex-1" disabled={busy}>
                {busy ? "در حال ثبت…" : "نمایش اطلاعات پرداخت"}
              </button>
              <button type="button" className="btn-ghost" onClick={() => setSelected(null)}>
                بستن
              </button>
            </div>
          </form>
          {msg ? (
            <div className="mt-5 rounded-2xl border border-gold-500/20 bg-gold-500/[.06] p-4" aria-live="polite">
              <pre className="whitespace-pre-wrap text-xs leading-6 text-gold-300">{msg}</pre>
              {cardNumber ? (
                <div className="mt-4 rounded-2xl border border-gold-400/20 bg-gradient-to-br from-gold-400/[.12] via-black/20 to-amber-950/20 p-3 shadow-[0_10px_30px_rgba(214,166,74,.08)]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium text-gold-200">شماره کارت مقصد</p>
                    {cardHolder ? <span className="text-[11px] text-ink-400">{cardHolder}</span> : null}
                  </div>
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-black/25 p-1.5 pl-2">
                    <button
                      type="button"
                      aria-label="کپی مستقیم شماره کارت"
                      className="flex-1 cursor-copy rounded-lg px-2 py-2 text-left transition hover:bg-white/[.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300/70"
                      onClick={() => void copyCardNumber()}
                    >
                      <code dir="ltr" className="block text-sm font-medium tracking-[.12em] text-sand-50">
                        {cardNumber}
                      </code>
                    </button>
                    <button
                      type="button"
                      aria-label="کپی شماره کارت"
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300/70 ${
                        cardCopied
                          ? "bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-300/30"
                          : "bg-gold-300 text-[#211b10] hover:bg-gold-200 hover:shadow-[0_6px_18px_rgba(240,194,92,.25)] active:scale-95"
                      }`}
                      onClick={() => void copyCardNumber()}
                    >
                      {cardCopied ? <Check size={14} strokeWidth={2.5} /> : <Copy size={14} strokeWidth={2.2} />}
                      {cardCopied ? "کپی شد" : "کپی شماره"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
          {paymentId ? (
            <form className="mt-5 space-y-3 border-t border-white/[.07] pt-5" onSubmit={onReceipt}>
              <div>
                <p className="text-sm font-medium text-sand-50">رسید پرداخت را همین‌جا ارسال کن</p>
                <p className="mt-1 text-xs leading-6 text-ink-500">فرمت‌های مجاز: تصویر یا PDF، حداکثر ۱۰ مگابایت.</p>
              </div>
              <input
                className="block w-full rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-ink-300 file:mr-3 file:rounded-lg file:border-0 file:bg-gold-500/15 file:px-3 file:py-2 file:text-gold-300"
                type="file"
                accept="image/*,.pdf,application/pdf"
                required
                onChange={(e) => setReceipt(e.target.files?.[0] || null)}
              />
              <button type="submit" className="btn-primary w-full" disabled={receiptBusy || !receipt}>
                {receiptBusy ? "در حال ارسال رسید…" : "ارسال رسید برای بررسی"}
              </button>
              {receiptMsg ? (
                <p className="rounded-xl bg-emerald-500/10 p-3 text-xs leading-6 text-emerald-300" aria-live="polite">
                  {receiptMsg}
                </p>
              ) : null}
            </form>
          ) : null}
          {paymentId ? (
            <Link
              href={`/track?payment_id=${paymentId}`}
              className="mt-4 inline-flex text-xs text-sand-100 underline decoration-gold-500/60 underline-offset-4 hover:text-gold-300"
            >
              پیگیری وضعیت سفارش
            </Link>
          ) : null}
        </div>
      ) : null}

      {copyToast ? (
        <div
          className="copy-toast pointer-events-none fixed inset-x-4 bottom-6 z-50 flex justify-center"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-300/25 bg-[#10251f]/95 px-4 py-3 text-sm text-emerald-100 shadow-[0_14px_40px_rgba(16,185,129,.22)] backdrop-blur-xl">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
              <Check size={16} strokeWidth={2.8} />
            </span>
            <span>شماره کارت با موفقیت کپی شد</span>
          </div>
        </div>
      ) : null}
    </section>
  );
}
