"use client";

import { FormEvent, useEffect, useState } from "react";
import { Check, CloudUpload, Edit3, Plus, Save, Trash2, X } from "lucide-react";
import {
  fetchAdminFreeLessons,
  saveAdminFreeLesson,
  deleteAdminFreeLesson,
  type ApiFreeLesson,
  type FreeLessonInput,
} from "@/lib/rahyar-api";

type UploadTicketResponse = { ok: boolean; path?: string; signedUrl?: string; publicUrl?: string; mimeType?: string; error?: string };


async function uploadDirectToStorage(file: File, kind: "video" | "thumbnail"): Promise<{ url: string }> {
  const ticketResponse = await fetch("/api/admin/free-education/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ filename: file.name, mimeType: file.type, kind, size: file.size }),
  });
  const ticketText = await ticketResponse.text();
  let ticket: UploadTicketResponse;
  try { ticket = JSON.parse(ticketText) as UploadTicketResponse; }
  catch { throw new Error(ticketText.slice(0, 180) || "ساخت لینک آپلود ناموفق بود (" + ticketResponse.status + ")."); }
  if (!ticketResponse.ok || !ticket.ok || !ticket.signedUrl || !ticket.publicUrl) {
    throw new Error(ticket.error || "ساخت لینک آپلود ناموفق بود (" + ticketResponse.status + ").");
  }
  const uploadBody = new FormData();
  uploadBody.append("cacheControl", "31536000");
  uploadBody.append("", file);
  const uploadResponse = await fetch(ticket.signedUrl, { method: "PUT", body: uploadBody });
  if (!uploadResponse.ok) {
    const detail = await uploadResponse.text().catch(() => "");
    throw new Error(detail.slice(0, 240) || "آپلود مستقیم به Storage ناموفق بود (" + uploadResponse.status + ").");
  }
  return { url: ticket.publicUrl };
}

const emptyLesson = (): FreeLessonInput => ({
  slug: "",
  title: "",
  description: "",
  duration_label: "",
  video_url: "",
  thumbnail_url: "",
  chapters: [],
  sort_order: 0,
  is_active: true,
});

export default function AdminVideosPage() {
  const [lessons, setLessons] = useState<ApiFreeLesson[]>([]);
  const [draft, setDraft] = useState<FreeLessonInput>(emptyLesson());
  const [editingId, setEditingId] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState<"video" | "thumbnail" | "">("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      setLessons(await fetchAdminFreeLessons());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "دریافت درس‌ها ناموفق بود.");
    }
  }

  function updateDraft<K extends keyof FreeLessonInput>(key: K, value: FreeLessonInput[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function edit(lesson: ApiFreeLesson) {
    setEditingId(lesson.id);
    setDraft({
      slug: lesson.slug,
      title: lesson.title,
      description: lesson.description || "",
      duration_label: lesson.duration_label,
      video_url: lesson.video_url || "",
      thumbnail_url: lesson.thumbnail_url || "",
      chapters: lesson.chapters || [],
      sort_order: lesson.sort_order,
      is_active: lesson.is_active,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function uploadVideo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploading(true);
    setError("");
    setMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const file = form.get("file");
    const uploadTitle = String(form.get("title") || "").trim();
    if (!(file instanceof File)) {
      setError("فایل ویدیو را انتخاب کن.");
      setUploading(false);
      return;
    }
    if (file.size > 1024 * 1024 * 1024) {
      setError("حداکثر حجم ویدیو ۱ گیگابایت است.");
      setUploading(false);
      return;
    }
    try {
      const data = await uploadDirectToStorage(file, "video");
      setDraft((current) => ({
        ...current,
        title: current.title || uploadTitle,
        slug: current.slug || `lesson-${Date.now()}`,
        video_url: data.url,
      }));
      setMessage("ویدیو در Supabase آپلود شد و آدرس آن در فرم درس قرار گرفت؛ اطلاعات درس را ذخیره کن.");
      formElement.reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "آپلود ویدیو ناموفق بود.");
    } finally {
      setUploading(false);
    }
  }

  async function uploadAsset(file: File, kind: "video" | "thumbnail") {
    setUploadingAsset(kind);
    setError("");
    setMessage("");
    try {
      if (kind === "video" && file.size > 1024 * 1024 * 1024) {
        throw new Error("حداکثر حجم ویدیو ۱ گیگابایت است.");
      }
      if (kind === "thumbnail" && file.size > 10 * 1024 * 1024) {
        throw new Error("حداکثر حجم thumbnail ۱۰ مگابایت است.");
      }
      const data = await uploadDirectToStorage(file, kind);
      updateDraft(kind === "video" ? "video_url" : "thumbnail_url", data.url);
      setMessage(
        kind === "video"
          ? "ویدیو آپلود شد؛ حالا درس را ذخیره کن."
          : "thumbnail آپلود شد؛ حالا درس را ذخیره کن.",
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "آپلود فایل ناموفق بود.");
    } finally {
      setUploadingAsset("");
    }
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await saveAdminFreeLesson(draft, editingId);
      await load();
      setDraft(emptyLesson());
      setEditingId(undefined);
      setMessage("درس با موفقیت ذخیره شد.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ذخیره درس ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(id: number) {
    if (!window.confirm("این درس حذف شود؟")) return;
    setLoading(true);
    try {
      await deleteAdminFreeLesson(id);
      setLessons((items) => items.filter((item) => item.id !== id));
      setMessage("درس حذف شد.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "حذف درس ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">کتابخانه رایگان</p>
        <h2 className="mt-2 text-2xl font-semibold text-sand-50">مدیریت ویدیوهای آموزشی</h2>
        <p className="mt-2 text-sm leading-7 text-ink-400">
          ویدیو مستقیم در Supabase آپلود می‌شود و سپس به یک درس قابل انتشار تبدیل می‌شود.
        </p>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs leading-6 text-red-300" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p
          className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs leading-6 text-emerald-300"
          role="status"
        >
          <Check className="ml-1 inline" size={14} />
          {message}
        </p>
      ) : null}

      <form className="card-ay space-y-4 p-5" onSubmit={uploadVideo}>
        <div className="flex items-center gap-3">
          <CloudUpload className="text-gold-400" size={21} />
          <div>
            <h3 className="font-medium text-sand-50">۱. آپلود ویدیو به Supabase</h3>
            <p className="mt-1 text-xs text-ink-500">حداکثر ۱ گیگابایت؛ فایل فقط در دسته آموزش رایگان ثبت می‌شود.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input className="input-ay" name="title" placeholder="عنوان ویدیو برای Storage" required minLength={3} />
          <input
            className="block rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-ink-300 file:mr-3 file:rounded-lg file:border-0 file:bg-gold-500/15 file:px-3 file:py-2 file:text-gold-300"
            name="file"
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/x-matroska,.mp4,.webm,.mov,.mkv,.m4v"
            required
          />
        </div>
        <button className="btn-primary gap-2" disabled={uploading || Boolean(uploadingAsset)}>
          {uploading ? "در حال آپلود…" : "آپلود و انتقال به فرم درس"}
        </button>
      </form>

      <form className="card-ay space-y-5 p-5 sm:p-6" onSubmit={onSave}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-medium text-sand-50">{editingId ? "ویرایش درس" : "۲. اطلاعات درس"}</h3>
            <p className="mt-1 text-xs text-ink-500">آدرس فایل‌ها پس از آپلود در فیلد مربوط قرار می‌گیرد.</p>
          </div>
          {editingId ? (
            <button
              type="button"
              className="btn-ghost !px-3 !py-2 text-xs"
              onClick={() => {
                setDraft(emptyLesson());
                setEditingId(undefined);
              }}
            >
              <X size={14} /> لغو
            </button>
          ) : null}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-xs text-ink-400">
            Slug
            <input
              className="input-ay"
              value={draft.slug}
              onChange={(event) => updateDraft("slug", event.target.value)}
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              required
            />
          </label>
          <label className="space-y-2 text-xs text-ink-400">
            عنوان
            <input
              className="input-ay"
              value={draft.title}
              onChange={(event) => updateDraft("title", event.target.value)}
              required
            />
          </label>
          <label className="space-y-2 text-xs text-ink-400">
            مدت نمایش
            <input
              className="input-ay"
              value={draft.duration_label}
              onChange={(event) => updateDraft("duration_label", event.target.value)}
            />
          </label>
          <label className="space-y-2 text-xs text-ink-400">
            ترتیب
            <input
              className="input-ay"
              type="number"
              min="0"
              value={draft.sort_order}
              onChange={(event) => updateDraft("sort_order", Number(event.target.value))}
            />
          </label>
        </div>
        <label className="block space-y-2 text-xs text-ink-400">
          توضیحات
          <textarea
            className="input-ay min-h-24 resize-y"
            value={draft.description || ""}
            onChange={(event) => updateDraft("description", event.target.value)}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-xs text-ink-400">
            آدرس ویدیو
            <input
              className="input-ay"
              type="url"
              value={draft.video_url || ""}
              onChange={(event) => updateDraft("video_url", event.target.value)}
              required
            />
          </label>
          <label className="space-y-2 text-xs text-ink-400">
            آدرس thumbnail
            <input
              className="input-ay"
              type="url"
              value={draft.thumbnail_url || ""}
              onChange={(event) => updateDraft("thumbnail_url", event.target.value)}
            />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="btn-ghost cursor-pointer gap-2 text-xs">
            <CloudUpload size={15} />
            {uploadingAsset === "video" ? "در حال آپلود ویدیو…" : "آپلود ویدیو"}
            <input
              className="sr-only"
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/x-matroska,.mp4,.webm,.mov,.mkv,.m4v"
              disabled={Boolean(uploadingAsset) || uploading}
              onChange={(event) => {
                const selected = event.target.files?.[0];
                if (selected) void uploadAsset(selected, "video");
                event.target.value = "";
              }}
            />
          </label>
          <label className="btn-ghost cursor-pointer gap-2 text-xs">
            <CloudUpload size={15} />
            {uploadingAsset === "thumbnail" ? "در حال آپلود thumbnail…" : "آپلود thumbnail"}
            <input
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,.jpg,.jpeg,.png,.webp,.avif"
              disabled={Boolean(uploadingAsset) || uploading}
              onChange={(event) => {
                const selected = event.target.files?.[0];
                if (selected) void uploadAsset(selected, "thumbnail");
                event.target.value = "";
              }}
            />
          </label>
        </div>
        <label className="flex items-center gap-3 text-sm text-ink-300">
          <input
            type="checkbox"
            checked={draft.is_active}
            onChange={(event) => updateDraft("is_active", event.target.checked)}
          />
          انتشار عمومی
        </label>
        <button className="btn-primary gap-2" type="submit" disabled={loading || Boolean(uploadingAsset) || uploading}>
          <Save size={16} />
          {loading ? "در حال ذخیره…" : uploadingAsset ? "در حال آپلود…" : "ذخیره درس"}
        </button>
      </form>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-medium text-sand-50">درس‌های ثبت‌شده ({lessons.length})</h3>
          <button
            type="button"
            className="btn-ghost !px-3 !py-2 text-xs"
            onClick={() => {
              setDraft(emptyLesson());
              setEditingId(undefined);
            }}
          >
            <Plus size={14} />
            درس جدید
          </button>
        </div>
        {lessons.map((lesson) => (
          <article
            key={lesson.id}
            className="card-ay flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="truncate text-sm font-medium text-sand-50">{lesson.title}</h4>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] ${
                    lesson.is_active ? "bg-emerald-400/10 text-emerald-300" : "bg-white/[.06] text-ink-500"
                  }`}
                >
                  {lesson.is_active ? "منتشر" : "پیش‌نویس"}
                </span>
              </div>
              <p className="mt-2 truncate text-xs text-ink-500">
                {lesson.slug} · {lesson.duration_label || "بدون مدت"}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button type="button" className="btn-ghost !px-3 !py-2 text-xs" onClick={() => edit(lesson)}>
                <Edit3 size={14} />
                ویرایش
              </button>
              <button
                type="button"
                className="btn-ghost !px-3 !py-2 text-xs text-red-300"
                onClick={() => void onDelete(lesson.id)}
              >
                <Trash2 size={14} />
                حذف
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
