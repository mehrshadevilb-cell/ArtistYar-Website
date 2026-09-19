"use client";

import { FormEvent, useEffect, useState } from "react";
import { Check, CloudUpload, GripVertical, LoaderCircle, Pencil, Play, RefreshCw, Trash2, X } from "lucide-react";

type Chapter = { title: string; time: number };
type Lesson = {
  id: string; publicId: string; title: string; description: string; videoUrl: string;
  thumbnailUrl: string | null; duration: number | null; chapters: Chapter[];
  sortOrder: number; isActive: boolean; createdAt: string; updatedAt: string;
};
type StorageFile = { path: string; name: string; mimeType: string; size: number; createdAt: string; url: string };

const opts: RequestInit = { cache: "no-store", credentials: "include" };
const MAX_VIDEO_BYTES = 1024 * 1024 * 1024;
const MAX_THUMB_BYTES = 10 * 1024 * 1024;

async function api(path: string, init?: RequestInit) {
  const r = await fetch(path, { ...opts, ...init });
  const text = await r.text();
  let data: any = {};
  try { data = JSON.parse(text); } catch { throw new Error(`پاسخ نامعتبر از سرور (${r.status})`); }
  if (!r.ok || data.ok === false) throw new Error(data.error || "عملیات ناموفق بود.");
  return data;
}

async function uploadDirect(file: File, kind: "video" | "thumbnail", onProgress?: (value: number) => void) {
  const maxSize = kind === "video" ? MAX_VIDEO_BYTES : MAX_THUMB_BYTES;
  if (file.size <= 0 || file.size > maxSize) {
    throw new Error(
      kind === "video"
        ? "حجم ویدیو باید بین ۱ بایت و ۱ گیگابایت باشد."
        : "حجم thumbnail باید بین ۱ بایت و ۱۰ مگابایت باشد.",
    );
  }

  const ticket = await api("/api/admin/free-education/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      mimeType: file.type || (kind === "video" ? "video/mp4" : "image/jpeg"),
      kind,
      size: file.size,
    }),
  });

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", ticket.signedUrl);
    xhr.setRequestHeader("Content-Type", file.type || ticket.mimeType || "application/octet-stream");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`آپلود مستقیم به Storage ناموفق بود (${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error("ارتباط مستقیم با Supabase Storage قطع شد."));
    xhr.onabort = () => reject(new Error("آپلود لغو شد."));
    xhr.send(file);
  });

  return { path: ticket.path as string, url: ticket.publicUrl as string };
}

function timeLabel(seconds: number | null) {
  if (!seconds || seconds < 0) return "—";
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

export default function FreeEducationAdminPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [storage, setStorage] = useState<StorageFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"upload" | "storage">("upload");
  const [selectedStoragePath, setSelectedStoragePath] = useState("");
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);

  async function load() {
    setError("");
    try {
      const data = await api("/api/admin/free-education");
      setLessons(data);
    } catch (e) { setError(e instanceof Error ? e.message : "دریافت آموزش‌ها ناموفق بود."); }
  }

  async function loadStorage() {
    setBusy(true); setError("");
    try {
      const data = await api("/api/admin/free-education?source=storage");
      setStorage(data);
      if (!data.length) setMessage("ویدیویی در Storage پیدا نشد.");
    } catch (e) { setError(e instanceof Error ? e.message : "دریافت Storage ناموفق بود."); }
    finally { setBusy(false); }
  }

  useEffect(() => { void load(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const form = new FormData(event.currentTarget);
      form.set("mode", mode);

      if (mode === "upload") {
        const video = form.get("video");
        if (!(video instanceof File) || video.size <= 0) throw new Error("فایل ویدیو را انتخاب کنید.");

        setMessage("در حال آپلود مستقیم ویدیو به Storage…");
        const uploadedVideo = await uploadDirect(video, "video", (progress) => {
          setMessage(`در حال آپلود ویدیو… ${progress}%`);
        });
        form.delete("video");
        form.set("videoPath", uploadedVideo.path);

        const thumbnail = form.get("thumbnail");
        if (thumbnail instanceof File && thumbnail.size > 0) {
          setMessage("در حال آپلود مستقیم کاور…");
          const uploadedThumbnail = await uploadDirect(thumbnail, "thumbnail");
          form.delete("thumbnail");
          form.set("thumbnailUrl", uploadedThumbnail.url);
        } else {
          form.delete("thumbnail");
        }
      }

      setMessage("در حال ثبت متادیتا…");
      const data = await api("/api/admin/free-education", { method: "POST", body: form });
      setMessage(data.message || "آموزش ثبت شد.");
      event.currentTarget.reset();
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "ثبت آموزش ناموفق بود."); }
    finally { setBusy(false); }
  }

  function startEdit(lesson: Lesson) {
    setEditing(lesson);
    setChapters(lesson.chapters || []);
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const form = new FormData(event.currentTarget);
      const data = await api("/api/admin/free-education", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicId: editing.publicId,
          title: form.get("title"),
          description: form.get("description"),
          thumbnailUrl: form.get("thumbnailUrl"),
          sortOrder: Number(form.get("sortOrder") || 0),
          isActive: form.get("isActive") === "on",
          chapters,
        }),
      });
      setMessage("آموزش به‌روزرسانی شد.");
      setEditing(data.item);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "ذخیره ناموفق بود."); }
    finally { setBusy(false); }
  }

  async function remove(lesson: Lesson) {
    const removeFile = window.confirm("خود فایل ویدیو هم از Storage حذف شود؟");
    if (!window.confirm(`«${lesson.title}» حذف شود؟`)) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await api("/api/admin/free-education", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicId: lesson.publicId, removeFile }),
      });
      setMessage("آموزش حذف شد."); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "حذف ناموفق بود."); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <header>
        <p className="eyebrow">/ آموزش رایگان</p>
        <h1 className="mt-3 text-2xl font-semibold text-sand-50">مدیریت آموزش رایگان</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-ink-400">
          این بخش مستقل از Gallery است. ویدیو را مستقیم آپلود کن یا از فایل‌های موجود Supabase Storage انتخاب کن؛ سپس عنوان، کاور، فصل‌ها، ترتیب و وضعیت انتشار را مدیریت کن.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
        <section className="card-ay p-6">
          <div className="flex items-center gap-2 border-b border-white/[.07] pb-4">
            <CloudUpload size={20} className="text-gold-400" />
            <div><h2 className="font-medium text-sand-50">افزودن آموزش</h2><p className="text-xs text-ink-500">آپلود جدید یا انتخاب از Storage</p></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-white/[.03] p-1">
            <button type="button" onClick={() => { setMode("upload"); setSelectedStoragePath(""); }} className={`rounded-lg px-3 py-2 text-xs ${mode === "upload" ? "bg-gold-400 text-ink-950" : "text-ink-300"}`}>Upload جدید</button>
            <button type="button" onClick={() => { setMode("storage"); setSelectedStoragePath(""); void loadStorage(); }} className={`rounded-lg px-3 py-2 text-xs ${mode === "storage" ? "bg-gold-400 text-ink-950" : "text-ink-300"}`}>انتخاب از Storage</button>
          </div>

          {mode === "storage" ? (
            <div className="mt-4 space-y-2">
              {storage.map((file) => (
                <label key={file.path} className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/[.07] p-3 hover:border-gold-400/30">
                  <input type="radio" name="storagePick" value={file.path} checked={selectedStoragePath === file.path} onChange={() => setSelectedStoragePath(file.path)} />
                  <Play size={15} className="text-gold-400" />
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm text-sand-100">{file.name}</span><span className="text-[11px] text-ink-500">{Math.round(file.size / 1024 / 1024)} MB · {file.path}</span></span>
                  <a href={file.url} target="_blank" rel="noreferrer" className="text-xs text-gold-400">Preview</a>
                </label>
              ))}
              {!storage.length && !busy ? <p className="py-6 text-center text-xs text-ink-500">فایل ویدیویی موجود نیست.</p> : null}
            </div>
          ) : null}

          <form id="storage-form" className="mt-5 space-y-4" onSubmit={submit}>
            <input type="hidden" name="videoPath" value={mode === "storage" ? selectedStoragePath : ""} readOnly />
            <label className="block"><span className="mb-2 block text-xs text-ink-300">عنوان</span><input className="input-ay" name="title" minLength={3} required placeholder="مثلاً آموزش EQ در ۱۰ دقیقه" /></label>
            <label className="block"><span className="mb-2 block text-xs text-ink-300">توضیحات</span><textarea className="input-ay min-h-24" name="description" /></label>
            {mode === "upload" ? (
              <>
                <label className="block"><span className="mb-2 block text-xs text-ink-300">ویدیو (حداکثر ۱ گیگابایت)</span><input className="block w-full rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-ink-300" name="video" type="file" accept="video/*,.mp4,.webm,.mov,.mkv" required /></label>
                <label className="block"><span className="mb-2 block text-xs text-ink-300">کاور (اختیاری، حداکثر ۱۰ مگابایت)</span><input className="block w-full rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-ink-300" name="thumbnail" type="file" accept="image/*" /></label>
              </>
            ) : (
              <p className="rounded-xl border border-gold-400/20 bg-gold-400/[.05] p-3 text-xs leading-6 text-gold-200">یک ویدیو را از لیست بالا انتخاب کن.</p>
            )}
            <label className="block"><span className="mb-2 block text-xs text-ink-300">ترتیب</span><input className="input-ay" name="sortOrder" type="number" defaultValue="0" /></label>
            <button className="btn-primary w-full gap-2" disabled={busy} type="submit">{busy ? <><LoaderCircle size={16} className="animate-spin" /> در حال ذخیره…</> : <><Check size={16} /> ثبت آموزش رایگان</>}</button>
          </form>
        </section>

        <section className="card-ay p-6">
          <div className="flex items-center justify-between border-b border-white/[.07] pb-4">
            <div><h2 className="font-medium text-sand-50">کتابخانه آموزش رایگان</h2><p className="mt-1 text-xs text-ink-500">{lessons.length} آموزش</p></div>
            <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => void load()} disabled={busy}><RefreshCw size={13} /> تازه‌سازی</button>
          </div>
          <div className="mt-4 space-y-3">
            {lessons.map((lesson) => (
              <article key={lesson.id} className="rounded-xl border border-white/[.07] bg-white/[.02] p-4">
                <div className="flex items-start gap-3">
                  <GripVertical size={17} className="mt-1 text-ink-500" />
                  <div className="min-w-0 flex-1"><h3 className="truncate text-sm font-medium text-sand-50">{lesson.title}</h3><p className="mt-1 text-xs text-ink-500">{timeLabel(lesson.duration)} · ترتیب {lesson.sortOrder} · {lesson.isActive ? "منتشر" : "پیش‌نویس"}</p></div>
                  <a href={lesson.videoUrl} target="_blank" rel="noreferrer" className="btn-ghost !px-2.5 !py-1.5 text-xs"><Play size={13} /></a>
                </div>
                <p className="mt-3 text-xs leading-6 text-ink-400">{lesson.description || "بدون توضیحات"}</p>
                <div className="mt-3 flex gap-2 border-t border-white/[.06] pt-3">
                  <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => startEdit(lesson)}><Pencil size={13} /> ویرایش</button>
                  <button type="button" className="btn-ghost !border-red-300/20 !px-3 !py-1.5 text-xs !text-red-300" onClick={() => void remove(lesson)} disabled={busy}><Trash2 size={13} /> حذف</button>
                </div>
              </article>
            ))}
            {!lessons.length ? <p className="py-12 text-center text-sm text-ink-500">هنوز آموزش رایگانی ثبت نشده.</p> : null}
          </div>
        </section>
      </div>

      {message ? <p className="flex items-center gap-2 text-xs text-emerald-300"><Check size={15} /> {message}</p> : null}
      {error ? <p className="text-xs text-red-300">{error}</p> : null}

      {editing ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4">
          <form className="card-ay max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6" onSubmit={saveEdit}>
            <div className="flex items-center justify-between"><h2 className="text-lg font-medium text-sand-50">ویرایش آموزش</h2><button type="button" onClick={() => setEditing(null)}><X size={18} /></button></div>
            <div className="mt-5 space-y-4">
              <label className="block"><span className="mb-2 block text-xs text-ink-300">عنوان</span><input className="input-ay" name="title" defaultValue={editing.title} required /></label>
              <label className="block"><span className="mb-2 block text-xs text-ink-300">توضیحات</span><textarea className="input-ay min-h-24" name="description" defaultValue={editing.description} /></label>
              <label className="block"><span className="mb-2 block text-xs text-ink-300">URL کاور</span><input className="input-ay" name="thumbnailUrl" defaultValue={editing.thumbnailUrl || ""} /></label>
              <div><div className="mb-2 flex items-center justify-between"><span className="text-xs text-ink-300">فصل‌ها</span><button type="button" className="btn-ghost !px-2 !py-1 text-xs" onClick={() => setChapters([...chapters, { title: "", time: 0 }])}>+ فصل</button></div>
                <div className="space-y-2">{chapters.map((chapter, i) => <div key={i} className="grid grid-cols-[1fr_100px_auto] gap-2"><input className="input-ay" value={chapter.title} placeholder="عنوان فصل" onChange={e => setChapters(chapters.map((x,j)=>j===i?{...x,title:e.target.value}:x))}/><input className="input-ay" type="number" min="0" value={chapter.time} placeholder="ثانیه" onChange={e => setChapters(chapters.map((x,j)=>j===i?{...x,time:Number(e.target.value)||0}:x))}/><button type="button" className="btn-ghost !px-2" onClick={() => setChapters(chapters.filter((_,j)=>j!==i))}><X size={15}/></button></div>)}</div>
              </div>
              <label className="flex items-center gap-2 text-xs text-ink-300"><input type="checkbox" name="isActive" defaultChecked={editing.isActive}/> انتشار</label>
              <label className="block"><span className="mb-2 block text-xs text-ink-300">ترتیب</span><input className="input-ay" name="sortOrder" type="number" defaultValue={editing.sortOrder}/></label>
              <button className="btn-primary w-full" type="submit" disabled={busy}>{busy ? "در حال ذخیره…" : "ذخیره تغییرات"}</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
