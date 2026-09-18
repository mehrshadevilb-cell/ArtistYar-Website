"use client";

import { FormEvent, useEffect, useState } from "react";
import { Check, CloudUpload, LoaderCircle, Pencil, Plus, Trash2, X } from "lucide-react";

type Item = { id: string; publicId: string; title: string; description?: string; category: string; url: string };

const categories = [
  ["student-work", "نمونه‌کار هنرجو"],
  ["prodby-mehrshad", "ProdBy Mehrshad"],
  ["free-training", "آموزش رایگان"],
] as const;

export function GalleryAdminTools({ item, onChanged }: { item?: Item; onChanged?: () => void }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [edit, setEdit] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session", { credentials: "include", cache: "no-store" })
      .then(r => r.ok ? r.json() : null).then(data => setIsAdmin(data?.user?.role === "admin")).catch(() => setIsAdmin(false));
  }, []);

  if (!isAdmin) return null;

  async function call(body: BodyInit, headers?: HeadersInit) {
    const r = await fetch("/api/media", { method: "PUT", credentials: "include", body, headers });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || d.ok === false) throw new Error(d.error || "عملیات ناموفق بود.");
    return d;
  }

  async function remove() {
    if (!item || !window.confirm(`«${item.title}» حذف شود؟ فایل Storage هم حذف می‌شود.`)) return;
    setBusy(true); setError("");
    try { await fetch("/api/media", { method: "DELETE", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ publicId: item.publicId }) }).then(async r => { const d=await r.json().catch(()=>({})); if(!r.ok||d.ok===false) throw new Error(d.error||"حذف ناموفق بود."); }); window.location.reload(); }
    catch(e){ setError(e instanceof Error ? e.message : "حذف ناموفق بود."); setBusy(false); }
  }

  async function saveEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!item) return; setBusy(true); setError("");
    try {
      const f=new FormData(e.currentTarget);
      await call(JSON.stringify({ publicId:item.publicId, title:f.get("title"), description:f.get("description"), category:f.get("category"), isActive:f.get("isActive")==="on", consent:true }), {"Content-Type":"application/json"});
      setEdit(false); window.location.reload();
    } catch(e){ setError(e instanceof Error ? e.message : "ذخیره ناموفق بود."); setBusy(false); }
  }

  async function replaceFile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!item) return; setBusy(true); setError("");
    try {
      const f=new FormData(e.currentTarget); f.set("action","replace-file"); f.set("publicId",item.publicId);
      await call(f); setOpen(false); window.location.reload();
    } catch(e){ setError(e instanceof Error ? e.message : "جایگزینی فایل ناموفق بود."); setBusy(false); }
  }

  return (
    <>
      {item ? (
        <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-1.5 rounded-xl border border-white/10 bg-black/75 p-1.5 backdrop-blur">
          <button type="button" onClick={() => {setError("");setEdit(true)}} disabled={busy} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-sand-50 hover:bg-white/10"><Pencil size={11}/> Edit</button>
          <button type="button" onClick={() => {setError("");setOpen(true)}} disabled={busy} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-gold-300 hover:bg-white/10"><CloudUpload size={11}/> Replace</button>
          <button type="button" onClick={() => void remove()} disabled={busy} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-red-300 hover:bg-red-400/10"><Trash2 size={11}/> Delete</button>
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="btn-primary gap-2"><Plus size={15}/> افزودن محتوا</button>
      )}

      {edit && item ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-4" dir="rtl">
          <form className="card-ay w-full max-w-lg space-y-4 p-6" onSubmit={saveEdit}>
            <div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold text-sand-50">ویرایش محتوا</h2><p className="mt-1 text-xs text-ink-500">دسته و وضعیت انتشار هم از همین‌جا تغییر می‌کند.</p></div><button type="button" onClick={()=>setEdit(false)}><X size={18}/></button></div>
            <input className="input-ay" name="title" defaultValue={item.title} required minLength={3}/>
            <textarea className="input-ay min-h-24" name="description" defaultValue={item.description || ""}/>
            <select className="input-ay" name="category" defaultValue={item.category}>{categories.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
            <label className="flex items-center gap-2 text-xs text-ink-300"><input type="checkbox" name="isActive" defaultChecked={true}/> انتشار در سایت</label>
            {error ? <p className="text-xs text-red-300">{error}</p>:null}
            <button className="btn-primary w-full" disabled={busy}>{busy?"در حال ذخیره…":"ذخیره تغییرات"}</button>
          </form>
        </div>
      ):null}

      {open ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-4" dir="rtl">
          <form className="card-ay w-full max-w-lg space-y-4 p-6" onSubmit={item ? replaceFile : e=>{e.preventDefault(); const f=new FormData(e.currentTarget); void (async()=>{setBusy(true);try{await fetch("/api/media",{method:"POST",body:f,credentials:"include"}).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok||d.ok===false)throw new Error(d.error||"آپلود ناموفق بود.");});setOpen(false);window.location.reload()}catch(x){setError(x instanceof Error?x.message:"آپلود ناموفق بود.");setBusy(false)}})()})}>
            <div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold text-sand-50">{item?"جایگزینی فایل":"افزودن مستقیم به گالری"}</h2><p className="mt-1 text-xs text-ink-500">{item?"فایل جدید جای فایل فعلی را می‌گیرد.":"فایل جدید مستقیماً منتشر می‌شود."}</p></div><button type="button" onClick={()=>setOpen(false)}><X size={18}/></button></div>
            {!item ? <><select className="input-ay" name="category" defaultValue="prodby-mehrshad">{categories.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><input className="input-ay" name="title" placeholder="عنوان" required minLength={3}/><textarea className="input-ay min-h-24" name="description" placeholder="توضیحات"/><label className="flex gap-2 text-xs text-ink-400"><input type="checkbox" name="consent"/> تأیید رضایت</label></> : null}
            <input className="block w-full rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-ink-300" name="file" type="file" accept="audio/*,video/*,image/*,.pdf" required/>
            {error ? <p className="text-xs text-red-300">{error}</p>:null}
            <button className="btn-primary w-full gap-2" disabled={busy}>{busy?<><LoaderCircle size={15} className="animate-spin"/> در حال پردازش…</>:<><Check size={15}/>{item?"جایگزینی فایل":"آپلود و انتشار"}</>}</button>
          </form>
        </div>
      ):null}
    </>
  );
}
