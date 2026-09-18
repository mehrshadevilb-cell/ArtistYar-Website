"use client";

import { useEffect, useState } from "react";
import { CloudUpload, LoaderCircle, Plus, Trash2, X } from "lucide-react";

type Item = { id: string; publicId: string; title: string; category: string; url: string };

export function GalleryAdminTools({ item, onChanged }: { item?: Item; onChanged?: () => void }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/session", { credentials: "include", cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(data => setIsAdmin(data?.user?.role === "admin"))
      .catch(() => setIsAdmin(false));
  }, []);

  if (!isAdmin) return null;

  async function remove() {
    if (!item || !window.confirm(`«${item.title}» حذف شود؟ فایل Storage هم حذف می‌شود.`)) return;
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/media", { method: "DELETE", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ publicId: item.publicId }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d.ok === false) throw new Error(d.error || "حذف ناموفق بود.");
      onChanged?.();
      window.location.reload();
    } catch (e) { setError(e instanceof Error ? e.message : "حذف ناموفق بود."); setBusy(false); }
  }

  async function upload(form: FormData) {
    setBusy(true); setError(""); setMessage("");
    try {
      const r = await fetch("/api/media", { method: "POST", body: form, credentials: "include" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d.ok === false) throw new Error(d.error || "آپلود ناموفق بود.");
      setMessage("محتوا اضافه شد.");
      setOpen(false);
      window.location.reload();
    } catch (e) { setError(e instanceof Error ? e.message : "آپلود ناموفق بود."); }
    finally { setBusy(false); }
  }

  return (
    <>
      {item ? (
        <button type="button" onClick={() => void remove()} disabled={busy} className="absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-lg border border-red-300/20 bg-black/70 px-2.5 py-1.5 text-[11px] text-red-300 backdrop-blur hover:bg-red-400/10" title="حذف محتوا">
          {busy ? <LoaderCircle size={12} className="animate-spin" /> : <Trash2 size={12} />} حذف
        </button>
      ) : (
        <button type="button" onClick={() => { setError(""); setOpen(true); }} className="btn-primary gap-2">
          <Plus size={15} /> افزودن محتوا
        </button>
      )}

      {open ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-4" dir="rtl">
          <form className="card-ay w-full max-w-lg space-y-4 p-6" onSubmit={e => { e.preventDefault(); void upload(new FormData(e.currentTarget)); }}>
            <div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold text-sand-50">افزودن مستقیم به گالری</h2><p className="mt-1 text-xs text-ink-500">محتوا مستقیماً در Storage و گالری ثبت می‌شود.</p></div><button type="button" onClick={() => setOpen(false)}><X size={18}/></button></div>
            <select className="input-ay" name="category" defaultValue="prodby-mehrshad"><option value="student-work">نمونه‌کار هنرجو</option><option value="prodby-mehrshad">ProdBy Mehrshad</option><option value="free-training">آموزش رایگان</option></select>
            <input className="input-ay" name="title" placeholder="عنوان" required minLength={3}/>
            <textarea className="input-ay min-h-24" name="description" placeholder="توضیحات"/>
            <input className="block w-full rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-ink-300" name="file" type="file" accept="audio/*,video/*,image/*,.pdf" required/>
            <label className="flex gap-2 text-xs text-ink-400"><input type="checkbox" name="consent"/> تأیید انتشار (برای نمونه‌کار هنرجو)</label>
            {error ? <p className="text-xs text-red-300">{error}</p> : null}
            <button className="btn-primary w-full gap-2" disabled={busy}>{busy ? <><LoaderCircle size={15} className="animate-spin"/> در حال آپلود…</> : <><CloudUpload size={15}/> آپلود و انتشار</>}</button>
          </form>
        </div>
      ) : null}
    </>
  );
}
