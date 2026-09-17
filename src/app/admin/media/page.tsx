"use client";

import { FormEvent, useEffect, useState } from "react";
import { Check, CloudUpload, LoaderCircle, Pencil, ShieldCheck, Trash2, X } from "lucide-react";

type MediaItem = { id: string; publicId: string; title: string; description: string; category: string; kind: string; resourceType: "image" | "video" | "raw"; url: string; createdAt: string };
type StorageItem = { path: string; name: string; mimeType: string; size: number; createdAt: string; url: string };

async function readApiResponse(response: Response): Promise<Record<string, any>> {
  const text = await response.text();
  try { return JSON.parse(text) as Record<string, any>; }
  catch { throw new Error(response.status === 413 ? "حجم فایل از محدودیت سرور بیشتر است." : `پاسخ نامعتبر از سرور دریافت شد (${response.status}). احتمالاً deploy جدید هنوز فعال نشده است.`); }
}

export default function AdminMediaPage() {
  const [token, setToken] = useState("");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [storageItems, setStorageItems] = useState<StorageItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<MediaItem | null>(null);

  useEffect(() => {
    const saved = window.sessionStorage.getItem("artistyar-upload-token") || "";
    setToken(saved);
    void loadItems();
    if (saved) void loadStorage(saved);
  }, []);

  async function loadItems() {
    try { const response = await fetch("/api/media"); const data = await readApiResponse(response); if (!response.ok) throw new Error(data.error || "دریافت محتوا ناموفق بود."); setItems(data.items || []); }
    catch (listError) { setError(listError instanceof Error ? listError.message : "دریافت محتوای قبلی ناموفق بود."); }
  }

  async function loadStorage(currentToken = token) {
    try { const response = await fetch("/api/media?source=storage", { headers: { "x-artistyar-admin-token": currentToken } }); const data = await readApiResponse(response); if (!response.ok) throw new Error(data.error || "دریافت فایل‌های Storage ناموفق بود."); setStorageItems(data.items || []); }
    catch (storageError) { setError(storageError instanceof Error ? storageError.message : "دریافت فایل‌های Storage ناموفق بود."); }
  }

  async function registerStorageItem(item: StorageItem) {
    const title = window.prompt("عنوان محتوا را وارد کن:", item.name.replace(/\.[^.]+$/, "")); if (!title) return;
    const category = window.confirm("این فایل نمونه‌کار هنرجو است؟") ? "student-work" : "free-training";
    if (category === "student-work" && !window.confirm("رضایت انتشار این نمونه‌کار را تأیید می‌کنی؟")) return;
    setBusy(true); setMessage(""); setError("");
    try { const response = await fetch("/api/media", { method: "PUT", headers: { "Content-Type": "application/json", "x-artistyar-admin-token": token }, body: JSON.stringify({ action: "register", publicId: item.path, title, description: "", category, consent: category === "student-work", mimeType: item.mimeType }) }); const data = await readApiResponse(response); if (!response.ok || data.ok === false) throw new Error(data.error || "ثبت فایل ناموفق بود."); setMessage(data.message || "فایل در گالری ثبت شد."); await loadItems(); }
    catch (registerError) { setError(registerError instanceof Error ? registerError.message : "ثبت فایل ناموفق بود."); }
    finally { setBusy(false); }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(""); setError("");
    const form = new FormData(event.currentTarget); form.set("consent", form.get("consent") === "on" ? "true" : "false");
    try {
      const response = await fetch("/api/media", { method: "POST", headers: { "x-artistyar-admin-token": token }, body: form });
      const data = await readApiResponse(response); if (!response.ok || data.ok === false) throw new Error(data.error || "آپلود ناموفق بود.");
      window.sessionStorage.setItem("artistyar-upload-token", token); setMessage(data.message || "آپلود انجام شد."); event.currentTarget.reset(); await loadItems();
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : "آپلود ناموفق بود."); }
    finally { setBusy(false); }
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editing) return; setBusy(true); setMessage(""); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/media", { method: "PUT", headers: { "Content-Type": "application/json", "x-artistyar-admin-token": token }, body: JSON.stringify({ publicId: editing.publicId, resourceType: editing.resourceType, title: form.get("title"), description: form.get("description") }) });
      const data = await readApiResponse(response); if (!response.ok || data.ok === false) throw new Error(data.error || "ویرایش ناموفق بود.");
      setEditing(null); setMessage(data.message || "ویرایش انجام شد."); await loadItems();
    } catch (editError) { setError(editError instanceof Error ? editError.message : "ویرایش ناموفق بود."); }
    finally { setBusy(false); }
  }

  async function removeItem(item: MediaItem) {
    if (!window.confirm(`محتوای «${item.title}» حذف شود؟ این کار فایل را از Supabase Storage هم حذف می‌کند.`)) return;
    setBusy(true); setMessage(""); setError("");
    try {
      const response = await fetch("/api/media", { method: "DELETE", headers: { "Content-Type": "application/json", "x-artistyar-admin-token": token }, body: JSON.stringify({ publicId: item.publicId, resourceType: item.resourceType }) });
      const data = await readApiResponse(response); if (!response.ok || data.ok === false) throw new Error(data.error || "حذف ناموفق بود.");
      setMessage(data.message || "فایل حذف شد."); await loadItems();
    } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "حذف ناموفق بود."); }
    finally { setBusy(false); }
  }

  return <div className="space-y-6">
    <div><p className="eyebrow">/ مدیریت محتوا</p><h2 className="mt-3 text-2xl font-semibold text-sand-50">آپلود و مدیریت رسانه</h2><p className="mt-2 max-w-2xl text-sm leading-7 text-ink-400">فایل‌ها مستقیم در Supabase Storage ذخیره می‌شوند. از فهرست پایین می‌توانی عنوان و توضیحات را ویرایش یا فایل را به‌طور کامل حذف کنی.</p></div>
    <div className="grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
      <form className="card-ay space-y-4 p-6" onSubmit={onSubmit}>
        <div className="flex items-center gap-3 border-b border-white/[.07] pb-4"><CloudUpload className="text-gold-400" size={22} /><div><h3 className="font-medium text-sand-50">محتوای جدید</h3><p className="mt-1 text-xs text-ink-500">حداکثر حجم فایل: ۵۰ مگابایت</p></div></div>
        <label className="block"><span className="mb-2 block text-xs text-ink-300">کلید مدیریت</span><input className="input-ay" type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="ARTISTYAR_UPLOAD_ADMIN_TOKEN" autoComplete="off" required /></label>
        <label className="block"><span className="mb-2 block text-xs text-ink-300">نوع محتوا</span><select className="input-ay" name="category" defaultValue="student-work"><option value="student-work">نمونه‌کار هنرجو</option><option value="free-training">آموزش رایگان</option></select></label>
        <label className="block"><span className="mb-2 block text-xs text-ink-300">عنوان</span><input className="input-ay" name="title" placeholder="مثلاً میکس تنظیم هنرجو" minLength={3} required /></label>
        <label className="block"><span className="mb-2 block text-xs text-ink-300">توضیحات</span><textarea className="input-ay min-h-28 resize-y" name="description" placeholder="توضیح کوتاه درباره محتوا…" /></label>
        <label className="block"><span className="mb-2 block text-xs text-ink-300">فایل صوتی، ویدیویی یا تصویری</span><input className="block w-full rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-ink-300 file:mr-3 file:rounded-lg file:border-0 file:bg-gold-500/15 file:px-3 file:py-2 file:text-gold-300" name="file" type="file" accept="audio/*,video/*,image/*,.pdf" required /></label>
        <label className="flex items-start gap-3 rounded-xl border border-white/[.07] bg-white/[.02] p-3 text-xs leading-6 text-ink-400"><input className="mt-1 accent-amber-400" name="consent" type="checkbox" /><span><strong className="text-sand-100">تأیید انتشار</strong><br />برای نمونه‌کار هنرجو، رضایت انتشار اثر را تأیید می‌کنم.</span></label>
        <button className="btn-primary w-full gap-2" type="submit" disabled={busy}>{busy ? <><LoaderCircle size={16} className="animate-spin" /> در حال آپلود…</> : <><CloudUpload size={16} /> آپلود و انتشار</>}</button>
      </form>
      <div className="card-ay p-6"><div className="flex items-center gap-3 border-b border-white/[.07] pb-4"><ShieldCheck className="text-gold-400" size={21} /><div><h3 className="font-medium text-sand-50">محتوای آپلودشده</h3><p className="mt-1 text-xs text-ink-500">ویرایش یا حذف فایل‌های منتشرشده</p></div></div><div className="mt-4 space-y-3">{items.length ? items.map((item) => <div key={item.id} className="rounded-xl border border-white/[.07] bg-white/[.02] p-3"><div className="flex items-start justify-between gap-3"><strong className="text-sm text-sand-100">{item.title}</strong><span className="text-[10px] text-gold-400">{item.category === "student-work" ? "نمونه‌کار" : "آموزش"}</span></div><a className="mt-2 block truncate text-xs text-ink-500 hover:text-gold-300" href={item.url} target="_blank" rel="noreferrer">مشاهده فایل</a><div className="mt-3 flex gap-2 border-t border-white/[.06] pt-3"><button type="button" className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setEditing(item)}><Pencil size={13} /> ویرایش</button><button type="button" className="btn-ghost !border-red-300/20 !px-3 !py-1.5 text-xs !text-red-300 hover:!bg-red-400/10" onClick={() => void removeItem(item)} disabled={busy}><Trash2 size={13} /> حذف</button></div></div>) : <p className="text-sm leading-7 text-ink-500">هنوز محتوایی از Supabase Storage دریافت نشده است.</p>}</div></div>
    </div>
    <div className="card-ay p-6"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[.07] pb-4"><div><h3 className="font-medium text-sand-50">انتخاب از فایل‌های موجود</h3><p className="mt-1 text-xs text-ink-500">فایل‌هایی که مستقیم در bucket آپلود کرده‌ای، بدون آپلود دوباره اینجا ثبت کن.</p></div><button type="button" className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => void loadStorage()} disabled={!token || busy}>بارگذاری فایل‌ها</button></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{storageItems.length ? storageItems.map((file) => <div key={file.path} className="rounded-xl border border-white/[.07] bg-white/[.02] p-3"><p className="truncate text-sm text-sand-100" title={file.path}>{file.path}</p><p className="mt-1 text-[11px] text-ink-500">{file.mimeType} · {Math.round(file.size / 1024)} KB</p><button type="button" className="btn-primary mt-3 w-full !px-3 !py-1.5 text-xs" onClick={() => void registerStorageItem(file)} disabled={busy}>ثبت در گالری</button></div>) : <p className="text-sm leading-7 text-ink-500">برای دیدن فایل‌های موجود، کلید مدیریت را وارد و روی «بارگذاری فایل‌ها» کلیک کن.</p>}</div></div>
    {message ? <p className="flex items-start gap-2 text-xs leading-6 text-emerald-300" aria-live="polite"><Check size={15} className="mt-1 shrink-0" />{message}</p> : null}{error ? <p className="text-xs leading-6 text-red-300" aria-live="polite">{error}</p> : null}
    {editing ? <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="ویرایش محتوا"><form className="card-ay w-full max-w-lg space-y-4 p-6" onSubmit={saveEdit}><div className="flex items-center justify-between"><h3 className="text-lg font-medium text-sand-50">ویرایش محتوا</h3><button type="button" className="text-ink-400 hover:text-sand-50" onClick={() => setEditing(null)} aria-label="بستن"><X size={18} /></button></div><label className="block"><span className="mb-2 block text-xs text-ink-300">عنوان</span><input className="input-ay" name="title" defaultValue={editing.title} minLength={3} required /></label><label className="block"><span className="mb-2 block text-xs text-ink-300">توضیحات</span><textarea className="input-ay min-h-28 resize-y" name="description" defaultValue={editing.description} /></label><div className="flex gap-2"><button className="btn-primary flex-1" type="submit" disabled={busy}>{busy ? "در حال ذخیره…" : "ذخیره تغییرات"}</button><button className="btn-ghost" type="button" onClick={() => setEditing(null)}>انصراف</button></div></form></div> : null}
  </div>;
}
