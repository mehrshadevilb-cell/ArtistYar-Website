"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, CalendarDays, CheckCircle2, ExternalLink, RefreshCw, Search, Users } from "lucide-react";

type Student = {
  id: number | string;
  full_name: string;
  phone: string | null;
  email: string | null;
  level: string | null;
  is_active: boolean;
};

type LegacyEnrollment = {
  id: number;
  course_name: string;
  status: string;
  payment_model: string;
  remaining_sessions: number;
  completed_sessions: number;
  created_at: string;
};

type LearningClass = {
  enrollment: {
    id: string;
    class_id: string;
    status: string;
    enrolled_at: string;
    ended_at: string | null;
    notes: string | null;
  };
  class: {
    id: string;
    title: string;
    status: string;
    delivery_mode: string;
    meeting_url: string | null;
    start_date: string | null;
    end_date: string | null;
  } | null;
  sessions: Array<{
    id: string;
    scheduled_start: string;
    scheduled_end: string;
    status: string;
    meeting_url: string | null;
    attendance_finalized: boolean;
    attendance: { status?: string } | null;
  }>;
  attendance: {
    present: number;
    late: number;
    absent: number;
    excused: number;
    marked: number;
  };
};

type Learning = {
  classes: LearningClass[];
  summary: {
    classes: number;
    active_classes: number;
    sessions: number;
    completed_sessions: number;
    attendance_marked: number;
    present: number;
    late: number;
    absent: number;
  };
};

const statusLabel: Record<string, string> = {
  active: "فعال",
  paused: "متوقف",
  completed: "تمام‌شده",
  cancelled: "لغوشده",
  archived: "بایگانی",
  draft: "پیش‌نویس",
  scheduled: "زمان‌بندی‌شده",
  open: "باز",
  in_progress: "در حال برگزاری",
  rescheduled: "جابه‌جاشده",
};

const attendanceLabel: Record<string, string> = {
  present: "حاضر",
  late: "تأخیر",
  absent: "غایب",
  excused: "موجه",
  unknown: "ثبت نشده",
};

export default function AdminUsersPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Student | null>(null);
  const [legacy, setLegacy] = useState<LegacyEnrollment[]>([]);
  const [learning, setLearning] = useState<Learning | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadStudents(query = "") {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "500" });
      if (query.trim()) params.set("q", query.trim());
      const response = await fetch(`/api/rahyar/admin/students?${params}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || "دریافت هنرجوها ناموفق بود.");
      const items = Array.isArray(data) ? data : data.items || [];
      setStudents(items);
      if (!selected && items[0]) setSelected(items[0]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "دریافت هنرجوها ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }

  async function loadStudent(student: Student) {
    if (typeof student.id !== "number") return;
    setSelected(student);
    setDetailLoading(true);
    setError("");
    try {
      const [legacyResponse, learningResponse] = await Promise.all([
        fetch(`/api/rahyar/admin/students/${student.id}/enrollments`, { credentials: "include", cache: "no-store" }),
        fetch(`/api/admin/students/${student.id}/learning`, { credentials: "include", cache: "no-store" }),
      ]);
      const legacyData = await legacyResponse.json();
      const learningData = await learningResponse.json();
      if (!legacyResponse.ok) throw new Error(legacyData.message || legacyData.error || "سوابق دوره‌ها دریافت نشد.");
      if (!learningResponse.ok) throw new Error(learningData.message || learningData.error || "اطلاعات کلاس‌ها دریافت نشد.");
      setLegacy(Array.isArray(legacyData) ? legacyData : []);
      setLearning(learningData);
    } catch (cause) {
      setLegacy([]);
      setLearning(null);
      setError(cause instanceof Error ? cause.message : "اطلاعات هنرجو دریافت نشد.");
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    void loadStudents();
  }, []);

  useEffect(() => {
    if (selected) void loadStudent(selected);
  }, [selected?.id]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return students;
    return students.filter((student) =>
      [student.full_name, student.phone, student.email, student.level].some((value) =>
        String(value || "").toLowerCase().includes(needle),
      ),
    );
  }, [q, students]);

  return (
    <div className="space-y-6" dir="rtl">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">/ کاربران</p>
          <h1 className="mt-2 text-2xl font-semibold text-sand-50">کاربران و آموزش</h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-ink-400">
            از یک صفحه می‌بینی هر هنرجو چه دوره‌هایی دارد، در چه کلاس‌هایی است، چند جلسه برایش ثبت شده و وضعیت حضورش چیست.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/classes" className="btn-ghost !px-3 text-xs">
            مدیریت کلاس‌ها
          </Link>
          <Link href="/admin/classes/calendar" className="btn-ghost !px-3 text-xs">
            <CalendarDays size={14} /> تقویم
          </Link>
          <button className="btn-ghost !px-3 text-xs" onClick={() => void loadStudents(q)} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> تازه‌سازی
          </button>
        </div>
      </header>

      {error ? <p className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-300" role="alert">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="card-ay overflow-hidden">
          <div className="border-b border-white/[.07] p-4">
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-500" />
              <input className="input-ay ps-9" value={q} onChange={(event) => setQ(event.target.value)} placeholder="جستجوی هنرجو…" />
            </div>
            <p className="mt-3 text-[11px] text-ink-500">{filtered.length.toLocaleString("fa-IR")} هنرجو</p>
          </div>
          <div className="max-h-[70vh] overflow-y-auto p-2">
            {filtered.map((student) => (
              <button
                key={String(student.id)}
                type="button"
                onClick={() => void loadStudent(student)}
                className={`mb-1 w-full rounded-xl p-3 text-right transition ${selected?.id === student.id ? "bg-gold-400/10 ring-1 ring-gold-400/20" : "hover:bg-white/[.03]"}`}
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[.06] text-gold-300">
                    <Users size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-sand-100">{student.full_name}</p>
                    <p className="mt-1 truncate text-[11px] text-ink-500">{student.phone || student.email || "اطلاعات تماس ثبت نشده"}</p>
                  </div>
                </div>
              </button>
            ))}
            {!filtered.length && !loading ? <p className="p-6 text-center text-xs text-ink-500">هنرجویی پیدا نشد.</p> : null}
          </div>
        </aside>

        <main className="min-w-0 space-y-4">
          {!selected ? (
            <div className="card-ay grid min-h-80 place-items-center p-8 text-center">
              <div><Users className="mx-auto text-gold-400" size={28} /><p className="mt-3 text-sm text-sand-100">یک هنرجو را انتخاب کن.</p></div>
            </div>
          ) : (
            <>
              <section className="card-ay p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-ink-500">پروفایل هنرجو</p>
                    <h2 className="mt-1 text-xl font-semibold text-sand-50">{selected.full_name}</h2>
                    <p className="mt-2 text-xs text-ink-400">{selected.phone || "—"} · {selected.email || "—"} · {selected.level || "سطح ثبت نشده"}</p>
                  </div>
                  <div className="flex gap-2">
                    <Link href="/admin/students" className="btn-ghost !px-3 text-xs">ویرایش پروفایل</Link>
                    {typeof selected.id === "number" ? <Link href={`/admin/students?student=${selected.id}`} className="btn-ghost !px-3 text-xs">جزئیات کامل</Link> : null}
                  </div>
                </div>
              </section>

              {detailLoading ? <div className="card-ay p-6 text-sm text-ink-500">در حال اتصال دوره‌ها، کلاس‌ها، جلسات و حضور و غیاب…</div> : null}

              {learning ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  {([
                    { label: "دوره‌ها / ثبت‌نام‌های کلاس", value: legacy.length + learning.summary.classes, Icon: BookOpen },
                    { label: "کلاس فعال", value: learning.summary.active_classes, Icon: Users },
                    { label: "کل جلسات", value: learning.summary.sessions, Icon: CalendarDays },
                    { label: "جلسه برگزارشده", value: learning.summary.completed_sessions, Icon: CheckCircle2 },
                    { label: "حضور ثبت‌شده", value: learning.summary.attendance_marked, Icon: CheckCircle2 },
                  ] as const).map(({ label, value, Icon }) => (
                    <div key={label} className="card-ay p-4">
                      <Icon size={16} className="text-gold-400" />
                      <strong className="mt-3 block text-xl text-sand-50">{Number(value).toLocaleString("fa-IR")}</strong>
                      <p className="mt-1 text-[11px] text-ink-500">{label}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              <section className="card-ay p-5">
                <div className="flex items-center justify-between gap-3">
                  <div><h3 className="text-base font-medium text-sand-50">دوره‌های هنرجو</h3><p className="mt-1 text-xs text-ink-500">ثبت‌نام‌های راه‌یار</p></div>
                  <BookOpen size={18} className="text-gold-400" />
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {legacy.map((item) => (
                    <article key={item.id} className="rounded-xl border border-white/[.07] bg-white/[.02] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="font-medium text-sand-100">{item.course_name}</h4>
                        <span className="rounded-full bg-gold-400/10 px-2 py-1 text-[10px] text-gold-300">{statusLabel[item.status] || item.status}</span>
                      </div>
                      <p className="mt-3 text-xs text-ink-400">مدل: {item.payment_model} · ثبت‌نام: {new Date(item.created_at).toLocaleDateString("fa-IR")}</p>
                      <div className="mt-3 flex gap-4 text-xs text-ink-400">
                        <span>باقی‌مانده: <b className="text-sand-100">{item.remaining_sessions}</b></span>
                        <span>تکمیل‌شده: <b className="text-sand-100">{item.completed_sessions}</b></span>
                      </div>
                    </article>
                  ))}
                  {!legacy.length ? <p className="text-xs text-ink-500">دوره‌ای از راه‌یار برای این هنرجو ثبت نشده.</p> : null}
                </div>
              </section>

              <section className="card-ay p-5">
                <div className="flex items-center justify-between gap-3">
                  <div><h3 className="text-base font-medium text-sand-50">کلاس‌های آنلاین و جلسات</h3><p className="mt-1 text-xs text-ink-500">ارتباط مستقیم هنرجو ← کلاس ← جلسه ← حضور</p></div>
                  <Users size={18} className="text-gold-400" />
                </div>
                <div className="mt-4 space-y-4">
                  {learning?.classes.map((item) => (
                    <article key={item.enrollment.id} className="rounded-2xl border border-white/[.07] bg-white/[.02] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-medium text-sand-50">{item.class?.title || "کلاس حذف‌شده / نامشخص"}</h4>
                            <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] text-emerald-300">{statusLabel[item.enrollment.status] || item.enrollment.status}</span>
                          </div>
                          <p className="mt-2 text-xs text-ink-500">
                            {item.class?.delivery_mode === "online" ? "آنلاین" : item.class?.delivery_mode || "نوع نامشخص"} · {item.sessions.length.toLocaleString("fa-IR")} جلسه
                          </p>
                        </div>
                        {item.class?.id ? <Link href={`/admin/classes/${item.class.id}`} className="btn-ghost !px-3 text-xs"><ExternalLink size={13} /> مدیریت کلاس</Link> : null}
                      </div>

                      <div className="mt-4 grid gap-2 sm:grid-cols-4">
                        <div className="rounded-xl bg-white/[.03] p-3 text-xs"><span className="text-ink-500">حاضر</span><b className="ms-2 text-emerald-300">{item.attendance.present}</b></div>
                        <div className="rounded-xl bg-white/[.03] p-3 text-xs"><span className="text-ink-500">تأخیر</span><b className="ms-2 text-gold-300">{item.attendance.late}</b></div>
                        <div className="rounded-xl bg-white/[.03] p-3 text-xs"><span className="text-ink-500">غیبت</span><b className="ms-2 text-red-300">{item.attendance.absent}</b></div>
                        <div className="rounded-xl bg-white/[.03] p-3 text-xs"><span className="text-ink-500">موجه</span><b className="ms-2 text-sand-100">{item.attendance.excused}</b></div>
                      </div>

                      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                        {item.sessions.map((session) => (
                          <div key={session.id} className="rounded-xl border border-white/[.06] p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-xs text-sand-100">{new Date(session.scheduled_start).toLocaleDateString("fa-IR")}</p>
                                <p className="mt-1 text-[11px] text-gold-300" dir="ltr">{new Date(session.scheduled_start).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}</p>
                              </div>
                              <span className="text-[10px] text-ink-500">{statusLabel[session.status] || session.status}</span>
                            </div>
                            <p className="mt-2 text-[11px] text-ink-500">حضور: {attendanceLabel[session.attendance?.status || "unknown"]}</p>
                            {session.meeting_url ? <a className="mt-2 inline-block text-[11px] text-gold-300 hover:underline" href={session.meeting_url} target="_blank" rel="noreferrer">لینک جلسه</a> : null}
                          </div>
                        ))}
                        {!item.sessions.length ? <p className="text-xs text-ink-500">برای این کلاس هنوز جلسه‌ای ساخته نشده.</p> : null}
                      </div>
                    </article>
                  ))}
                  {!learning?.classes.length ? <p className="text-xs text-ink-500">این هنرجو هنوز به کلاس canonical متصل نشده.</p> : null}
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
