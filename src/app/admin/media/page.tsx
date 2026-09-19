"use client";

import { FormEvent, useEffect, useState } from "react";
import { Check, CloudUpload, LoaderCircle, Pencil, RefreshCw, ShieldCheck, Trash2, X } from "lucide-react";

type MediaItem = {
  id: string;
  publicId: string;
  title: string;
  description: string;
  category: string;
  resourceType: "image" | "video" | "raw";
  url: string;
  artist?: string;
};
type StorageItem = { path: string; name: string; mimeType: string; size: number; createdAt: string; url: string };
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

function categoryLabel(category: string) {
  if (category === "student-work") return "نمونه‌کار هنرجو";
  if (category === "prodby-mehrshad") return "ProdBy Mehrshad";
  return "آموزش رایگان";
}

function guessCategoryFromPath(path: string): "student-work" | "free-training" | "prodby-mehrshad" {
  const lower = path.toLowerCase();
  if (lower.includes("prodby") || path.includes("ProdBy Mehrshad")) return "prodby-mehrshad";
  if (lower.includes("free-training") || lower.includes("training")) return "free-training";
  return "student-work";
}

async function readApiResponse(response: Response): Promise<Record<string, any>> {
  const text = await response.text();
  try {
    return JSON.parse(text) as Record<string, any>;
  } catch {
    throw new Error(
      response.status === 413
        ? "حجم فایل از محدودیت سرور بیشتر است؛ فایل کوچک‌تر از ۵۰ مگابایت انتخاب کن."
        : response.status === 502
          ? "سرور نتوانست به Supabase پاسخ معتبر بدهد. از بخش «سیستم» در diagnostics اتصال Storage و جدول media_assets را بررسی کن."
          : `پاسخ نامعتبر از سرور دریافت شد (${response.status}).`,
    );
  }
}

const fetchOpts: RequestInit = { cache: "no-store", credentials: "include" };

async function uploadDirectToStorage(
  file: File,
  category: string,
  onProgress?: (pct: number) => void,
): Promise<{ path: string; mimeType: string }> {
  if (file.size <= 0 || file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("حجم فایل باید بین ۱ بایت و ۵۰ مگابایت باشد.");
  }

  const ticketRes = await fetch("/api/media/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      category,
    }),
  });
  const ticket = await readApiResponse(ticketRes);
  if (!ticketRes.ok || ticket.ok === false || !ticket.signedUrl || !ticket.path) {
    throw new Error(ticket.error || "ساخت لینک آپلود ناموفق بود.");
  }

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", ticket.signedUrl as string);
    xhr.setRequestHeader("Content-Type", file.type || ticket.mimeType || "application/octet-stream");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`آپلود مستقیم به Storage ناموفق بود (${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error("ارتباط مستقیم با Supabase Storage قطع شد."));
    xhr.onabort = () => reject(new Error("آپلود لغو شد."));
    xhr.send(file);
  });

  return { path: ticket.path as string, mimeType: (ticket.mimeType as string) || file.type || "application/octet-stream" };
}

export default function AdminMediaPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [storageItems, setStorageItems] = useState<StorageItem[]>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<MediaItem | null>(null);

  useEffect(() => {
    void loadItems();
  }, []);

  async function loadItems() {
    setError("");
    try {
      const response = await fetch("/api/media", fetchOpts);
      const data = await readApiResponse(response);
      setConfigured(data.configured !== false);
      if (!response.ok) throw new Error(data.error || "دریافت محتوا ناموفق بود.");
      if (data.configured === false) {
        setError(
          "Supabase روی سرور تنظیم نشده: SUPABASE_URL و SUPABASE_SECRET_KEY (یا SERVICE_ROLE_KEY) را در Render ست کن.",
        );
        setItems([]);
        return;
      }
      setItems(data.items || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "دریافت محتوا ناموفق بود.");
    }
  }

  async function loadStorage() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/media?source=storage", fetchOpts);
      const data = await readApiResponse(response);
      if (response.status === 401) {
        throw new Error("نشست ادمین معتبر نیست — دوباره از /login وارد شو.");
      }
      if (!response.ok) throw new Error(data.error || "دریافت فایل‌های Storage ناموفق بود.");
      setStorageItems(data.items || []);
      if (!(data.items || []).length) {
        setMessage("Storage خالی است یا پوشه‌ها هنوز ساخته نشده‌اند. یک فایل آپلود کن.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "دریافت فایل‌های Storage ناموفق بود.");
    } finally {
      setBusy(false);
    }
  }

  async function registerStorageItem(item: StorageItem) {
    const title = window.prompt("عنوان محتوا را وارد کن:", item.name.replace(/\.[^.]+$/, ""));
    if (!title) return;
    const guessed = guessCategoryFromPath(item.path);
    let category = guessed;
    if (guessed === "student-work") {
      const choice = window.prompt(
        "دسته را انتخاب کن:\n1 = نمونه‌کار هنرجو\n2 = آموزش رایگان\n3 = ProdBy Mehrshad",
        "1",
      );
      if (choice === "2") category = "free-training";
      else if (choice === "3") category = "prodby-mehrshad";
    }
    if (category === "student-work" && !window.confirm("رضایت انتشار این نمونه‌کار را تأیید می‌کنی؟")) return;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/media", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "register",
          publicId: item.path,
          title,
          description: "",
          category,
          consent: true,
          mimeType: item.mimeType,
        }),
      });
      const data = await readApiResponse(response);
      if (!response.ok || data.ok === false) throw new Error(data.error || "ثبت فایل ناموفق بود.");
      setMessage(data.message || "فایل در گالری ثبت شد.");
      await loadItems();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ثبت فایل ناموفق بود.");
    } finally {
      setBusy(false);
    }
  }

  async function refreshTags(item: MediaItem) {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/media", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "refresh-tags", publicId: item.publicId }),
      });
      const data = await readApiResponse(response);
      if (!response.ok || data.ok === false) throw new Error(data.error || "استخراج تگ ناموفق بود.");
      setMessage(data.message || "کاور و تگ‌های MP3 به‌روز شد.");
      await loadItems();
    } catch (e) {
      setError(e instanceof Error ? e.message : "استخراج تگ ناموفق بود.");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const consent = form.get("consent") === "on";
    const category = String(form.get("category") || "");
    const title = String(form.get("title") || "").trim();
    const description = String(form.get("description") || "").trim();
    const selectedFile = form.get("file");

    if (!(selectedFile instanceof File) || selectedFile.size <= 0) {
      setError("فایل را انتخاب کنید.");
      setBusy(false);
      return;
    }
    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setError("حجم فایل باید حداکثر ۵۰ مگابایت باشد.");
      setBusy(false);
      return;
    }
    if (title.length < 3) {
      setError("عنوان محتوا را کامل وارد کنید.");
      setBusy(false);
      return;
    }
    if (category === "student-work" && !consent) {
      setError("برای انتشار نمونه‌کار هنرجو، تأیید رضایت لازم است.");
      setBusy(false);
      return;
    }

    try {
      setMessage("در حال ساخت لینک آپلود…");
      const uploaded = await uploadDirectToStorage(selectedFile, category, (pct) => {
        setMessage(`آپلود مستقیم به Storage… ${pct}%`);
      });

      setMessage("در حال ثبت در گالری…");
      const response = await fetch("/api/media", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "register",
          publicId: uploaded.path,
          title,
          description,
          category,
          consent: consent || category === "prodby-mehrshad" || category === "free-training",
          mimeType: uploaded.mimeType,
        }),
      });
      const data = await readApiResponse(response);
      if (response.status === 401) {
        throw new Error("نشست ادمین منقضی شده — دوباره وارد شو.");
      }
      if (response.status === 503) {
        throw new Error(
          data.error ||
            "Supabase تنظیم نشده. SUPABASE_URL + SUPABASE_SECRET_KEY را روی Render ست کن.",
        );
      }
      if (!response.ok || data.ok === false) {
        // Storage has the file but DB register failed — recovery path: user can re-register from Storage list
        throw new Error(
          (data.error || "ثبت در گالری ناموفق بود.") +
            " فایل در Storage آپلود شده؛ از بخش «فایل‌های موجود در Storage» دوباره ثبت کن.",
        );
      }
      setMessage(data.message || "آپلود و انتشار انجام شد.");
      formEl.reset();
      await loadItems();
    } catch (e) {
      setError(e instanceof Error ? e.message : "آپلود ناموفق بود.");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    setMessage("");
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/media", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          publicId: editing.publicId,
          title: form.get("title"),
          description: form.get("description"),
        }),
      });
      const data = await readApiResponse(response);
      if (!response.ok || data.ok === false) throw new Error(data.error || "ویرایش ناموفق بود.");
      setEditing(null);
      setMessage(data.message || "ویرایش انجام شد.");
      await loadItems();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ویرایش ناموفق بود.");
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(item: MediaItem) {
    if (!window.confirm(`محتوای «${item.title}» حذف شود؟ فایل از Supabase Storage هم حذف می‌شود.`)) return;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ publicId: item.publicId }),
      });
      const data = await readApiResponse(response);
      if (!response.ok || data.ok === false) throw new Error(data.error || "حذف ناموفق بود.");
      setMessage(data.message || "فایل حذف شد.");
      await loadItems();
    } catch (e) {
      setError(e instanceof Error ? e.message : "حذف ناموفق بود.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">/ مدیریت محتوا</p>
        <h2 className="mt-3 text-2xl font-semibold text-sand-50">آپلود و مدیریت رسانه</h2>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-ink-400">
          آپلود مستقیم به Supabase Storage (بدون بافر سرور). حداکثر ۵۰ مگابایت. کلیدها فقط روی سرور هستند.
        </p>
        {configured === false ? (
          <p className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs text-amber-200">
            وضعیت: Supabase پیکربندی نشده — آپلود تا ست شدن env کار نمی‌کند.
          </p>
        ) : configured === true ? (
          <p className="mt-3 text-xs text-emerald-300">وضعیت: اتصال Supabase فعال است · آپلود مستقیم فعال</p>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
        <form className="card-ay space-y-4 p-6" onSubmit={onSubmit}>
          <div className="flex items-center gap-3 border-b border-white/[.07] pb-4">
            <CloudUpload className="text-gold-400" size={22} />
            <div>
              <h3 className="font-medium text-sand-50">محتوای جدید</h3>
              <p className="mt-1 text-xs text-ink-500">حداکثر ۵۰ مگابایت · صوت / ویدیو / تصویر / PDF · آپلود مستقیم</p>
            </div>
          </div>
          <label className="block">
            <span className="mb-2 block text-xs text-ink-300">نوع محتوا</span>
            <select className="input-ay" name="category" defaultValue="prodby-mehrshad">
              <option value="prodby-mehrshad">ProdBy Mehrshad</option>
              <option value="student-work">نمونه‌کار هنرجو</option>
              <option value="free-training">آموزش رایگان</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-xs text-ink-300">عنوان</span>
            <input className="input-ay" name="title" placeholder="عنوان محتوا" minLength={3} required />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs text-ink-300">توضیحات</span>
            <textarea className="input-ay min-h-28 resize-y" name="description" placeholder="توضیح کوتاه…" />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs text-ink-300">فایل</span>
            <input
              className="block w-full rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-ink-300 file:mr-3 file:rounded-lg file:border-0 file:bg-gold-500/15 file:px-3 file:py-2 file:text-gold-300"
              name="file"
              type="file"
              accept="audio/*,video/*,image/*,.pdf"
              required
            />
          </label>
          <label className="flex items-start gap-3 rounded-xl border border-white/[.07] bg-white/[.02] p-3 text-xs leading-6 text-ink-400">
            <input className="mt-1 accent-amber-400" name="consent" type="checkbox" />
            <span>
              <strong className="text-sand-100">تأیید انتشار</strong>
              <br />
              برای نمونه‌کار هنرجو، رضایت انتشار اثر را تأیید می‌کنم.
            </span>
          </label>
          <button className="btn-primary w-full gap-2" type="submit" disabled={busy}>
            {busy ? (
              <>
                <LoaderCircle size={16} className="animate-spin" /> در حال آپلود…
              </>
            ) : (
              <>
                <CloudUpload size={16} /> آپلود و انتشار
              </>
            )}
          </button>
        </form>

        <div className="card-ay p-6">
          <div className="flex items-center justify-between gap-3 border-b border-white/[.07] pb-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-gold-400" size={21} />
              <div>
                <h3 className="font-medium text-sand-50">محتوای منتشرشده</h3>
                <p className="mt-1 text-xs text-ink-500">{items.length} مورد</p>
              </div>
            </div>
            <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => void loadItems()} disabled={busy}>
              <RefreshCw size={13} />
              تازه‌سازی
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {items.length ? (
              items.map((item) => (
                <div key={item.id} className="rounded-xl border border-white/[.07] bg-white/[.02] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <strong className="text-sm text-sand-100">{item.title}</strong>
                    <span className="text-[10px] text-gold-400">{categoryLabel(item.category)}</span>
                  </div>
                  {item.artist ? <p className="mt-1 text-[11px] text-ink-500">{item.artist}</p> : null}
                  <a
                    className="mt-2 block truncate text-xs text-ink-500 hover:text-gold-300"
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    مشاهده فایل
                  </a>
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-white/[.06] pt-3">
                    <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setEditing(item)}>
                      <Pencil size={13} /> ویرایش
                    </button>
                    <button
                      type="button"
                      className="btn-ghost !px-3 !py-1.5 text-xs"
                      onClick={() => void refreshTags(item)}
                      disabled={busy}
                    >
                      <RefreshCw size={13} /> کاور/تگ
                    </button>
                    <button
                      type="button"
                      className="btn-ghost !border-red-300/20 !px-3 !py-1.5 text-xs !text-red-300 hover:!bg-red-400/10"
                      onClick={() => void removeItem(item)}
                      disabled={busy}
                    >
                      <Trash2 size={13} /> حذف
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm leading-7 text-ink-500">هنوز محتوای منتشرشده‌ای نیست.</p>
            )}
          </div>
        </div>
      </div>

      <div className="card-ay p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[.07] pb-4">
          <div>
            <h3 className="font-medium text-sand-50">فایل‌های موجود در Storage</h3>
            <p className="mt-1 text-xs text-ink-500">ثبت در گالری بدون آپلود دوباره · بازیابی پس از finalize ناموفق</p>
          </div>
          <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => void loadStorage()} disabled={busy}>
            بارگذاری فایل‌ها
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {storageItems.length ? (
            storageItems.map((file) => (
              <div key={file.path} className="rounded-xl border border-white/[.07] bg-white/[.02] p-3">
                <p className="truncate text-sm text-sand-100" title={file.path}>
                  {file.path}
                </p>
                <p className="mt-1 text-[11px] text-ink-500">
                  {file.mimeType} · {Math.round(file.size / 1024)} KB
                </p>
                <button
                  type="button"
                  className="btn-primary mt-3 w-full !px-3 !py-1.5 text-xs"
                  onClick={() => void registerStorageItem(file)}
                  disabled={busy}
                >
                  ثبت در گالری
                </button>
              </div>
            ))
          ) : (
            <p className="text-sm leading-7 text-ink-500">برای دیدن فایل‌ها روی «بارگذاری فایل‌ها» کلیک کن.</p>
          )}
        </div>
      </div>

      {message ? (
        <p className="flex items-center gap-2 text-xs text-emerald-300">
          <Check size={15} /> {message}
        </p>
      ) : null}
      {error ? <p className="text-xs text-red-300">{error}</p> : null}

      {editing ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4">
          <form className="card-ay w-full max-w-lg space-y-4 p-6" onSubmit={saveEdit}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-sand-50">ویرایش محتوا</h2>
              <button type="button" onClick={() => setEditing(null)}>
                <X size={18} />
              </button>
            </div>
            <label className="block">
              <span className="mb-2 block text-xs text-ink-300">عنوان</span>
              <input className="input-ay" name="title" defaultValue={editing.title} required minLength={3} />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs text-ink-300">توضیحات</span>
              <textarea className="input-ay min-h-24" name="description" defaultValue={editing.description} />
            </label>
            <button className="btn-primary w-full" type="submit" disabled={busy}>
              {busy ? "در حال ذخیره…" : "ذخیره"}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
