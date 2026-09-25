"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { RefreshCw } from "lucide-react";
import {
  CLASS_STATUS_LABELS,
  SESSION_STATUS_LABELS,
  ATTENDANCE_STATUS_LABELS,
  WEEKDAY_LABELS,
  type AyClass,
  type AyEnrollment,
  type AySession,
  type AyAttendance,
  type ClassStatus,
  type SessionStatus,
  type AttendanceStatus,
} from "@/lib/admin/classes/types";

type Tab = "overview" | "students" | "sessions" | "schedule" | "attendance";

export default function AdminClassDetailPage() {
  const params = useParams();
  const id = String(params?.id || "");
  const [tab, setTab] = useState<Tab>("overview");
  const [cls, setCls] = useState<AyClass | null>(null);
  const [report, setReport] = useState<Record<string, number | null> | null>(null);
  const [enrollments, setEnrollments] = useState<AyEnrollment[]>([]);
  const [sessions, setSessions] = useState<AySession[]>([]);
  const [attendance, setAttendance] = useState<AyAttendance[]>([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [weekdays, setWeekdays] = useState<number[]>([1, 3]);
  const [startTime, setStartTime] = useState("18:00");
  const [duration, setDuration] = useState(60);
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");

  const loadClass = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/classes/${id}`, { credentials: "include", cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "خطا");
      setCls(json.item);
      setReport(json.report);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadEnrollments = useCallback(async () => {
    const res = await fetch(`/api/admin/classes/${id}/enrollments`, { credentials: "include", cache: "no-store" });
    const json = await res.json();
    if (res.ok) setEnrollments(json.items || []);
  }, [id]);

  const loadSessions = useCallback(async () => {
    const res = await fetch(`/api/admin/classes/${id}/sessions?limit=100`, { credentials: "include", cache: "no-store" });
    const json = await res.json();
    if (res.ok) {
      setSessions(json.items || []);
      if (!selectedSession && json.items?.[0]) setSelectedSession(json.items[0].id);
    }
  }, [id, selectedSession]);

  const loadAttendance = useCallback(async (sid: string) => {
    if (!sid) return;
    const res = await fetch(`/api/admin/classes/sessions/${sid}/attendance`, { credentials: "include", cache: "no-store" });
    const json = await res.json();
    if (res.ok) setAttendance(json.items || []);
  }, []);

  useEffect(() => {
    void loadClass();
  }, [loadClass]);

  useEffect(() => {
    if (tab === "students") void loadEnrollments();
    if (tab === "sessions" || tab === "schedule" || tab === "attendance") void loadSessions();
  }, [tab, loadEnrollments, loadSessions]);

  useEffect(() => {
    if (tab === "attendance" && selectedSession) void loadAttendance(selectedSession);
  }, [tab, selectedSession, loadAttendance]);

  if (loading && !cls) return <p className="card-ay p-5 text-sm text-ink-500">در حال بارگذاری…</p>;
  if (!cls) {
    return (
      <div className="card-ay p-8 text-center">
        <p className="text-sm text-sand-50">کلاس یافت نشد</p>
        <Link href="/admin/classes" className="mt-3 inline-block text-xs text-gold-400">بازگشت</Link>
      </div>
    );
  }

  const currentSession = sessions.find((s) => s.id === selectedSession);
  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "نمای کلی" },
    { id: "students", label: "هنرجویان" },
    { id: "sessions", label: "جلسات" },
    { id: "schedule", label: "زمان‌بندی" },
    { id: "attendance", label: "حضور و غیاب" },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <nav className="mb-2 text-[11px] text-ink-500">
            <Link href="/admin/classes" className="hover:text-gold-400">کلاس‌ها</Link>
            <span className="mx-1.5">/</span>
            <span className="text-ink-400">{cls.title}</span>
          </nav>
          <h1 className="text-xl font-semibold text-sand-50 sm:text-2xl">{cls.title}</h1>
          <p className="mt-1 text-xs text-ink-500">
            {CLASS_STATUS_LABELS[cls.status]} · {(cls.enrollment_count ?? 0).toLocaleString("fa-IR")} هنرجوی فعال
          </p>
        </div>
        <button type="button" className="btn-ghost !py-2 text-xs" onClick={() => void loadClass()}>
          <RefreshCw size={14} />
        </button>
      </header>

      {error ? (
        <p className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-300" role="alert">{error}</p>
      ) : null}

      <div className="flex flex-wrap gap-1 border-b border-white/[0.06] pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
              tab === t.id ? "bg-gold-500/15 text-gold-300" : "text-ink-400 hover:text-sand-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && report ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "جلسات کل", value: report.total_sessions },
            { label: "برگزار‌شده", value: report.completed_sessions },
            { label: "نرخ حضور", value: report.attendance_rate != null ? `${report.attendance_rate}%` : "—" },
            { label: "حضور ناقص", value: report.incomplete_sessions },
          ].map((c) => (
            <div key={c.label} className="card-ay p-4">
              <p className="text-[11px] text-ink-500">{c.label}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-sand-50">
                {typeof c.value === "number" ? c.value.toLocaleString("fa-IR") : c.value}
              </p>
            </div>
          ))}
          <div className="card-ay space-y-2 p-4 sm:col-span-2">
            <label className="text-xs text-ink-500">وضعیت کلاس</label>
            <select
              value={cls.status}
              disabled={busy}
              onChange={async (e) => {
                setBusy(true);
                try {
                  const res = await fetch(`/api/admin/classes/${id}`, {
                    method: "PATCH",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: e.target.value as ClassStatus }),
                  });
                  const json = await res.json();
                  if (!res.ok) throw new Error(json.error);
                  setCls(json.item);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "خطا");
                } finally {
                  setBusy(false);
                }
              }}
              className="min-h-10 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-sand-50"
            >
              {Object.entries(CLASS_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      {tab === "students" && (
        <div className="space-y-4">
          <div className="card-ay grid gap-3 p-4 sm:grid-cols-3">
            <input value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="نام هنرجو" className="min-h-10 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-sand-50" dir="rtl" />
            <input value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="شناسه راه‌یار" className="min-h-10 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-sand-50" />
            <button
              type="button"
              className="btn-ghost !py-2 text-xs"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  const res = await fetch(`/api/admin/classes/${id}/enrollments`, {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      student_name: studentName || null,
                      rahyar_student_id: studentId ? Number(studentId) : null,
                    }),
                  });
                  const json = await res.json();
                  if (!res.ok) throw new Error(json.error);
                  setStudentName("");
                  setStudentId("");
                  await loadEnrollments();
                  await loadClass();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "خطا");
                } finally {
                  setBusy(false);
                }
              }}
            >
              افزودن هنرجو
            </button>
          </div>
          {enrollments.map((e) => (
            <div key={e.id} className="card-ay flex items-center justify-between gap-2 p-3">
              <div>
                <p className="text-sm text-sand-50">{e.student_name || `هنرجو #${e.rahyar_student_id || "—"}`}</p>
                <p className="text-[11px] text-ink-500">{e.status}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "sessions" && (
        <div className="space-y-2">
          {sessions.map((s) => (
            <div key={s.id} className="card-ay flex flex-wrap items-center justify-between gap-2 p-3">
              <div>
                <p className="text-sm text-sand-50">{new Date(s.scheduled_start).toLocaleString("fa-IR")}</p>
                <p className="text-[11px] text-ink-500">{SESSION_STATUS_LABELS[s.status]}{s.attendance_finalized ? " · نهایی" : ""}</p>
              </div>
              <div className="flex gap-1">
                {s.status === "scheduled" ? (
                  <button type="button" className="btn-ghost !py-1.5 text-[11px]" disabled={busy} onClick={async () => {
                    setBusy(true);
                    await fetch(`/api/admin/classes/sessions/${s.id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "in_progress" as SessionStatus }) });
                    await loadSessions();
                    setBusy(false);
                  }}>شروع</button>
                ) : null}
                {s.status === "in_progress" ? (
                  <button type="button" className="btn-ghost !py-1.5 text-[11px]" disabled={busy} onClick={async () => {
                    setBusy(true);
                    await fetch(`/api/admin/classes/sessions/${s.id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "completed" as SessionStatus }) });
                    await loadSessions();
                    setBusy(false);
                  }}>اتمام</button>
                ) : null}
                <button type="button" className="btn-ghost !py-1.5 text-[11px]" onClick={() => { setSelectedSession(s.id); setTab("attendance"); }}>حضور</button>
              </div>
            </div>
          ))}
          {!sessions.length ? <p className="text-xs text-ink-500">جلسه‌ای نیست — از تب زمان‌بندی بسازید.</p> : null}
        </div>
      )}

      {tab === "schedule" && (
        <div className="card-ay space-y-4 p-5">
          <h2 className="text-sm font-medium text-sand-50">تولید جلسات تکرارشونده</h2>
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_LABELS.map((label, i) => (
              <button key={label} type="button" onClick={() => setWeekdays((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i].sort())} className={`rounded-lg px-2.5 py-1.5 text-[11px] ${weekdays.includes(i) ? "bg-gold-500/20 text-gold-300" : "bg-white/[0.04] text-ink-400"}`}>{label}</button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-ink-500">ساعت<input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1 min-h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-sand-50" /></label>
            <label className="text-xs text-ink-500">مدت (دقیقه)<input type="number" min={15} max={480} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="mt-1 min-h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-sand-50" /></label>
            <label className="text-xs text-ink-500">از<input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} className="mt-1 min-h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-sand-50" /></label>
            <label className="text-xs text-ink-500">تا<input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} className="mt-1 min-h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-sand-50" /></label>
          </div>
          <button type="button" className="btn-ghost !py-2 text-xs" disabled={busy || !rangeStart || !rangeEnd} onClick={async () => {
            setBusy(true); setError("");
            try {
              const res = await fetch(`/api/admin/classes/${id}/sessions/generate`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weekdays, start_time: startTime, duration_minutes: duration, range_start: rangeStart, range_end: rangeEnd }) });
              const json = await res.json();
              if (!res.ok) throw new Error(json.error);
              await loadSessions();
            } catch (err) { setError(err instanceof Error ? err.message : "خطا"); }
            finally { setBusy(false); }
          }}>تولید جلسات</button>
        </div>
      )}

      {tab === "attendance" && (
        <div className="space-y-4">
          <select value={selectedSession} onChange={(e) => setSelectedSession(e.target.value)} className="min-h-10 w-full max-w-md rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-sand-50">
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>{new Date(s.scheduled_start).toLocaleString("fa-IR")} — {SESSION_STATUS_LABELS[s.status]}</option>
            ))}
          </select>
          {currentSession?.attendance_finalized ? <p className="text-xs text-amber-300">حضور نهایی شده است.</p> : null}
          {attendance.map((a) => (
            <div key={a.enrollment_id} className="card-ay flex flex-wrap items-center justify-between gap-2 p-3">
              <p className="text-sm text-sand-50">{a.student_name || a.enrollment_id.slice(0, 8)}</p>
              <select
                value={a.status}
                disabled={busy || currentSession?.attendance_finalized}
                onChange={(e) => setAttendance((prev) => prev.map((x) => x.enrollment_id === a.enrollment_id ? { ...x, status: e.target.value as AttendanceStatus, source: "manual" } : x))}
                className="min-h-9 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 text-xs text-sand-50"
              >
                {Object.entries(ATTENDANCE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-ghost !py-2 text-xs" disabled={busy || currentSession?.attendance_finalized} onClick={async () => {
              if (!selectedSession) return;
              setBusy(true);
              try {
                const items = attendance.map((a) => ({ enrollment_id: a.enrollment_id, status: a.status, source: "manual" as const }));
                const res = await fetch(`/api/admin/classes/sessions/${selectedSession}/attendance`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) });
                const json = await res.json();
                if (!res.ok) throw new Error(json.error);
                await loadAttendance(selectedSession);
              } catch (err) { setError(err instanceof Error ? err.message : "خطا"); }
              finally { setBusy(false); }
            }}>ذخیره حضور</button>
            <button type="button" className="btn-ghost !py-2 text-xs" disabled={busy || !selectedSession} onClick={async () => {
              setBusy(true);
              await fetch(`/api/admin/classes/sessions/${selectedSession}/attendance`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ finalize: !currentSession?.attendance_finalized }) });
              await loadSessions();
              setBusy(false);
            }}>{currentSession?.attendance_finalized ? "بازگشایی" : "نهایی‌سازی"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
