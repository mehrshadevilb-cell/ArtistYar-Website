"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import Link from "next/link";

type Course = {
  id: number;
  title: string;
  description?: string | null;
  price: number;
  is_active: boolean;
  slug?: string | null;
};

type Section = {
  id: string;
  course_id: number;
  title: string;
  sort_order: number;
  is_active: boolean;
};

type Lesson = {
  id: string;
  course_id: number;
  section_id: string | null;
  title: string;
  description: string;
  sort_order: number;
  is_active: boolean;
  lesson_type?: string;
  access_type?: string;
  is_required?: boolean;
  content?: string;
};

async function api(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    credentials: "include",
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "درخواست ناموفق بود.");
  }
  return data;
}

export default function AdminEducationPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [newSection, setNewSection] = useState("");
  const [newLesson, setNewLesson] = useState("");
  const [selectedLesson, setSelectedLesson] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [validation, setValidation] = useState<{ ok: boolean; errors: string[] } | null>(null);
  const [busy, setBusy] = useState(false);

  const course = courses.find((item) => String(item.id) === courseId);
  const lesson = lessons.find((item) => item.id === selectedLesson);

  const refresh = async () => {
    const data = await api("/api/admin/education/courses");
    setCourses(data);
    if (!courseId && data[0]) {
      setCourseId(String(data[0].id));
    }
  };

  const load = async (id = courseId) => {
    if (!id) return;

    const [sectionData, lessonData] = await Promise.all([
      api("/api/admin/education/sections?courseId=" + id),
      api("/api/admin/education/lessons?courseId=" + id),
    ]);

    setSections(sectionData);
    setLessons(lessonData);
    setSelectedLesson((current) =>
      lessonData.some((item: Lesson) => item.id === current)
        ? current
        : lessonData[0]?.id || "",
    );
  };

  useEffect(() => {
    refresh().catch((e) => setError(e instanceof Error ? e.message : "خطا"));
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "خطا"));
  }, [courseId]);

  const addSection = async () => {
    if (!newSection.trim()) return;

    setBusy(true);
    try {
      await api("/api/admin/education/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: Number(courseId),
          title: newSection.trim(),
        }),
      });
      setNewSection("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا");
    } finally {
      setBusy(false);
    }
  };

  const addLesson = async () => {
    if (!newLesson.trim()) return;

    setBusy(true);
    try {
      await api("/api/admin/education/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: Number(courseId),
          title: newLesson.trim(),
          sortOrder: lessons.length,
        }),
      });
      setNewLesson("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا");
    } finally {
      setBusy(false);
    }
  };

  const saveLesson = async () => {
    if (!lesson) return;

    setBusy(true);
    try {
      await api("/api/admin/education/lessons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          sortOrder: lesson.sort_order,
          isActive: lesson.is_active,
          sectionId: lesson.section_id,
          isRequired: lesson.is_required !== false,
        }),
      });
      setMessage("ذخیره شد.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا");
    } finally {
      setBusy(false);
    }
  };

  const validate = async () => {
    setBusy(true);
    try {
      setValidation(
        await api("/api/admin/education/validate?courseId=" + courseId),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا");
    } finally {
      setBusy(false);
    }
  };

  const move = async (id: string, delta: number) => {
    const index = lessons.findIndex((item) => item.id === id);
    const nextIndex = index + delta;

    if (
      index < 0 ||
      nextIndex < 0 ||
      nextIndex >= lessons.length
    ) {
      return;
    }

    const current = lessons[index];
    const next = lessons[nextIndex];

    setBusy(true);
    try {
      await Promise.all([
        api("/api/admin/education/lessons", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: current.id,
            title: current.title,
            description: current.description,
            sortOrder: next.sort_order,
            isActive: current.is_active,
          }),
        }),
        api("/api/admin/education/lessons", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: next.id,
            title: next.title,
            description: next.description,
            sortOrder: current.sort_order,
            isActive: next.is_active,
          }),
        }),
      ]);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">/ آموزش</p>
          <h1 className="mt-2 text-2xl font-semibold text-sand-50">
            مدیریت آموزش
          </h1>
          <p className="mt-2 text-sm text-ink-400">
            یک معماری واحد روی دوره‌های canonical راه‌یار؛ درس و رسانه از رکوردهای موجود استفاده می‌کنند.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            className="btn-ghost !px-3"
            onClick={() => {
              refresh().catch((e) =>
                setError(e instanceof Error ? e.message : "خطا"),
              );
              load().catch((e) =>
                setError(e instanceof Error ? e.message : "خطا"),
              );
            }}
          >
            <RefreshCw size={15} />
            به‌روزرسانی
          </button>

          {courseId && (
            <button
              className="btn-primary !px-3"
              onClick={() => void validate()}
              disabled={busy}
            >
              <ShieldCheck size={15} />
              اعتبارسنجی
            </button>
          )}
        </div>
      </header>

      {error && (
        <p
          className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-300"
          role="alert"
        >
          {error}
        </p>
      )}

      {message && (
        <p
          className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs text-emerald-300"
          role="status"
        >
          {message}
        </p>
      )}

      <section className="card-ay space-y-4 p-5">
        <label className="block text-xs text-ink-400">
          دوره canonical
          <select
            className="input-ay mt-2"
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
          >
            <option value="">انتخاب دوره</option>
            {courses.map((item) => (
              <option key={item.id} value={item.id}>
                {item.id} · {item.title}
              </option>
            ))}
          </select>
        </label>

        {course && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs text-ink-500">قیمت</p>
              <b className="text-sand-50">
                {Number(course.price || 0).toLocaleString("fa-IR")}
              </b>
            </div>
            <div>
              <p className="text-xs text-ink-500">وضعیت</p>
              <b className="text-sand-50">
                {course.is_active ? "فعال" : "غیرفعال"}
              </b>
            </div>
            <div>
              <Link
                href={
                  "/courses/" +
                  encodeURIComponent(course.slug || String(course.id))
                }
                className="text-xs text-gold-300"
              >
                مشاهده صفحه دوره
              </Link>
            </div>
          </div>
        )}
      </section>

      {courseId && (
        <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
          <section className="card-ay p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm text-sand-50">ساختار دوره</h2>
              <span className="text-[11px] text-ink-500">
                {sections.length} بخش · {lessons.length} درس
              </span>
            </div>

            <div className="mt-4 flex gap-2">
              <input
                className="input-ay"
                value={newSection}
                onChange={(event) => setNewSection(event.target.value)}
                placeholder="نام بخش جدید"
              />
              <button
                className="btn-ghost !px-3"
                disabled={busy}
                onClick={() => void addSection()}
                aria-label="افزودن بخش"
              >
                <Plus size={15} />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {sections.map((section) => (
                <div
                  key={section.id}
                  className="rounded-xl border border-white/10 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      className="min-w-0 flex-1 bg-transparent text-sm text-sand-100 outline-none"
                      value={section.title}
                      onChange={(event) =>
                        setSections((items) =>
                          items.map((item) =>
                            item.id === section.id
                              ? { ...item, title: event.target.value }
                              : item,
                          ),
                        )
                      }
                      onBlur={() =>
                        void api("/api/admin/education/sections", {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            id: section.id,
                            title: section.title,
                            sortOrder: section.sort_order,
                            isActive: section.is_active,
                          }),
                        })
                      }
                    />
                    <button
                      type="button"
                      className="text-red-300"
                      onClick={() =>
                        void api(
                          "/api/admin/education/sections?id=" + section.id,
                          { method: "DELETE" },
                        )
                          .then(() => load())
                          .catch((e) =>
                            setError(
                              e instanceof Error ? e.message : "خطا",
                            ),
                          )
                      }
                      aria-label="حذف بخش"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex gap-2">
              <input
                className="input-ay"
                value={newLesson}
                onChange={(event) => setNewLesson(event.target.value)}
                placeholder="عنوان درس جدید"
              />
              <button
                className="btn-primary !px-3"
                disabled={busy}
                onClick={() => void addLesson()}
                aria-label="افزودن درس"
              >
                <Plus size={15} />
              </button>
            </div>

            <div className="mt-3 space-y-1">
              {lessons.map((item, index) => (
                <div
                  key={item.id}
                  className={
                    "flex w-full items-center justify-between rounded-lg p-2 text-right text-xs " +
                    (item.id === selectedLesson
                      ? "bg-gold-500/15 text-gold-300"
                      : "text-ink-300 hover:bg-white/5")
                  }
                >
                  <button
                    type="button"
                    onClick={() => setSelectedLesson(item.id)}
                    className="min-w-0 flex-1 text-right"
                  >
                    {index + 1}. {item.title}
                  </button>

                  <span className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => void move(item.id, -1)}
                      disabled={busy || index === 0}
                      aria-label="جابجایی به بالا"
                    >
                      <ChevronUp size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void move(item.id, 1)}
                      disabled={busy || index === lessons.length - 1}
                      aria-label="جابجایی به پایین"
                    >
                      <ChevronDown size={13} />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="card-ay p-5">
            {lesson ? (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm text-sand-50">ویرایش درس</h2>
                  <span className="text-[10px] text-ink-500">
                    {lesson.is_active ? "فعال" : "آرشیو"}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  <input
                    className="input-ay"
                    value={lesson.title}
                    onChange={(event) =>
                      setLessons((items) =>
                        items.map((item) =>
                          item.id === lesson.id
                            ? { ...item, title: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />

                  <textarea
                    className="input-ay min-h-32"
                    value={lesson.description}
                    onChange={(event) =>
                      setLessons((items) =>
                        items.map((item) =>
                          item.id === lesson.id
                            ? { ...item, description: event.target.value }
                            : item,
                        ),
                      )
                    }
                    placeholder="توضیح درس"
                  />

                  <div className="flex flex-wrap gap-2">
                    <select
                      className="input-ay max-w-xs"
                      value={lesson.section_id || ""}
                      onChange={(event) =>
                        setLessons((items) =>
                          items.map((item) =>
                            item.id === lesson.id
                              ? {
                                  ...item,
                                  section_id: event.target.value || null,
                                }
                              : item,
                          ),
                        )
                      }
                    >
                      <option value="">بدون بخش</option>
                      {sections.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.title}
                        </option>
                      ))}
                    </select>

                    <label className="flex items-center gap-2 text-xs text-ink-400">
                      <input
                        type="checkbox"
                        checked={lesson.is_required !== false}
                        onChange={(event) =>
                          setLessons((items) =>
                            items.map((item) =>
                              item.id === lesson.id
                                ? {
                                    ...item,
                                    is_required: event.target.checked,
                                  }
                                : item,
                            ),
                          )
                        }
                      />
                      درس الزامی
                    </label>
                  </div>

                  <button
                    className="btn-primary"
                    disabled={busy}
                    onClick={() => void saveLesson()}
                  >
                    <Save size={15} />
                    ذخیره درس
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-ink-500">
                یک درس را انتخاب کنید.
              </p>
            )}

            {validation && (
              <div
                className={
                  "mt-5 rounded-xl border p-4 " +
                  (validation.ok
                    ? "border-emerald-400/20 bg-emerald-400/10"
                    : "border-amber-400/20 bg-amber-400/10")
                }
              >
                <div className="flex items-center gap-2 text-sm text-sand-50">
                  <CheckCircle2 size={16} />
                  {validation.ok ? "ساختار آماده است" : "نیازمند اصلاح"}
                </div>
                <ul className="mt-3 space-y-1 text-xs text-ink-300">
                  {validation.errors.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      )}

      {courseId && (
        <div className="flex justify-end">
          <Link href={"/panel/courses/" + courseId} className="btn-ghost">
            پیش‌نمایش به‌عنوان هنرجو
          </Link>
        </div>
      )}
    </div>
  );
}
