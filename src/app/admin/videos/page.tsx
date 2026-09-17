"use client";

import { FormEvent, useEffect, useState } from "react";
import { Check, Edit3, Plus, Save, Trash2, Video, X } from "lucide-react";
import { fetchAdminFreeLessons, saveAdminFreeLesson, deleteAdminFreeLesson, type ApiFreeLesson, type FreeLessonInput } from "@/lib/rahyar-api";

const KEY_NAME = "artistyar_web_admin_key";
const emptyLesson = (): FreeLessonInput => ({ slug: "", title: "", description: "", duration_label: "", video_url: "", thumbnail_url: "", chapters: [], sort_order: 0, is_active: true });

export default function AdminVideosPage() {
  const [apiKey, setApiKey] = useState("");
  const [lessons, setLessons] = useState<ApiFreeLesson[]>([]);
  const [draft, setDraft] = useState<FreeLessonInput>(emptyLesson());
  const [editingId, setEditingId] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem(KEY_NAME) || "";
    setApiKey(saved);
    if (saved) void load(saved);
  }, []);

  async function load(key = apiKey) {
    if (!key) { setError("کلید مدیریت وب را وارد کن."); return; }
    setLoading(true); setError("");
    try { setLessons(await fetchAdminFreeLessons(key)); window.localStorage.setItem(KEY_NAME, key); setApiKey(key); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "دریافت ویدیوها ناموفق بود."); }
    finally { setLoading(false); }
  }

  function edit(lesson: ApiFreeLesson) {
    setEditingId(lesson.id);
    setDraft({ slug: lesson.slug, title: lesson.title, description: lesson.description || "", duration_label: lesson.duration_label, video_url: lesson.video_url || "", thumbnail_url: lesson.thumbnail_url || "", chapters: lesson.chapters || [], sort_order: lesson.sort_order, is_active: lesson.is_active });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateDraft<K extends keyof FreeLessonInput>(key: K, value: FreeLessonInput[K]) { setDraft((current) => ({ ...current, [key]: value })); }

  async function onSave(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError(""); setMessage("");
    try { await saveAdminFreeLesson(apiKey, draft, editingId); await load(apiKey); setDraft(emptyLesson()); setEditingId(undefined); setMessage("درس با موفقیت ذخیره شد."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "ذخیره درس ناموفق بود."); }
    finally { setLoading(false); }
  }

  async function onDelete(id: number) {
    if (!window.confirm("این درس حذف شود؟")) return;
    setLoading(true); setError("");
    try { await deleteAdminFreeLesson(apiKey, id); setLessons((items) => items.filter((item) => item.id !== id)); if (editingId === id) { setDraft(emptyLesson()); setEditingId(undefined); } setMessage("درس حذف شد."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "حذف درس ناموفق بود."); }
    finally { setLoading(false); }
  }

  return <div className="space-y-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">کتابخانه رایگان</p><h2 className="mt-2 text-2xl font-semibold text-sand-50">مدیریت ویدیوها</h2><p className="mt-2 text-sm leading-7 text-ink-400">درس‌ها، لینک ویدیو، فصل‌ها و وضعیت انتشار Player را بدون تغییر کد مدیریت کن.</p></div><span className="flex items-center gap-2 text-xs text-ink-500"><Video size={15} className="text-gold-400" />{lessons.length} درس</span></div>
    <div className="card-ay p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-base font-medium text-sand-50">اتصال پنل مدیریت</h3><p className="mt-1 text-xs text-ink-500">کلید `WEB_ADMIN_API_KEY` را از تنظیمات backend وارد کن.</p></div><button type="button" className="btn-ghost !px-4 !py-2 text-xs" onClick={() => void load()} disabled={loading}>بارگذاری درس‌ها</button></div><div className="mt-4 flex gap-2"><input className="input-ay flex-1" type="password" name="web_admin_key" autoComplete="off" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="کلید مدیریت وب…" /><button type="button" className="btn-primary !px-5" onClick={() => void load()} disabled={loading}>اتصال</button></div></div>
    {error ? <p className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs leading-6 text-red-300" role="alert">{error}</p> : null}{message ? <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs leading-6 text-emerald-300" role="status"><Check className="ml-1 inline" size={14} />{message}</p> : null}
    <form className="card-ay space-y-5 p-5 sm:p-6" onSubmit={onSave}><div className="flex items-center justify-between gap-3"><div><h3 className="text-base font-medium text-sand-50">{editingId ? "ویرایش درس" : "افزودن درس جدید"}</h3><p className="mt-1 text-xs text-ink-500">برای نمایش عمومی، وضعیت انتشار را فعال نگه دار.</p></div>{editingId ? <button type="button" className="btn-ghost !px-3 !py-2 text-xs" onClick={() => { setDraft(emptyLesson()); setEditingId(undefined); }}><X size={14} /> لغو ویرایش</button> : null}</div><div className="grid gap-4 md:grid-cols-2"><label className="space-y-2 text-xs text-ink-400">شناسه انگلیسی<input className="input-ay" name="slug" value={draft.slug} onChange={(event) => updateDraft("slug", event.target.value)} placeholder="mixing-foundations…" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required /></label><label className="space-y-2 text-xs text-ink-400">عنوان درس<input className="input-ay" name="title" value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} placeholder="مبانی میکس تمیز…" required /></label><label className="space-y-2 text-xs text-ink-400">مدت نمایش<input className="input-ay" name="duration_label" value={draft.duration_label} onChange={(event) => updateDraft("duration_label", event.target.value)} placeholder="۱۲ دقیقه…" /></label><label className="space-y-2 text-xs text-ink-400">ترتیب نمایش<input className="input-ay" name="sort_order" type="number" min="0" value={draft.sort_order} onChange={(event) => updateDraft("sort_order", Number(event.target.value))} /></label></div><label className="block space-y-2 text-xs text-ink-400">توضیحات<textarea className="input-ay min-h-24 resize-y" name="description" value={draft.description || ""} onChange={(event) => updateDraft("description", event.target.value)} placeholder="توضیح کوتاه و کاربردی درباره درس…" /></label><div className="grid gap-4 md:grid-cols-2"><label className="space-y-2 text-xs text-ink-400">آدرس مستقیم ویدیو<input className="input-ay" name="video_url" type="url" value={draft.video_url || ""} onChange={(event) => updateDraft("video_url", event.target.value)} placeholder="https://cdn.example.com/video.mp4…" /></label><label className="space-y-2 text-xs text-ink-400">آدرس thumbnail<input className="input-ay" name="thumbnail_url" type="url" value={draft.thumbnail_url || ""} onChange={(event) => updateDraft("thumbnail_url", event.target.value)} placeholder="https://cdn.example.com/poster.webp…" /></label></div><div><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-medium text-sand-50">فصل‌های درس</p><p className="mt-1 text-xs text-ink-500">زمان هر فصل بر اساس ثانیه وارد شود.</p></div><button type="button" className="btn-ghost !px-3 !py-2 text-xs" onClick={() => updateDraft("chapters", [...draft.chapters, { title: "", time: 0 }])}><Plus size={14} /> فصل جدید</button></div><div className="mt-3 space-y-2">{draft.chapters.map((chapter, index) => <div key={index} className="flex flex-col gap-2 rounded-xl border border-white/[.07] bg-white/[.02] p-3 sm:flex-row"><input className="input-ay flex-1" value={chapter.title} placeholder={`عنوان فصل ${index + 1}…`} aria-label={`عنوان فصل ${index + 1}`} onChange={(event) => updateDraft("chapters", draft.chapters.map((item, i) => i === index ? { ...item, title: event.target.value } : item))} /><input className="input-ay sm:w-32" type="number" min="0" value={chapter.time} placeholder="ثانیه" aria-label={`زمان فصل ${index + 1}`} onChange={(event) => updateDraft("chapters", draft.chapters.map((item, i) => i === index ? { ...item, time: Number(event.target.value) } : item))} /><button type="button" className="btn-ghost !px-3 !py-2 text-xs" aria-label={`حذف فصل ${index + 1}`} onClick={() => updateDraft("chapters", draft.chapters.filter((_, i) => i !== index))}><Trash2 size={14} /></button></div>)}</div></div><label className="flex items-center gap-3 text-sm text-ink-300"><input type="checkbox" checked={draft.is_active} onChange={(event) => updateDraft("is_active", event.target.checked)} /> انتشار در پلیر عمومی</label><button className="btn-primary gap-2" type="submit" disabled={loading || !apiKey}><Save size={16} />{loading ? "در حال ذخیره…" : editingId ? "ذخیره تغییرات" : "افزودن درس"}</button></form>
    <div className="space-y-3"><div className="flex items-center justify-between"><h3 className="text-base font-medium text-sand-50">درس‌های ثبت‌شده</h3><button type="button" className="btn-ghost !px-3 !py-2 text-xs" onClick={() => { setDraft(emptyLesson()); setEditingId(undefined); }}><Plus size={14} />درس جدید</button></div>{lessons.map((lesson) => <article key={lesson.id} className="card-ay flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h4 className="truncate text-sm font-medium text-sand-50">{lesson.title}</h4><span className={`rounded-full px-2 py-1 text-[10px] ${lesson.is_active ? "bg-emerald-400/10 text-emerald-300" : "bg-white/[.06] text-ink-500"}`}>{lesson.is_active ? "منتشر" : "پیش‌نویس"}</span></div><p className="mt-2 truncate text-xs text-ink-500">{lesson.slug} · {lesson.duration_label || "بدون مدت"} · {lesson.chapters.length} فصل</p></div><div className="flex shrink-0 gap-2"><button type="button" className="btn-ghost !px-3 !py-2 text-xs" onClick={() => edit(lesson)}><Edit3 size={14} />ویرایش</button><button type="button" className="btn-ghost !px-3 !py-2 text-xs text-red-300 hover:border-red-300/30 hover:text-red-200" onClick={() => void onDelete(lesson.id)}><Trash2 size={14} />حذف</button></div></article>)}</div>
  </div>;
}
