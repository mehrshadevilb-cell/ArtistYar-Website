/**
 * Class / Session / Enrollment / Attendance service (Phase 2).
 */
import { getServiceSupabase } from "@/lib/admin/supabase-admin";
import { writeAuditLog } from "@/lib/admin/audit";
import type {
  AyClass,
  AyEnrollment,
  AySession,
  AyAttendance,
  ClassStatus,
  SessionStatus,
  AttendanceStatus,
  AttendanceSource,
  EnrollmentStatus,
} from "./types";

function db() {
  const sb = getServiceSupabase();
  if (!sb) throw new Error("supabase_not_configured");
  return sb;
}
const now = () => new Date().toISOString();

export async function listClasses(
  opts: { q?: string; status?: ClassStatus | "all"; limit?: number; offset?: number } = {},
) {
  const sb = db();
  const limit = Math.min(100, Math.max(1, opts.limit ?? 30));
  const offset = Math.max(0, opts.offset ?? 0);
  let q = sb.from("ay_classes").select("*", { count: "exact" }).order("updated_at", { ascending: false });
  if (opts.status && opts.status !== "all") q = q.eq("status", opts.status);
  if (opts.q?.trim()) q = q.ilike("title", `%${opts.q.trim().slice(0, 80)}%`);
  const { data, error, count } = await q.range(offset, offset + limit - 1);
  if (error) throw new Error(error.message);
  const items = (data || []) as AyClass[];
  for (const c of items) {
    const [{ count: ec }, { data: next }] = await Promise.all([
      sb
        .from("ay_class_enrollments")
        .select("id", { count: "exact", head: true })
        .eq("class_id", c.id)
        .eq("status", "active"),
      sb
        .from("ay_class_sessions")
        .select("id, scheduled_start, status")
        .eq("class_id", c.id)
        .neq("status", "cancelled")
        .gte("scheduled_start", now())
        .order("scheduled_start")
        .limit(1)
        .maybeSingle(),
    ]);
    c.enrollment_count = ec ?? 0;
    c.upcoming_session = next
      ? { id: next.id, scheduled_start: next.scheduled_start, status: next.status as SessionStatus }
      : null;
  }
  return { items, total: count ?? items.length };
}

export async function getClass(id: string): Promise<AyClass | null> {
  const sb = db();
  const { data, error } = await sb.from("ay_classes").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const c = data as AyClass;
  const { count } = await sb
    .from("ay_class_enrollments")
    .select("id", { count: "exact", head: true })
    .eq("class_id", id)
    .eq("status", "active");
  c.enrollment_count = count ?? 0;
  return c;
}

export async function createClass(
  input: {
    title: string;
    description?: string | null;
    status?: ClassStatus;
    capacity?: number | null;
    timezone?: string;
    meeting_url?: string | null;
    location?: string | null;
    class_type?: string;
    delivery_mode?: string;
  },
  actor: string,
) {
  const sb = db();
  const title = (input.title || "").trim().slice(0, 200);
  if (!title) throw new Error("title_required");
  const { data, error } = await sb
    .from("ay_classes")
    .insert({
      title,
      description: input.description?.trim().slice(0, 4000) || null,
      status: input.status || "draft",
      class_type: input.class_type || "group",
      delivery_mode: input.delivery_mode || "online",
      capacity: input.capacity ?? null,
      timezone: input.timezone || "Asia/Tehran",
      location: input.location?.trim().slice(0, 300) || null,
      meeting_url: input.meeting_url?.trim().slice(0, 500) || null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  await writeAuditLog({
    actor,
    action: "system.action",
    resource_type: "ay_class",
    resource_id: data.id,
    after: { title: data.title, status: data.status },
    metadata: { op: "class.create" },
  });
  return data as AyClass;
}

export async function updateClass(id: string, input: Record<string, unknown>, actor: string) {
  const before = await getClass(id);
  if (!before) throw new Error("class_not_found");
  const patch: Record<string, unknown> = { updated_at: now() };
  for (const k of [
    "title",
    "description",
    "status",
    "class_type",
    "delivery_mode",
    "capacity",
    "start_date",
    "end_date",
    "timezone",
    "location",
    "meeting_url",
    "rahyar_class_id",
    "course_id",
  ]) {
    if (input[k] !== undefined) patch[k] = input[k];
  }
  if (typeof patch.title === "string") {
    patch.title = (patch.title as string).trim().slice(0, 200);
    if (!patch.title) throw new Error("title_required");
  }
  const { data, error } = await db().from("ay_classes").update(patch).eq("id", id).select("*").single();
  if (error) throw new Error(error.message);
  await writeAuditLog({
    actor,
    action: "system.action",
    resource_type: "ay_class",
    resource_id: id,
    before: { status: before.status, title: before.title },
    after: { status: data.status, title: data.title },
    metadata: { op: "class.update" },
  });
  return data as AyClass;
}

export async function listEnrollments(classId: string) {
  const { data, error } = await db()
    .from("ay_class_enrollments")
    .select("*")
    .eq("class_id", classId)
    .order("enrolled_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as AyEnrollment[];
}

export async function enrollStudent(
  classId: string,
  input: {
    rahyar_student_id?: number | null;
    student_name?: string | null;
    student_phone?: string | null;
    notes?: string | null;
  },
  actor: string,
) {
  const sb = db();
  const cls = await getClass(classId);
  if (!cls) throw new Error("class_not_found");
  if (cls.status === "cancelled" || cls.status === "archived") throw new Error("class_unavailable");
  if (cls.capacity != null) {
    const { count } = await sb
      .from("ay_class_enrollments")
      .select("id", { count: "exact", head: true })
      .eq("class_id", classId)
      .eq("status", "active");
    if ((count ?? 0) >= cls.capacity) throw new Error("class_full");
  }
  if (input.rahyar_student_id != null) {
    const { data: ex } = await sb
      .from("ay_class_enrollments")
      .select("id")
      .eq("class_id", classId)
      .eq("rahyar_student_id", input.rahyar_student_id)
      .eq("status", "active")
      .maybeSingle();
    if (ex) throw new Error("duplicate_enrollment");
  }
  const { data, error } = await sb
    .from("ay_class_enrollments")
    .insert({
      class_id: classId,
      rahyar_student_id: input.rahyar_student_id ?? null,
      student_name: input.student_name?.trim().slice(0, 120) || null,
      student_phone: input.student_phone?.trim().slice(0, 30) || null,
      notes: input.notes?.trim().slice(0, 1000) || null,
      status: "active",
    })
    .select("*")
    .single();
  if (error) {
    if (/unique|duplicate/i.test(error.message)) throw new Error("duplicate_enrollment");
    throw new Error(error.message);
  }
  await writeAuditLog({
    actor,
    action: "user.update",
    resource_type: "ay_class_enrollment",
    resource_id: data.id,
    after: { class_id: classId, status: data.status },
    metadata: { op: "enrollment.create" },
  });
  return data as AyEnrollment;
}

export async function updateEnrollmentStatus(
  enrollmentId: string,
  status: EnrollmentStatus,
  actor: string,
) {
  const sb = db();
  const { data: before } = await sb
    .from("ay_class_enrollments")
    .select("*")
    .eq("id", enrollmentId)
    .maybeSingle();
  if (!before) throw new Error("enrollment_not_found");
  const patch: Record<string, unknown> = { status, updated_at: now() };
  if (status !== "active") patch.ended_at = now();
  const { data, error } = await sb
    .from("ay_class_enrollments")
    .update(patch)
    .eq("id", enrollmentId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  await writeAuditLog({
    actor,
    action: "user.update",
    resource_type: "ay_class_enrollment",
    resource_id: enrollmentId,
    before: { status: before.status },
    after: { status: data.status },
    metadata: { op: "enrollment.status" },
  });
  return data as AyEnrollment;
}

function validateTimes(start: string, end: string) {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (!Number.isFinite(s) || !Number.isFinite(e)) throw new Error("invalid_session_time");
  if (e <= s) throw new Error("end_before_start");
}

export async function listSessions(
  classId: string,
  opts: { from?: string; to?: string; status?: SessionStatus; limit?: number } = {},
) {
  const limit = Math.min(200, Math.max(1, opts.limit ?? 50));
  let q = db()
    .from("ay_class_sessions")
    .select("*")
    .eq("class_id", classId)
    .order("scheduled_start")
    .limit(limit);
  if (opts.from) q = q.gte("scheduled_start", opts.from);
  if (opts.to) q = q.lte("scheduled_start", opts.to);
  if (opts.status) q = q.eq("status", opts.status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data || []) as AySession[];
}

export async function getSession(sessionId: string) {
  const { data, error } = await db()
    .from("ay_class_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as AySession) || null;
}

export async function createSession(
  classId: string,
  input: {
    scheduled_start: string;
    scheduled_end: string;
    timezone?: string;
    status?: SessionStatus;
    location?: string | null;
    meeting_url?: string | null;
    notes?: string | null;
  },
  actor: string,
) {
  const sb = db();
  const cls = await getClass(classId);
  if (!cls) throw new Error("class_not_found");
  if (cls.status === "cancelled" || cls.status === "archived") throw new Error("class_unavailable");
  validateTimes(input.scheduled_start, input.scheduled_end);
  const { data: overlaps } = await sb
    .from("ay_class_sessions")
    .select("id")
    .eq("class_id", classId)
    .neq("status", "cancelled")
    .lt("scheduled_start", input.scheduled_end)
    .gt("scheduled_end", input.scheduled_start)
    .limit(1);
  if (overlaps?.length) throw new Error("session_overlap");
  const { data, error } = await sb
    .from("ay_class_sessions")
    .insert({
      class_id: classId,
      scheduled_start: input.scheduled_start,
      scheduled_end: input.scheduled_end,
      timezone: input.timezone || cls.timezone || "Asia/Tehran",
      status: input.status || "scheduled",
      location: input.location ?? cls.location,
      meeting_url: input.meeting_url ?? cls.meeting_url,
      notes: input.notes?.trim().slice(0, 2000) || null,
    })
    .select("*")
    .single();
  if (error) {
    if (/unique|duplicate/i.test(error.message)) throw new Error("duplicate_session");
    throw new Error(error.message);
  }
  await writeAuditLog({
    actor,
    action: "system.action",
    resource_type: "ay_class_session",
    resource_id: data.id,
    after: { class_id: classId, scheduled_start: data.scheduled_start, status: data.status },
    metadata: { op: "session.create" },
  });
  return data as AySession;
}

const TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  scheduled: ["open", "in_progress", "cancelled", "rescheduled", "completed"],
  open: ["in_progress", "cancelled", "completed", "scheduled"],
  in_progress: ["completed", "cancelled"],
  completed: ["in_progress"],
  cancelled: ["scheduled"],
  rescheduled: ["scheduled", "cancelled"],
};

export async function updateSession(sessionId: string, input: Record<string, unknown>, actor: string) {
  const before = await getSession(sessionId);
  if (!before) throw new Error("session_not_found");
  const patch: Record<string, unknown> = { updated_at: now() };
  if (input.status !== undefined && input.status !== before.status) {
    const st = input.status as SessionStatus;
    if (!(TRANSITIONS[before.status] || []).includes(st)) throw new Error("invalid_session_transition");
    patch.status = st;
    if (st === "in_progress" && !before.actual_start) patch.actual_start = now();
    if (st === "completed") {
      patch.actual_end = now();
      if (!before.actual_start) patch.actual_start = before.scheduled_start;
    }
  }
  if (input.scheduled_start !== undefined || input.scheduled_end !== undefined) {
    const start = (input.scheduled_start as string) || before.scheduled_start;
    const end = (input.scheduled_end as string) || before.scheduled_end;
    validateTimes(start, end);
    patch.scheduled_start = start;
    patch.scheduled_end = end;
    if (input.scheduled_start && input.scheduled_start !== before.scheduled_start) patch.status = "rescheduled";
  }
  for (const k of ["timezone", "location", "meeting_url", "notes", "attendance_finalized"]) {
    if (input[k] !== undefined) patch[k] = input[k];
  }
  const { data, error } = await db()
    .from("ay_class_sessions")
    .update(patch)
    .eq("id", sessionId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  await writeAuditLog({
    actor,
    action: "system.action",
    resource_type: "ay_class_session",
    resource_id: sessionId,
    before: {
      status: before.status,
      scheduled_start: before.scheduled_start,
      attendance_finalized: before.attendance_finalized,
    },
    after: {
      status: data.status,
      scheduled_start: data.scheduled_start,
      attendance_finalized: data.attendance_finalized,
    },
    metadata: { op: "session.update" },
  });
  return data as AySession;
}

export async function generateSessions(
  classId: string,
  input: {
    weekdays: number[];
    start_time: string;
    duration_minutes: number;
    range_start: string;
    range_end: string;
    timezone?: string;
    max_sessions?: number;
  },
  actor: string,
) {
  const cls = await getClass(classId);
  if (!cls) throw new Error("class_not_found");
  if (!input.weekdays?.length) throw new Error("weekdays_required");
  if (input.duration_minutes < 15 || input.duration_minutes > 480) throw new Error("invalid_duration");
  const rangeStart = new Date(`${input.range_start}T00:00:00`);
  const rangeEnd = new Date(`${input.range_end}T23:59:59`);
  if (!Number.isFinite(rangeStart.getTime()) || !Number.isFinite(rangeEnd.getTime()) || rangeEnd < rangeStart) {
    throw new Error("invalid_date_range");
  }
  const [hh, mm] = input.start_time.split(":").map(Number);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) throw new Error("invalid_start_time");
  const max = Math.min(120, input.max_sessions ?? 60);
  const weekdaySet = new Set(input.weekdays);
  const created: AySession[] = [];
  let skipped = 0;
  const cursor = new Date(rangeStart);
  while (cursor <= rangeEnd && created.length < max) {
    if (weekdaySet.has(cursor.getDay())) {
      const start = new Date(cursor);
      start.setHours(hh, mm, 0, 0);
      const end = new Date(start.getTime() + input.duration_minutes * 60_000);
      try {
        created.push(
          await createSession(
            classId,
            {
              scheduled_start: start.toISOString(),
              scheduled_end: end.toISOString(),
              timezone: input.timezone || cls.timezone,
            },
            actor,
          ),
        );
      } catch (e) {
        const m = e instanceof Error ? e.message : "";
        if (m === "session_overlap" || m === "duplicate_session") skipped++;
        else throw e;
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  await writeAuditLog({
    actor,
    action: "system.action",
    resource_type: "ay_class",
    resource_id: classId,
    metadata: { op: "session.generate", created: created.length, skipped },
  });
  return { created: created.length, skipped, sessions: created };
}

export async function listCalendarSessions(opts: {
  from: string;
  to: string;
  classId?: string;
  limit?: number;
}) {
  const limit = Math.min(500, Math.max(1, opts.limit ?? 200));
  let q = db()
    .from("ay_class_sessions")
    .select("*, ay_classes(title)")
    .gte("scheduled_start", opts.from)
    .lte("scheduled_start", opts.to)
    .order("scheduled_start")
    .limit(limit);
  if (opts.classId) q = q.eq("class_id", opts.classId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data || []).map((row: Record<string, unknown>) => {
    const cls = row.ay_classes as { title?: string } | null;
    const { ay_classes: _, ...rest } = row;
    return { ...rest, class_title: cls?.title } as AySession;
  });
}

export async function listSessionAttendance(sessionId: string) {
  const session = await getSession(sessionId);
  if (!session) throw new Error("session_not_found");
  const enrollments = (await listEnrollments(session.class_id)).filter((e) => e.status === "active");
  const { data: existing, error } = await db()
    .from("ay_session_attendance")
    .select("*")
    .eq("session_id", sessionId);
  if (error) throw new Error(error.message);
  const byE = new Map((existing || []).map((a) => [a.enrollment_id, a as AyAttendance]));
  return enrollments.map((e) => {
    const row = byE.get(e.id);
    if (row) return { ...row, student_name: e.student_name, rahyar_student_id: e.rahyar_student_id };
    return {
      id: `virtual:${e.id}`,
      session_id: sessionId,
      enrollment_id: e.id,
      status: "unknown" as AttendanceStatus,
      source: "manual" as AttendanceSource,
      check_in_at: null,
      check_out_at: null,
      late_minutes: null,
      notes: null,
      created_at: "",
      updated_at: "",
      student_name: e.student_name,
      rahyar_student_id: e.rahyar_student_id,
    };
  });
}

export async function upsertAttendance(
  sessionId: string,
  items: Array<{
    enrollment_id: string;
    status: AttendanceStatus;
    late_minutes?: number | null;
    notes?: string | null;
    source?: AttendanceSource;
  }>,
  actor: string,
) {
  const session = await getSession(sessionId);
  if (!session) throw new Error("session_not_found");
  if (session.attendance_finalized) throw new Error("attendance_finalized");
  const results: AyAttendance[] = [];
  for (const item of items) {
    const { data: before } = await db()
      .from("ay_session_attendance")
      .select("*")
      .eq("session_id", sessionId)
      .eq("enrollment_id", item.enrollment_id)
      .maybeSingle();
    const { data, error } = await db()
      .from("ay_session_attendance")
      .upsert(
        {
          session_id: sessionId,
          enrollment_id: item.enrollment_id,
          status: item.status,
          source: item.source || "manual",
          late_minutes: item.status === "late" ? (item.late_minutes ?? 0) : null,
          notes: item.notes?.trim().slice(0, 1000) || null,
          updated_at: now(),
        },
        { onConflict: "session_id,enrollment_id" },
      )
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await writeAuditLog({
      actor,
      action: "system.action",
      resource_type: "ay_session_attendance",
      resource_id: data.id,
      before: before ? { status: before.status } : null,
      after: { status: data.status },
      metadata: {
        op: before ? "attendance.correct" : "attendance.create",
        session_id: sessionId,
      },
    });
    results.push(data as AyAttendance);
  }
  return results;
}

export async function finalizeAttendance(sessionId: string, actor: string, finalize = true) {
  return updateSession(sessionId, { attendance_finalized: finalize }, actor);
}

export async function classAttendanceReport(classId: string) {
  const sb = db();
  const [
    { count: total_sessions },
    { count: completed_sessions },
    { count: cancelled_sessions },
    { count: active_enrollments },
  ] = await Promise.all([
    sb.from("ay_class_sessions").select("id", { count: "exact", head: true }).eq("class_id", classId),
    sb
      .from("ay_class_sessions")
      .select("id", { count: "exact", head: true })
      .eq("class_id", classId)
      .eq("status", "completed"),
    sb
      .from("ay_class_sessions")
      .select("id", { count: "exact", head: true })
      .eq("class_id", classId)
      .eq("status", "cancelled"),
    sb
      .from("ay_class_enrollments")
      .select("id", { count: "exact", head: true })
      .eq("class_id", classId)
      .eq("status", "active"),
  ]);
  const { data: sessionIds } = await sb.from("ay_class_sessions").select("id").eq("class_id", classId);
  const ids = (sessionIds || []).map((s) => s.id);
  let present = 0,
    late = 0,
    absent = 0,
    excused = 0,
    unknown = 0;
  if (ids.length) {
    const { data: att } = await sb.from("ay_session_attendance").select("status").in("session_id", ids);
    for (const a of att || []) {
      if (a.status === "present") present++;
      else if (a.status === "late") late++;
      else if (a.status === "absent") absent++;
      else if (a.status === "excused") excused++;
      else unknown++;
    }
  }
  const { data: incomplete } = await sb
    .from("ay_class_sessions")
    .select("id")
    .eq("class_id", classId)
    .eq("status", "completed")
    .eq("attendance_finalized", false);
  const marked = present + late + absent + excused;
  return {
    total_sessions: total_sessions ?? 0,
    completed_sessions: completed_sessions ?? 0,
    cancelled_sessions: cancelled_sessions ?? 0,
    active_enrollments: active_enrollments ?? 0,
    present,
    late,
    absent,
    excused,
    unknown,
    attendance_rate: marked > 0 ? Math.round(((present + late) / marked) * 100) : null,
    incomplete_sessions: (incomplete || []).length,
  };
}
