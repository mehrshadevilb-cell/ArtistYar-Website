"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Download, Edit3, RefreshCw, Search, Save, Users, X } from "lucide-react";

type Student = {
  id: number | string;
  full_name: string;
  phone: string | null;
  email: string | null;
  bio: string | null;
  level: string | null;
  experience_years: number;
  telegram_id: string | null;
  telegram_username: string | null;
  created_at: string;
  is_active: boolean;
  sources?: Array<"bot" | "spot">;
  spot_courses?: string[];
  spot_activated?: boolean;
  spot_watch_seconds?: number;
  spot_download_bytes?: number;
  editable?: boolean;
};

type Meta = {
  total: number;
  from_bot: number;
  from_spot: number;
  bot_ok: boolean;
  bot_error: string | null;
  bot_raw_count: number;
  spot_raw_count: number;
};

type Draft = {
  full_name: string;
  phone: string;
  email: string;
  bio: string;
  level: string;
  experience_years: number;
  is_active: boolean;
};

const emptyDraft: Draft = {
  full_name: "",
  phone: "",
  email: "",
  bio: "",
  level: "",
  experience_years: 0,
  is_active: true,
};

function readableError(value: unknown, fallback: string, message?: unknown) {
  if (typeof message === "string" && message.trim()) return message;
  const messages: Record<string, string> = {
    student_not_found: "هنرجو پیدا نشد.",
    invalid_phone: "شماره موبایل معتبر نیست.",
    phone_already_linked: "این شماره موبایل قبلاً به هنرجوی دیگری وصل شده است.",
    email_already_linked: "این ایمیل قبلاً به هنرجوی دیگری وصل شده است.",
    admin_session_required: "نشست مدیریت منقضی شده است؛ دوباره از /login وارد شو.",
    web_admin_api_key_not_configured:
      "WEB_ADMIN_API_KEY روی Render ست نشده (باید با کلید backend یکی باشد).",
    backend_unreachable: "backend راه‌یار در دسترس نیست.",
  };
  return messages[String(value || "")] || fallback;
}

function csvCell(value: string | number | null | undefined) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function formatBytes(n?: number) {
  if (!n) return "—";
  const gb = n / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = n / 1024 ** 2;
  return `${mb.toFixed(0)} MB`;
}

function formatWatch(seconds?: number) {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}س ${m}د`;
  return `${m} دقیقه`;
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [q, setQ] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "bot" | "spot">("all");
  const [editing, setEditing] = useState<Student | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load(query = q) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("limit", "500");
      if (query.trim()) params.set("q", query.trim());
      const response = await fetch(`/api/rahyar/admin/students?${params}`, {
        cache: "no-store",
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          readableError(data.error || data.detail, "دریافت هنرجوها ناموفق بود.", data.message),
        );
      }
      const items: Student[] = Array.isArray(data)
        ? data
        : Array.isArray(data.items)
          ? data.items
          : [];
      setStudents(items);
      setMeta(data.meta || null);
      if (data.meta && !data.meta.bot_ok && data.meta.bot_error) {
        setError(`ربات: ${data.meta.bot_error} — لیست SpotPlayer همچنان نمایش داده می‌شود.`);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "دریافت هنرجوها ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load("");
  }, []);

  const filtered = useMemo(() => {
    if (sourceFilter === "all") return students;
    return students.filter((s) => (s.sources || []).includes(sourceFilter));
  }, [students, sourceFilter]);

  function edit(student: Student) {
    if (student.editable === false || typeof student.id !== "number") {
      setMessage("این رکورد فقط از SpotPlayer است؛ برای ویرایش باید در ربات ثبت‌نام شده باشد.");
      return;
    }
    setEditing(student);
    setDraft({
      full_name: student.full_name,
      phone: student.phone || "",
      email: student.email || "",
      bio: student.bio || "",
      level: student.level || "",
      experience_years: student.experience_years || 0,
      is_active: student.is_active,
    });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editing || typeof editing.id !== "number") return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/rahyar/admin/students?id=${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          readableError(data.detail || data.error, "ذخیره پروفایل ناموفق بود.", data.message),
        );
      }
      setStudents((items) =>
        items.map((item) =>
          item.id === editing.id
            ? {
                ...item,
                ...data,
                sources: item.sources,
                spot_courses: item.spot_courses,
                editable: true,
              }
            : item,
        ),
      );
      setEditing(null);
      setMessage("پروفایل هنرجو ذخیره شد.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ذخیره پروفایل ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }

  function exportCsv() {
    const rows = [
      [
        "شناسه",
        "نام",
        "موبایل",
        "ایمیل",
        "منبع",
        "دوره‌های Spot",
        "فعال‌سازی Spot",
        "تماشا",
        "دانلود",
        "تلگرام",
        "سطح",
        "تاریخ",
      ],
      ...filtered.map((student) => [
        student.id,
        student.full_name,
        student.phone,
        student.email,
        (student.sources || []).join("+") || "bot",
        (student.spot_courses || []).join(" | "),
        student.spot_activated == null ? "" : student.spot_activated ? "بله" : "خیر",
        formatWatch(student.spot_watch_seconds),
        formatBytes(student.spot_download_bytes),
        student.telegram_username || student.telegram_id || "",
        student.level,
        student.created_at,
      ]),
    ];
    const csv = "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `artistyar-students-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const connected = useMemo(
    () => students.filter((s) => s.telegram_id || s.telegram_username).length,
    [students],
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">/ مدیریت ارتباط هنرجو</p>
          <h2 className="mt-3 text-2xl font-semibold text-sand-50">همهٔ هنرجوها</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-ink-400">
            ادغام خودکار از <strong className="text-sand-100">ربات راه‌یار</strong> و{" "}
            <strong className="text-sand-100">لایسنس‌های SpotPlayer</strong>. رکوردهای مشترک با موبایل یکی می‌شوند.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-ghost !px-4" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            به‌روزرسانی
          </button>
          <button type="button" className="btn-primary !px-4" onClick={exportCsv} disabled={!filtered.length}>
            <Download size={15} />
            خروجی CSV
          </button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card-ay p-4">
          <div className="flex items-center gap-2 text-ink-400">
            <Users size={16} className="text-gold-400" />
            <span className="text-xs">کل یکتا</span>
          </div>
          <strong className="mt-3 block text-2xl text-sand-50">{meta?.total ?? students.length}</strong>
        </div>
        <div className="card-ay p-4">
          <p className="text-xs text-ink-400">از ربات</p>
          <strong className="mt-3 block text-2xl text-sand-50">{meta?.from_bot ?? "—"}</strong>
        </div>
        <div className="card-ay p-4">
          <p className="text-xs text-ink-400">از SpotPlayer</p>
          <strong className="mt-3 block text-2xl text-gold-400">{meta?.from_spot ?? "—"}</strong>
        </div>
        <div className="card-ay p-4">
          <p className="text-xs text-ink-400">متصل به تلگرام</p>
          <strong className="mt-3 block text-2xl text-sand-50">{connected}</strong>
        </div>
      </div>

      {meta ? (
        <p className="text-xs leading-6 text-ink-500">
          raw ربات: {meta.bot_raw_count} · raw Spot: {meta.spot_raw_count} · backend:{" "}
          {meta.bot_ok ? "آنلاین" : "خطا"}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <input
          className="input-ay max-w-sm"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void load();
          }}
          placeholder="جستجو نام، موبایل، دوره…"
        />
        <button className="btn-ghost !px-4" type="button" onClick={() => void load()} disabled={loading}>
          <Search size={16} />
          جستجو
        </button>
        <div className="flex gap-1 rounded-full border border-white/10 p-1">
          {(
            [
              ["all", "همه"],
              ["bot", "ربات"],
              ["spot", "Spot"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`rounded-full px-3 py-1.5 text-xs ${
                sourceFilter === key ? "bg-gold-500/20 text-gold-300" : "text-ink-400"
              }`}
              onClick={() => setSourceFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-300" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p
          className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs text-emerald-300"
          role="status"
        >
          {message}
        </p>
      ) : null}

      <div className="card-ay overflow-x-auto">
        <table className="w-full min-w-[1200px] text-right text-sm">
          <thead className="border-b border-white/[.06] text-xs text-ink-500">
            <tr>
              <th className="px-4 py-3">نام</th>
              <th className="px-4 py-3">منبع</th>
              <th className="px-4 py-3">موبایل</th>
              <th className="px-4 py-3">Spot / دوره‌ها</th>
              <th className="px-4 py-3">تماشا / دانلود</th>
              <th className="px-4 py-3">تلگرام</th>
              <th className="px-4 py-3">وضعیت</th>
              <th className="px-4 py-3">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((student) => (
              <tr key={String(student.id)} className="border-b border-white/[.04] last:border-0">
                <td className="px-4 py-3 font-medium text-sand-100">{student.full_name}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(student.sources || ["bot"]).map((src) => (
                      <span
                        key={src}
                        className={`rounded-full px-2 py-0.5 text-[10px] ${
                          src === "spot"
                            ? "bg-gold-500/15 text-gold-300"
                            : "bg-emerald-400/10 text-emerald-300"
                        }`}
                      >
                        {src === "spot" ? "Spot" : "ربات"}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-ink-300" dir="ltr">
                  {student.phone || "—"}
                </td>
                <td className="px-4 py-3 text-xs text-ink-400">
                  {student.spot_courses?.length ? (
                    <span title={student.spot_courses.join(" · ")}>
                      {student.spot_activated ? "فعال · " : "غیرفعال · "}
                      {student.spot_courses.slice(0, 2).join(" · ")}
                      {student.spot_courses.length > 2 ? ` +${student.spot_courses.length - 2}` : ""}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-ink-500">
                  {formatWatch(student.spot_watch_seconds)} / {formatBytes(student.spot_download_bytes)}
                </td>
                <td className="px-4 py-3 text-ink-400">
                  {student.telegram_username
                    ? `@${student.telegram_username}`
                    : student.telegram_id
                      ? "متصل"
                      : "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] ${
                      student.is_active ? "bg-emerald-400/10 text-emerald-300" : "bg-red-400/10 text-red-300"
                    }`}
                  >
                    {student.is_active ? "فعال" : "غیرفعال"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {student.editable !== false && typeof student.id === "number" ? (
                    <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => edit(student)}>
                      <Edit3 size={13} />
                      ویرایش
                    </button>
                  ) : (
                    <span className="text-[11px] text-ink-500">فقط Spot</span>
                  )}
                </td>
              </tr>
            ))}
            {!filtered.length ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-ink-500">
                  {loading ? "در حال دریافت هنرجوها…" : "هنرجویی پیدا نشد."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {editing ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <form className="card-ay max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto p-6" onSubmit={save}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-sand-50">ویرایش پروفایل {editing.full_name}</h3>
              <button type="button" className="text-ink-400" onClick={() => setEditing(null)} aria-label="بستن">
                <X size={18} />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-xs text-ink-400">
                نام کامل
                <input
                  className="input-ay"
                  value={draft.full_name}
                  onChange={(event) => setDraft({ ...draft, full_name: event.target.value })}
                  required
                />
              </label>
              <label className="space-y-2 text-xs text-ink-400">
                موبایل
                <input
                  className="input-ay"
                  dir="ltr"
                  value={draft.phone || ""}
                  onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
                />
              </label>
              <label className="space-y-2 text-xs text-ink-400">
                ایمیل
                <input
                  className="input-ay"
                  dir="ltr"
                  value={draft.email || ""}
                  onChange={(event) => setDraft({ ...draft, email: event.target.value })}
                />
              </label>
              <label className="space-y-2 text-xs text-ink-400">
                سطح
                <input
                  className="input-ay"
                  value={draft.level || ""}
                  onChange={(event) => setDraft({ ...draft, level: event.target.value })}
                />
              </label>
            </div>
            <label className="space-y-2 text-xs text-ink-400">
              سابقه به سال
              <input
                className="input-ay"
                type="number"
                min={0}
                max={80}
                value={draft.experience_years}
                onChange={(event) => setDraft({ ...draft, experience_years: Number(event.target.value) })}
              />
            </label>
            <label className="space-y-2 text-xs text-ink-400">
              بیوگرافی
              <textarea
                className="input-ay min-h-28"
                value={draft.bio || ""}
                onChange={(event) => setDraft({ ...draft, bio: event.target.value })}
              />
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-white/[.07] bg-white/[.02] p-3 text-sm text-ink-300">
              <input
                type="checkbox"
                checked={draft.is_active}
                onChange={(event) => setDraft({ ...draft, is_active: event.target.checked })}
              />
              حساب هنرجو فعال باشد
            </label>
            <button className="btn-primary w-full gap-2" disabled={loading}>
              <Save size={16} />
              ذخیره پروفایل
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
