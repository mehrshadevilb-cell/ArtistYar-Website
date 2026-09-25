/** Canonical Class / Session / Enrollment / Attendance domain types */

export type ClassStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "paused"
  | "completed"
  | "cancelled"
  | "archived";

export type ClassType = "group" | "one_on_one" | "workshop" | "online" | "hybrid";
export type DeliveryMode = "online" | "in_person" | "hybrid";

export type SessionStatus =
  | "scheduled"
  | "open"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "rescheduled";

export type EnrollmentStatus = "active" | "paused" | "completed" | "cancelled" | "archived";

export type AttendanceStatus = "present" | "late" | "absent" | "excused" | "unknown";
export type AttendanceSource = "manual" | "automatic";

export type AyClass = {
  id: string;
  title: string;
  description: string | null;
  status: ClassStatus;
  class_type: ClassType;
  delivery_mode: DeliveryMode;
  capacity: number | null;
  start_date: string | null;
  end_date: string | null;
  timezone: string;
  location: string | null;
  meeting_url: string | null;
  rahyar_class_id: number | null;
  course_id: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  enrollment_count?: number;
  upcoming_session?: { id: string; scheduled_start: string; status: SessionStatus } | null;
};

export type AyClassSchedule = {
  id: string;
  class_id: string;
  pattern: "weekly" | "once";
  weekdays: number[];
  start_time: string;
  duration_minutes: number;
  range_start: string;
  range_end: string | null;
  timezone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AyEnrollment = {
  id: string;
  class_id: string;
  rahyar_student_id: number | null;
  student_name: string | null;
  student_phone: string | null;
  status: EnrollmentStatus;
  enrolled_at: string;
  ended_at: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type AySession = {
  id: string;
  class_id: string;
  schedule_id: string | null;
  scheduled_start: string;
  scheduled_end: string;
  timezone: string;
  status: SessionStatus;
  location: string | null;
  meeting_url: string | null;
  actual_start: string | null;
  actual_end: string | null;
  notes: string | null;
  attendance_finalized: boolean;
  created_at: string;
  updated_at: string;
  class_title?: string;
};

export type AyAttendance = {
  id: string;
  session_id: string;
  enrollment_id: string;
  status: AttendanceStatus;
  source: AttendanceSource;
  check_in_at: string | null;
  check_out_at: string | null;
  late_minutes: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  student_name?: string | null;
  rahyar_student_id?: number | null;
};

export const CLASS_STATUS_LABELS: Record<ClassStatus, string> = {
  draft: "پیش‌نویس",
  scheduled: "زمان‌بندی‌شده",
  active: "فعال",
  paused: "متوقف",
  completed: "تمام‌شده",
  cancelled: "لغو‌شده",
  archived: "بایگانی",
};

export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  scheduled: "زمان‌بندی‌شده",
  open: "باز",
  in_progress: "در حال برگزاری",
  completed: "برگزار‌شده",
  cancelled: "لغو‌شده",
  rescheduled: "جابه‌جاشده",
};

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "حاضر",
  late: "تأخیر",
  absent: "غایب",
  excused: "موجه",
  unknown: "نامشخص",
};

export const WEEKDAY_LABELS = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"];
