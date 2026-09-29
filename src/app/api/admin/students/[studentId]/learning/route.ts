import { NextResponse } from "next/server";
import { requireAdmin, errorResponse } from "@/lib/admin/classes/auth";
import { getServiceSupabase } from "@/lib/admin/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ studentId: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { studentId } = await context.params;
    const numericId = Number(studentId);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      return NextResponse.json({ error: "invalid_student_id" }, { status: 400 });
    }

    const sb = getServiceSupabase();
    if (!sb) return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });

    const { data: enrollments, error: enrollmentError } = await sb
      .from("ay_class_enrollments")
      .select("*")
      .eq("rahyar_student_id", numericId)
      .order("enrolled_at", { ascending: false });

    if (enrollmentError) throw new Error(enrollmentError.message);

    const rows = enrollments || [];
    const classIds = [...new Set(rows.map((row) => row.class_id).filter(Boolean))];

    if (!classIds.length) {
      return NextResponse.json({
        ok: true,
        student_id: numericId,
        classes: [],
        summary: { classes: 0, active_classes: 0, sessions: 0, completed_sessions: 0, attendance_marked: 0, present: 0, late: 0, absent: 0 },
      });
    }

    const [{ data: classes, error: classesError }, { data: sessions, error: sessionsError }] =
      await Promise.all([
        sb.from("ay_classes").select("*").in("id", classIds),
        sb
          .from("ay_class_sessions")
          .select("*")
          .in("class_id", classIds)
          .order("scheduled_start", { ascending: true }),
      ]);

    if (classesError) throw new Error(classesError.message);
    if (sessionsError) throw new Error(sessionsError.message);

    const sessionRows = sessions || [];
    const sessionIds = sessionRows.map((session) => session.id);
    const { data: attendance, error: attendanceError } = sessionIds.length
      ? await sb
          .from("ay_session_attendance")
          .select("*")
          .in("session_id", sessionIds)
          .in("enrollment_id", rows.map((row) => row.id))
      : { data: [], error: null };

    if (attendanceError) throw new Error(attendanceError.message);

    const classById = new Map((classes || []).map((item) => [item.id, item]));
    const attendanceBySession = new Map<string, Record<string, unknown>>();
    for (const item of attendance || []) {
      attendanceBySession.set(item.session_id, item);
    }

    const classItems = rows.map((enrollment) => {
      const cls = classById.get(enrollment.class_id);
      const classSessions = sessionRows.filter((session) => session.class_id === enrollment.class_id);
      const classAttendance = classSessions
        .map((session) => attendanceBySession.get(session.id))
        .filter(Boolean) as Array<{ status?: string }>;

      return {
        enrollment,
        class: cls || null,
        sessions: classSessions.map((session) => ({
          id: session.id,
          scheduled_start: session.scheduled_start,
          scheduled_end: session.scheduled_end,
          status: session.status,
          meeting_url: session.meeting_url,
          attendance_finalized: session.attendance_finalized,
          attendance: attendanceBySession.get(session.id) || null,
        })),
        attendance: {
          present: classAttendance.filter((item) => item.status === "present").length,
          late: classAttendance.filter((item) => item.status === "late").length,
          absent: classAttendance.filter((item) => item.status === "absent").length,
          excused: classAttendance.filter((item) => item.status === "excused").length,
          marked: classAttendance.filter((item) => item.status && item.status !== "unknown").length,
        },
      };
    });

    const allAttendance = (attendance || []) as Array<{ status?: string }>;
    return NextResponse.json({
      ok: true,
      student_id: numericId,
      classes: classItems,
      summary: {
        classes: classItems.length,
        active_classes: classItems.filter((item) => item.enrollment.status === "active").length,
        sessions: sessionRows.length,
        completed_sessions: sessionRows.filter((item) => item.status === "completed").length,
        attendance_marked: allAttendance.filter((item) => item.status && item.status !== "unknown").length,
        present: allAttendance.filter((item) => item.status === "present").length,
        late: allAttendance.filter((item) => item.status === "late").length,
        absent: allAttendance.filter((item) => item.status === "absent").length,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
