"use client";

import { FormEvent, useEffect, useState } from "react";
import { Check, CloudUpload, LoaderCircle, ShieldCheck } from "lucide-react";

type MediaItem = { id: string; title: string; category: string; kind: string; url: string; createdAt: string };

export default function AdminMediaPage() {
  const [token, setToken] = useState("");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = window.sessionStorage.getItem("artistyar-upload-token") || "";
    setToken(saved);
    if (saved) void loadItems(saved);
  }, []);

  async function loadItems(currentToken = token) {
    try {
      const response = await fetch("/api/media");
      const data = await response.json();
      setItems(data.items || []);
    } catch {
      setError("دریافت محتوای قبلی ناموفق بود.");
    }
    if (!currentToken) setMessage("برای آپلود، کلید مدیریت Cloudinary را وارد کن.");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage(""); setError("");
    const form = new FormData(event.currentTarget);
    form.set("consent", form.get("consent") === "on" ? "true" : "false");
    try {
      const response = await fetch("/api/media", { method: "POST", headers: { "x-artistyar-admin-token": token }, body: form });
      const data = await response.json();
      if (!response.ok || data.ok === false) throw new Error(data.error || "آپلود ناموفق بود.");
      window.sessionStorage.setItem("artistyar-upload-token", token);
      setMessage(data.message || "آپلود انجام شد.");
      event.currentTarget.reset();
      await loadItems(token);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "آپلود ناموفق بود.");
    } finally { setBusy(false); }
  }

  return <div className="space-y-6">
    <div><p className="eyebrow">/ مدیریت محتوا</p><h2 className="mt-3 text-2xl font-semibold text-sand-50">آپلود نمونه‌کار و آموزش رایگان</h2><p className="mt-2 max-w-2xl text-sm leading-7 text-ink-400">فایل‌ها مستقیم در Cloudinary ذخیره می‌شوند و فقط محتوای ثبت‌شده در این بخش در گالری عمومی نمایش داده می‌شود.</p></div>
    <div className="grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
      <form className="card-ay space-y-4 p-6" onSubmit={onSubmit}>
        <div className="flex items-center gap-3 border-b border-white/[.07] pb-4"><CloudUpload className="text-gold-400" size={22} /><div><h3 className="font-medium text-sand-50">محتوای جدید</h3><p className="mt-1 text-xs text-ink-500">حداکثر حجم فایل: ۲۵۰ مگابایت</p></div></div>
        <label className="block"><span className="mb-2 block text-xs text-ink-300">کلید مدیریت</span><input className="input-ay" type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="ARTISTYAR_UPLOAD_ADMIN_TOKEN" autoComplete="off" required /></label>
        <label className="block"><span className="mb-2 block text-xs text-ink-300">نوع محتوا</span><select className="input-ay" name="category" defaultValue="student-work"><option value="student-work">نمونه‌کار هنرجو</option><option value="free-training">آموزش رایگان</option></select></label>
        <label className="block"><span className="mb-2 block text-xs text-ink-300">عنوان</span><input className="input-ay" name="title" placeholder="مثلاً میکس تنظیم هنرجو" minLength={3} required /></label>
        <label className="block"><span className="mb-2 block text-xs text-ink-300">توضیحات</span><textarea className="input-ay min-h-28 resize-y" name="description" placeholder="توضیح کوتاه درباره محتوا…" /></label>
        <label className="block"><span className="mb-2 block text-xs text-ink-300">فایل صوتی، ویدیویی یا تصویری</span><input className="block w-full rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-ink-300 file:mr-3 file:rounded-lg file:border-0 file:bg-gold-500/15 file:px-3 file:py-2 file:text-gold-300" name="file" type="file" accept="audio/*,video/*,image/*,.pdf" required /></label>
        <label className="flex items-start gap-3 rounded-xl border border-white/[.07] bg-white/[.02] p-3 text-xs leading-6 text-ink-400"><input className="mt-1 accent-amber-400" name="consent" type="checkbox" /><span><strong className="text-sand-100">تأیید انتشار</strong><br />برای نمونه‌کار هنرجو، رضایت انتشار اثر را تأیید می‌کنم. برای آموزش رایگان، این گزینه الزامی نیست.</span></label>
        <button className="btn-primary w-full gap-2" type="submit" disabled={busy}>{busy ? <><LoaderCircle size={16} className="animate-spin" /> در حال آپلود…</> : <><CloudUpload size={16} /> آپلود و انتشار</>}</button>
        {message ? <p className="flex items-start gap-2 text-xs leading-6 text-emerald-300" aria-live="polite"><Check size={15} className="mt-1 shrink-0" />{message}</p> : null}
        {error ? <p className="text-xs leading-6 text-red-300" aria-live="polite">{error}</p> : null}
      </form>
      <div className="card-ay p-6"><div className="flex items-center gap-3 border-b border-white/[.07] pb-4"><ShieldCheck className="text-gold-400" size={21} /><div><h3 className="font-medium text-sand-50">محتوای آپلودشده</h3><p className="mt-1 text-xs text-ink-500">فهرست آخرین فایل‌های منتشرشده</p></div></div><div className="mt-4 space-y-3">{items.length ? items.map((item) => <div key={item.id} className="rounded-xl border border-white/[.07] bg-white/[.02] p-3"><div className="flex items-start justify-between gap-3"><strong className="text-sm text-sand-100">{item.title}</strong><span className="text-[10px] text-gold-400">{item.category === "student-work" ? "نمونه‌کار" : "آموزش"}</span></div><a className="mt-2 block truncate text-xs text-ink-500 hover:text-gold-300" href={item.url} target="_blank" rel="noreferrer">مشاهده فایل</a></div>) : <p className="text-sm leading-7 text-ink-500">هنوز محتوایی از Cloudinary دریافت نشده است.</p>}</div></div>
    </div>
  </div>;
}
