"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Eye, RefreshCw, Save, Search, ShieldAlert } from "lucide-react";

type Plugin = Record<string, any>;

const statusLabel: Record<string, string> = {
  verified: "تأییدشده",
  partial: "تأیید ناقص",
  unavailable: "جستجو در دسترس نیست",
  failed: "نیازمند بررسی",
};

async function api(body?: any) {
  const response = await fetch("/api/admin/telegram/plugins", {
    method: body ? "POST" : "GET",
    headers: body ? { "content-type": "application/json" } : undefined,
    credentials: "include",
    cache: "no-store",
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) throw new Error(json?.error || "خطا در ارتباط با سرور");
  return json;
}

function Evidence({ post }: { post: Plugin }) {
  const evidence = Array.isArray(post.evidence) ? post.evidence : [];
  return <div className="flex flex-wrap gap-2 text-[11px]">
    {evidence.map((item: any) => <span key={item.source} className={`rounded-full border px-2.5 py-1 ${item.status === "confirmed" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : item.status === "conflict" ? "border-red-400/30 bg-red-400/10 text-red-300" : "border-white/10 text-ink-400"}`}>
      {item.status === "confirmed" ? "✓" : item.status === "conflict" ? "!" : "•"} {item.source === "image" ? "تصویر" : item.source === "caption" ? "کپشن" : item.source === "filename" ? "نام فایل" : "وب"}
    </span>)}
  </div>;
}

export default function TelegramPluginCaptionStudio() {
  const [items, setItems] = useState<Plugin[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const selected = useMemo(() => items.find((x) => x.id === selectedId) || items[0], [items, selectedId]);

  async function load() {
    setLoading(true); setError("");
    try {
      const data = await api();
      setItems(data.items || []);
      if (!selectedId && data.items?.[0]?.id) setSelectedId(data.items[0].id);
    } catch (e) { setError(e instanceof Error ? e.message : "بارگذاری ناموفق بود"); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (selected) setCaption(String(selected.draft_caption || selected.final_caption || ""));
  }, [selected?.id, selected?.draft_caption, selected?.final_caption]);

  async function action(name: string, extra?: any) {
    if (!selected) return;
    setBusy(name); setError("");
    try {
      await api({ id: selected.id, action: name, ...(extra || {}) });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "عملیات ناموفق بود"); }
    finally { setBusy(""); }
  }

  async function copyCaption() {
    await navigator.clipboard.writeText(caption);
    setBusy("copied");
    window.setTimeout(() => setBusy(""), 900);
  }

  if (loading) return <div className="card-ay p-8 text-sm text-ink-400">در حال بارگذاری استودیو کپشن…</div>;

  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow">/ Telegram Intelligence Studio</p>
        <h2 className="mt-3 text-2xl font-semibold text-sand-50">استودیو هوشمندی کپشن پلاگین</h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-ink-400">منبع اصلی، شواهد AI، تأیید وب و کپشن نهایی را در یک جریان بررسی کنید. هیچ فیلد «Unknown» به کپشن نهایی اضافه نمی‌شود.</p>
      </div>
      <button className="btn-ghost text-xs" onClick={() => void load()} disabled={Boolean(busy)}><RefreshCw size={14} className="inline" /> بروزرسانی</button>
    </header>

    {error && <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-200">{error}</div>}

    <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="card-ay overflow-hidden">
        <div className="border-b border-white/10 p-4"><p className="text-xs text-ink-500">پست‌ها</p><p className="mt-1 text-sm text-sand-50">{items.length.toLocaleString("fa-IR")} مورد</p></div>
        <div className="max-h-[760px] overflow-auto">
          {items.map((post) => <button key={post.id} onClick={() => setSelectedId(post.id)} className={`w-full border-b border-white/5 p-4 text-right transition ${post.id === selected?.id ? "bg-gold-400/[.08]" : "hover:bg-white/[.025]"}`}>
            <div className="flex items-start gap-3">
              {post.telegram_photo_file_id ? <img src={"/api/admin/telegram/plugins/image?file_id=" + encodeURIComponent(post.telegram_photo_file_id)} alt="" className="h-12 w-12 rounded-lg object-cover" /> : <div className="h-12 w-12 rounded-lg bg-white/5" />}
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-sand-50">{post.title || "نیازمند بررسی"}</p><p className="mt-1 truncate text-[11px] text-ink-500">{post.file_name || "بدون نام فایل"}</p><span className="mt-2 inline-flex rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-ink-400">{statusLabel[post.verification_status] || post.status}</span></div>
            </div>
          </button>)}
        </div>
      </aside>

      {selected ? <main className="space-y-5">
        <section className="card-ay p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><p className="text-[11px] uppercase tracking-[.16em] text-ink-500">AI Analysis</p><h3 className="mt-2 text-xl font-semibold text-sand-50">{selected.title || "نیازمند بررسی"}</h3><p className="mt-1 text-xs text-ink-500">{selected.detected_language || "زبان نامشخص"} · اعتماد {selected.verification_confidence || "low"} · {statusLabel[selected.verification_status] || "بررسی نشده"}</p></div>
            {selected.review_required ? <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs text-amber-200"><ShieldAlert size={14} /> بررسی دستی</span> : <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-300"><Check size={14} /> قابل انتشار</span>}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
            <div className="rounded-xl border border-white/10 p-3"><span className="text-ink-500">سازنده</span><b className="mt-1 block text-sand-50">{selected.developer || "—"}</b></div>
            <div className="rounded-xl border border-white/10 p-3"><span className="text-ink-500">نسخه</span><b className="mt-1 block text-sand-50">{selected.version || "—"}</b></div>
            <div className="rounded-xl border border-white/10 p-3"><span className="text-ink-500">نوع</span><b className="mt-1 block text-sand-50">{selected.category || "—"}</b></div>
            <div className="rounded-xl border border-white/10 p-3"><span className="text-ink-500">جستجو</span><b className="mt-1 block text-sand-50">{selected.search_status || "—"}</b></div>
          </div>
          <div className="mt-4">
            <p className="mb-2 text-xs text-ink-500">شواهد شناسایی</p>
            <Evidence post={selected} />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {["RECEIVED","ANALYZING","IDENTIFIED","VERIFYING","GENERATING","VALIDATING"].map((step) => {
              const state = String(selected.processing_state || "RECEIVED");
              const states = ["RECEIVED","ANALYZING","IDENTIFIED","VERIFYING","GENERATING","VALIDATING","READY","PUBLISHED"];
              const active = states.indexOf(state) >= states.indexOf(step);
              return <div key={step} className={`rounded-lg border px-3 py-2 text-[10px] ${active ? "border-emerald-400/25 bg-emerald-400/5 text-emerald-300" : "border-white/10 text-ink-500"}`}>{active ? "✓" : "○"} {step}</div>;
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {selected.product_locked
              ? <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs text-amber-200">🔒 هویت محصول قفل شده</span>
              : <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-ink-400">هویت قابل بازتحلیل</span>}
            <button className="btn-ghost text-xs" disabled={Boolean(busy)} onClick={() => void action(selected.product_locked ? "unlock_product" : "lock_product", selected.product_locked ? undefined : {title:selected.title,developer:selected.developer,version:selected.version,category:selected.category})}>
              {selected.product_locked ? "بازکردن قفل" : "🔒 قفل هویت محصول"}
            </button>
          </div>
        </section>

        <section className="card-ay p-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <p className="text-[11px] uppercase tracking-[.16em] text-ink-500">Original Source</p>
              {selected.telegram_photo_file_id && <img src={"/api/admin/telegram/plugins/image?file_id=" + encodeURIComponent(selected.telegram_photo_file_id)} alt="Original Telegram artwork" className="mt-3 max-h-80 w-full rounded-2xl object-contain bg-black/20" />}
              <div className="mt-3 rounded-xl border border-white/10 p-3"><p className="text-[11px] text-ink-500">Filename</p><p dir="ltr" className="mt-1 break-all text-xs text-sand-100">{selected.file_name || "—"}</p></div>
              <details className="mt-3 rounded-xl border border-white/10 p-3"><summary className="cursor-pointer text-xs text-sand-100">کپشن اصلی تلگرام</summary><pre dir="auto" className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap text-xs leading-6 text-ink-300">{selected.raw_caption || "—"}</pre></details>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[.16em] text-ink-500">Verified Information</p>
              <div className="mt-3 rounded-xl border border-white/10 p-4 text-sm leading-7">
                {selected.verified_source_url ? <a href={selected.verified_source_url} target="_blank" rel="noreferrer" className="break-all text-gold-300 hover:text-gold-200">{selected.verified_source_title || selected.verified_source_url}</a> : <p className="text-ink-500">منبع تأییدشده ثبت نشده است.</p>}
                {Array.isArray(selected.features) && selected.features.length ? <ul className="mt-4 space-y-1 text-xs text-ink-300">{selected.features.slice(0,8).map((x:string)=><li key={x}>• {x}</li>)}</ul> : null}
              </div>
              <div className="mt-3 rounded-xl border border-white/10 p-4 text-xs leading-6 text-ink-400"><b className="text-sand-50">توضیحات تأییدشده</b><p className="mt-2">{selected.description || "—"}</p></div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gold-400/25 bg-gold-400/[.045] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-[11px] uppercase tracking-[.16em] text-gold-300/70">Final Caption</p><h3 className="mt-1 text-lg font-semibold text-sand-50">کپشن نهایی</h3></div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-ghost text-xs" disabled={Boolean(busy)} onClick={() => void action("verify")}><Search size={14} className="inline" /> تأیید وب</button>
              <button className="btn-ghost text-xs" disabled={Boolean(busy)} onClick={() => void action("regenerate_identity")}><RefreshCw size={14} className="inline" /> شناسایی مجدد</button>
              <button className="btn-ghost text-xs" disabled={Boolean(busy)} onClick={() => void action("regenerate_caption")}><RefreshCw size={14} className="inline" /> بازتولید کپشن</button>
              <button className="btn-ghost text-xs" disabled={Boolean(busy)} onClick={() => void action("regenerate_translation")}><RefreshCw size={14} className="inline" /> فقط ترجمه</button>
            </div>
          </div>
          <textarea dir="auto" value={caption} onChange={(e) => setCaption(e.target.value)} className="input-ay mt-4 min-h-[300px] w-full resize-y font-mono text-xs leading-6" />
          <div className="mt-5 rounded-[24px] border border-white/10 bg-[#17212b] p-4 shadow-2xl">
            <div className="mb-3 flex items-center gap-2 text-xs text-white/60"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Telegram Preview</div>
            <div className="max-w-[560px] overflow-hidden rounded-2xl bg-[#0e1620]">
              {selected.telegram_photo_file_id && <img src={"/api/admin/telegram/plugins/image?file_id=" + encodeURIComponent(selected.telegram_photo_file_id)} alt="" className="max-h-80 w-full object-cover" />}
              <div className="p-4 text-[13px] leading-6 text-white/90 whitespace-pre-wrap">{caption.replace(/<[^>]+>/g, "") || "کپشن هنوز خالی است."}</div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="self-center text-[11px] text-ink-500">بازخورد:</span>
            {["wrong_product","wrong_version","wrong_category","bad_translation","missing_information","incorrect_specification"].map((kind) =>
              <button key={kind} className="btn-ghost text-[11px]" disabled={Boolean(busy)} onClick={() => void action("feedback",{kind})}>{kind}</button>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn-ghost text-xs" disabled={Boolean(busy)} onClick={() => void action("save_draft",{caption})}><Save size={14} className="inline" /> ذخیره پیش‌نویس</button>
            <button className="btn-ghost text-xs" disabled={Boolean(busy)} onClick={() => void copyCaption()}><Copy size={14} className="inline" /> {busy === "copied" ? "کپی شد" : "کپی"}</button>
            <button className="btn-primary text-xs" disabled={Boolean(busy)} onClick={() => void action("publish",{caption})}><Eye size={14} className="inline" /> انتشار / ویرایش در تلگرام</button>
            {selected.telegram_post_url && <a className="btn-ghost text-xs" href={selected.telegram_post_url} target="_blank" rel="noreferrer"><ExternalLink size={14} className="inline" /> پست تلگرام</a>}
          </div>
        </section>
      </main> : <div className="card-ay p-8 text-sm text-ink-500">پستی برای بررسی وجود ندارد.</div>}
    </div>
  </div>;
}
