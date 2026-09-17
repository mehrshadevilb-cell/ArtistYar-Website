"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Check, Copy, ShieldCheck } from "lucide-react";
import { useParams } from "next/navigation";
import type { LiveProduct } from "@/components/LiveProductCard";
import { StatusChip } from "@/components/StatusChip";
import { uploadOrderReceipt } from "@/lib/rahyar-api";

type ProductContent = {
  eyebrow: string;
  intro: string;
  audience: string;
  modules: string[];
  outcomes: string[];
  access: string;
};

function slugify(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/‌/g, "")
    .replace(/[^\u0600-\u06FF\u0660-\u0669a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

function coverClass(title: string): string {
  if (title.includes("پرو")) return "product-cover product-cover-pro";
  if (title.includes("راه‌یار") || title.includes("راهیار")) return "product-cover product-cover-rahyar";
  if (title.includes("تئوری")) return "product-cover product-cover-theory";
  if (title.includes("آرتیست")) return "product-cover product-cover-artist";
  return "product-cover";
}

function coverTone(title: string): string {
  if (title.includes("راه‌یار") || title.includes("راهیار")) return "from-gold-500/25 via-amber-900/20 to-ink-950";
  if (title.includes("تئوری")) return "from-sky-500/20 via-indigo-900/25 to-ink-950";
  if (title.includes("آرتیست")) return "from-violet-500/20 via-fuchsia-900/20 to-ink-950";
  return "from-white/10 via-white/[0.03] to-ink-950";
}

function contentFor(title: string): ProductContent {
  const normalized = title.replace(/‌/g, "");

  if (normalized.includes("آرتیست")) {
    return {
      eyebrow: "پکیج آرتیست‌ها",
      intro: "آرتیست‌یار برای خواننده‌ها، نوازنده‌ها، آهنگسازها و تولیدکننده‌های محتوا طراحی شده تا بتوانند بدون تجهیزات گران‌قیمت و بدون نیاز به تخصص عمیق در تنظیم، میکس و مسترینگ، ضبط و ادیت حرفه‌ای انجام دهند و خروجی باکیفیت برای تولید محتوا بگیرند.",
      audience: "مناسب برای خواننده‌ها، نوازنده‌ها، ترانه‌سراها، هنرمندان حوزه صدا و تصویر و کسانی که می‌خواهند با موبایل یا میکروفون استودیویی شروع کنند.",
      modules: [
        "بی‌کلام کردن موزیک‌ها با بالاترین کیفیت ممکن",
        "ضبط حرفه‌ای و استودیویی با میکروفون موبایل و استودیویی",
        "ادیت حرفه‌ای فایل‌های ضبط‌شده",
        "کوک کردن وکال و اصلاح ضرب و تایمینگ اجرا",
        "استفاده از پریست‌های طراحی‌شده و آماده",
        "خروجی باکیفیت برای تولید محتوا",
      ],
      outcomes: [
        "شروع کار با موبایل و لپ‌تاپ یا کامپیوتر",
        "کاهش وابستگی به استودیو برای تولید محتوای روزمره",
        "آمادگی بیشتر برای ضبط، ادیت و انتشار فایل‌های صوتی",
      ],
      access: "دسترسی به کانال‌ها و منابع تلگرام پس از تأیید پرداخت.",
    };
  }

  if (normalized.includes("تئوری")) {
    return {
      eyebrow: "بنیان موسیقی",
      intro: "تئوری موسیقی را به شکل کاربردی یاد بگیر تا انتخاب نت، ریتم، گام، آکورد و هارمونی در پروژه‌هایت از روی حدس و آزمون‌وخطا نباشد.",
      audience: "مناسب برای هنرجویانی که می‌خواهند پایه موسیقایی خود را برای ملودی، تنظیم و تولید قوی کنند.",
      modules: [
        "نت و ریتم",
        "فواصل و گام‌ها",
        "آکوردها و هارمونی",
        "ریف و آرپژ",
        "تربیت شنوایی",
      ],
      outcomes: [
        "درک روشن‌تر رابطه نت‌ها و آکوردها",
        "تصمیم‌گیری بهتر در ساخت ملودی و هارمونی",
        "پایه مناسب‌تر برای ورود به تنظیم و تولید موسیقی",
      ],
      access: "دسترسی آموزشی از طریق SpotPlayer پس از تأیید پرداخت.",
    };
  }

  if (normalized.includes("راهیار") && normalized.includes("پرو")) {
    return {
      eyebrow: "مسیر حرفه‌ای",
      intro: "راه‌یار پرو برای عمیق‌تر شدن در تصمیم‌گیری‌های حرفه‌ای تولید موسیقی طراحی شده و ادامه‌ای تخصصی برای هنرجویی است که می‌خواهد از اجرای تکنیک‌ها فراتر برود.",
      audience: "مناسب برای هنرجویانی که مبانی تولید موسیقی را می‌دانند و می‌خواهند روی پروژه‌های واقعی، تحلیل و تصمیم‌گیری حرفه‌ای‌تر کار کنند.",
      modules: [
        "تحلیل عمیق‌تر فرم و ساختار موسیقی",
        "تصمیم‌گیری پیشرفته در تنظیم و انتخاب صدا",
        "کنترل دقیق‌تر فرکانس، داینامیک، فضا و عمق در میکس",
        "زنجیره و تصمیم‌های حرفه‌ای در مسترینگ",
        "تحلیل پروژه و رفع مسئله به‌جای حفظ کردن فرمول",
      ],
      outcomes: [
        "حل مسئله سریع‌تر در پروژه‌های واقعی",
        "درک ارتباط تصمیم‌های تنظیم، میکس و مسترینگ",
        "ساخت یک فرایند کاری منظم‌تر و قابل تکرار",
      ],
      access: "دسترسی آموزشی از طریق SpotPlayer پس از تأیید پرداخت.",
    };
  }

  if (normalized.includes("راهیار")) {
    return {
      eyebrow: "مسیر اصلی",
      intro: "راه‌یار؛ تنها مسیر یادگیری اصولی تنظیم، میکس و مسترینگ از پایه تا سطح حرفه‌ای. هدف این متد فقط یاد دادن چند تکنیک نیست؛ یاد می‌گیری چطور موسیقی را تحلیل کنی، مسئله را پیدا کنی و برای حل آن تصمیم درست بگیری.",
      audience: "مناسب برای کسی که می‌خواهد تنظیم، میکس و مسترینگ را اصولی یاد بگیرد و از آزمون‌وخطا و خرید دوره‌های پراکنده فاصله بگیرد.",
      modules: [
        "مبانی موسیقی: نت، ریتم، فواصل، گام، آکورد، هارمونی، ریف، آرپژ و تربیت شنوایی",
        "طراحی درام: Kick، Snare، Groove، Drum Programming و طراحی Kick",
        "Sound Design: Bass، Lead، Layering، Pluck، Pad، Brass و Keys",
        "پلاگین‌ها و افکت‌ها: EQ، Compressor، Saturation، Distortion، Reverb، Delay و پردازش استریو",
        "تئوری صدا: Frequency، Sample Rate، Bit Depth، Nyquist، Aliasing، Oversampling، Phase، Dithering و Loudness",
        "فرم و آنالیز، ساختار موسیقی، تصمیم‌گیری در تنظیم و میکس، Cubase و VST",
        "تنظیم، سازبندی، Layering، Texture، Bass Patterns، اجرای گیتار و اجرای کامل تنظیم",
        "ادیت وکال و گیتار، TDT Vocal Tuning، Back Vocal و Harmony",
        "میکس: Gain Staging، Headroom، Kick & Bass، Drum، Synth، FX، Vocal، Frequency Masking، Groove، Space و Depth",
        "مسترینگ: Mastering Chain، EQ، Compression، Saturation، Stereo Imaging، Limiter، Metering، Loudness و استانداردهای Streaming",
      ],
      outcomes: [
        "یادگیری مسیر درست به‌جای حفظ کردن تکنیک‌های پراکنده",
        "توانایی تحلیل موسیقی و تشخیص مسئله در پروژه",
        "اجرای آموخته‌ها روی پروژه‌های واقعی از تنظیم تا مسترینگ",
        "پشتیبانی آموزشی برای ادامه مسیر یادگیری",
      ],
      access: "دسترسی آموزشی از طریق SpotPlayer پس از تأیید پرداخت.",
    };
  }

  return {
    eyebrow: "مسیر آموزشی",
    intro: "یک مسیر کاربردی برای یادگیری و اجرای مهارت‌های تولید موسیقی؛ محتوای دقیق محصول بر اساس مسیر انتخابی تو در همین صفحه نمایش داده می‌شود.",
    audience: "مناسب برای هنرجویی که می‌خواهد آموزش را مرحله‌به‌مرحله و روی پروژه جلو ببرد.",
    modules: ["مبانی و مفاهیم کلیدی", "تمرین عملی", "تحلیل و رفع اشکال", "اجرای مهارت روی پروژه واقعی"],
    outcomes: ["درک بهتر فرایند تولید موسیقی", "تمرین هدفمندتر", "ساخت فرایند کاری منظم‌تر"],
    access: "نوع دسترسی بعد از تأیید پرداخت طبق محصول فعال می‌شود.",
  };
}

export default function ProductPage() {
  const params = useParams<{ slug: string }>();
  const slug = decodeURIComponent(params.slug || "");
  const [items, setItems] = useState<LiveProduct[]>([]);
  const [source, setSource] = useState("در حال بارگذاری…");
  const [selected, setSelected] = useState<LiveProduct | null>(null);
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [orderPhone, setOrderPhone] = useState("");
  const [cardNumber, setCardNumber] = useState<string | null>(null);
  const [cardHolder, setCardHolder] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [receiptMsg, setReceiptMsg] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [receiptBusy, setReceiptBusy] = useState(false);

  useEffect(() => {
    fetch("/api/rahyar/products")
      .then((r) => r.json())
      .then((data) => {
        setSource(data.source || "unknown");
        setItems(data.items || []);
      })
      .catch(() => setSource("خطا در دریافت مسیر"));
  }, []);

  const product = useMemo(
    () => items.find((item) => slugify(item.title) === slug || String(item.id) === slug) || null,
    [items, slug],
  );
  const content = contentFor(product?.title || "");

  async function onOrder(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!product) return;
    setBusy(true);
    setMsg("");
    setPaymentId(null);
    setCardNumber(null);
    setCardHolder(null);
    setReceipt(null);
    setReceiptMsg("");
    const fd = new FormData(e.currentTarget);
    const phone = String(fd.get("phone") || "");
    try {
      const res = await fetch("/api/rahyar/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: product.id, full_name: fd.get("full_name"), phone, note: fd.get("note") || undefined }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.error || data.detail || "ثبت سفارش ناموفق بود.");
      setMsg(`${data.message || "ثبت شد."}\nشماره پرداخت: ${data.payment_id}\nمبلغ: ${Number(data.amount || 0).toLocaleString("fa-IR")} تومان`);
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

  if (source !== "در حال بارگذاری…" && !product) {
    return (
      <section className="container-ay py-20 text-center">
        <StatusChip tone="warn">مسیر پیدا نشد</StatusChip>
        <h1 className="mt-5 text-2xl font-semibold text-sand-50">این صفحه برای محصول فعال موجود نیست.</h1>
        <Link href="/courses" className="btn-ghost mt-7 inline-flex items-center gap-2">بازگشت به محصولات <ArrowRight size={16} /></Link>
      </section>
    );
  }

  return (
    <section className="container-ay py-12 sm:py-16">
      <Link href="/courses" className="mb-8 inline-flex items-center gap-2 text-xs text-ink-400 transition hover:text-gold-400">
        <ArrowRight size={15} /> بازگشت به محصولات
      </Link>

      {product ? (
        <>
          <div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr] lg:items-start">
            <div>
              <div className="relative aspect-[16/9] overflow-hidden rounded-3xl border border-white/[.07] bg-ink-950">
                {product.thumbnail ? (
                  <Image src={product.thumbnail} alt={product.title} fill sizes="(max-width: 1024px) 100vw, 60vw" className={`object-cover ${coverClass(product.title)}`} priority />
                ) : (
                  <div className={`flex h-full items-end bg-gradient-to-br p-8 ${coverTone(product.title)}`}>
                    <span className="text-6xl font-semibold text-sand-50/90">{product.title.replace(/\s+/g, "").slice(0, 1)}</span>
                  </div>
                )}
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <StatusChip tone="gold">{content.eyebrow}</StatusChip>
                <StatusChip tone={product.is_active === false ? "warn" : "ok"}>{product.is_active === false ? "غیرفعال" : "فعال"}</StatusChip>
                <span className="text-sm font-medium text-gold-400">{product.price > 0 ? `${product.price.toLocaleString("fa-IR")} تومان` : "تماس بگیرید"}</span>
              </div>
              <h1 className="mt-5 text-3xl font-semibold tracking-tight text-sand-50 sm:text-5xl">{product.title}</h1>
              <p className="mt-5 max-w-3xl text-sm leading-8 text-ink-300 sm:text-base">{content.intro}</p>
            </div>

            <div className="card-ay p-6 sm:p-7 lg:sticky lg:top-24">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-ink-500">ثبت درخواست</p>
                  <h2 className="mt-1 text-lg font-semibold text-sand-50">شروع این مسیر</h2>
                </div>
                <ShieldCheck className="text-gold-400" size={20} />
              </div>
              <form className="mt-6 space-y-4" onSubmit={onOrder}>
                <input name="full_name" required placeholder="نام و نام خانوادگی" className="input-ay" />
                <input name="phone" required inputMode="tel" placeholder="شماره موبایل" className="input-ay" />
                <textarea name="note" rows={3} placeholder="توضیحات یا سوال (اختیاری)" className="input-ay resize-none" />
                <button disabled={busy || product.is_active === false} className="btn-gold w-full" type="submit">
                  {busy ? "در حال ثبت…" : "ثبت درخواست و دریافت اطلاعات پرداخت"}
                </button>
              </form>
              {msg ? <p className="mt-4 whitespace-pre-line rounded-2xl border border-gold-500/20 bg-gold-500/5 p-4 text-xs leading-6 text-ink-300">{msg}</p> : null}
              {cardNumber ? (
                <div className="mt-5 rounded-2xl border border-white/[.07] bg-black/20 p-4">
                  <p className="text-xs text-ink-500">شماره کارت مقصد</p>
                  <button type="button" onClick={() => navigator.clipboard.writeText(cardNumber)} className="mt-2 flex w-full items-center justify-between gap-3 text-right text-base font-semibold tracking-wider text-sand-50">
                    <span dir="ltr">{cardNumber}</span><Copy size={16} className="text-gold-400" />
                  </button>
                  {cardHolder ? <p className="mt-2 text-xs text-ink-500">به نام: {cardHolder}</p> : null}
                </div>
              ) : null}
              {paymentId ? (
                <form onSubmit={onReceipt} className="mt-5 space-y-3">
                  <label className="block text-xs text-ink-400">رسید پرداخت را بارگذاری کن</label>
                  <input required type="file" accept="image/*,.pdf" onChange={(e) => setReceipt(e.target.files?.[0] || null)} className="input-ay text-xs" />
                  <button disabled={receiptBusy || !receipt} className="btn-ghost w-full" type="submit">{receiptBusy ? "در حال ارسال…" : "ارسال رسید"}</button>
                  {receiptMsg ? <p className="text-xs text-gold-400">{receiptMsg}</p> : null}
                </form>
              ) : null}
            </div>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-2">
            <div className="card-ay p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-sand-50">این مسیر برای چه کسی است؟</h2>
              <p className="mt-4 text-sm leading-8 text-ink-300">{content.audience}</p>
              <h3 className="mt-8 text-base font-semibold text-sand-50">سرفصل‌ها</h3>
              <ul className="mt-4 space-y-3">
                {content.modules.map((item) => <li key={item} className="flex gap-3 text-sm leading-7 text-ink-300"><Check size={17} className="mt-1 shrink-0 text-gold-400" />{item}</li>)}
              </ul>
            </div>
            <div className="card-ay p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-sand-50">بعد از یادگیری چه چیزی داری؟</h2>
              <ul className="mt-5 space-y-3">
                {content.outcomes.map((item) => <li key={item} className="flex gap-3 text-sm leading-7 text-ink-300"><Check size={17} className="mt-1 shrink-0 text-gold-400" />{item}</li>)}
              </ul>
              <div className="mt-8 rounded-2xl border border-white/[.07] bg-white/[.02] p-5">
                <div className="flex gap-3"><ShieldCheck size={18} className="mt-1 shrink-0 text-gold-400" /><div><h3 className="text-sm font-semibold text-sand-50">نحوه دسترسی</h3><p className="mt-2 text-xs leading-6 text-ink-400">{content.access}</p></div></div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="py-20 text-center text-sm text-ink-400">در حال دریافت اطلاعات محصول…</div>
      )}
    </section>
  );
}
