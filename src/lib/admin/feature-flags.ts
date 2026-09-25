/**
 * Centralized feature-flag foundation (env-driven).
 */
export type FeatureFlagId =
  | "practice"
  | "hitnevis"
  | "music_generator"
  | "ai"
  | "telegram"
  | "courses"
  | "classes"
  | "attendance"
  | "new_admin"
  | "assistant"
  | "free_player"
  | "online_classes"
  | "registration"
  | "maintenance_mode";

export type FeatureFlag = {
  id: FeatureFlagId;
  label: string;
  description: string;
  enabled: boolean;
  source: "env" | "default";
};

function envFlag(name: string, fallback = false): boolean {
  const v = (process.env[name] || "").trim().toLowerCase();
  if (!v) return fallback;
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

function envDisabled(name: string, fallbackEnabled = true): boolean {
  return !envFlag(name, !fallbackEnabled);
}

const FLAG_DEFS: Array<{
  id: FeatureFlagId;
  label: string;
  description: string;
  resolve: () => boolean;
}> = [
  { id: "practice", label: "Practice", description: "موتور تمرین و اشتراک Practice Pro", resolve: () => !envFlag("PRACTICE_DISABLED", false) },
  { id: "hitnevis", label: "هیت‌نویس", description: "ابزار ترانه‌سرایی هیت‌نویس", resolve: () => !envFlag("HITNEVIS_DISABLED", false) },
  { id: "music_generator", label: "Music Generator", description: "تولید موسیقی با AI", resolve: () => !envFlag("MUSIC_GENERATOR_DISABLED", false) },
  { id: "ai", label: "AI عمومی", description: "قابلیت‌های هوش مصنوعی سایت", resolve: () => !envFlag("AI_DISABLED", false) },
  { id: "telegram", label: "تلگرام", description: "پلاگین‌ها و همگام‌سازی تلگرام", resolve: () => !envFlag("TELEGRAM_DISABLED", false) },
  { id: "courses", label: "دوره‌ها", description: "فروش و دسترسی دوره‌های آموزشی", resolve: () => !envFlag("COURSES_DISABLED", false) },
  { id: "classes", label: "کلاس‌ها", description: "کلاس آنلاین و مدیریت جلسات", resolve: () => !envFlag("CLASSES_DISABLED", false) },
  { id: "attendance", label: "حضور و غیاب", description: "ثبت حضور جلسات", resolve: () => !envFlag("ATTENDANCE_DISABLED", false) },
  { id: "new_admin", label: "ادمین جدید", description: "فعال‌سازی معماری Admin Control Center", resolve: () => envFlag("NEW_ADMIN_ENABLED", true) },
  { id: "assistant", label: "دستیار AI", description: "راه‌یار / Admin AI Assistant", resolve: () => envDisabled("ASSISTANT_DISABLED", true) },
  { id: "free_player", label: "پلیر رایگان", description: "آموزش رایگان و پلیر عمومی", resolve: () => envDisabled("FREE_PLAYER_DISABLED", true) },
  { id: "online_classes", label: "کلاس آنلاین", description: "رزرو و کلاس‌های زنده", resolve: () => envDisabled("ONLINE_CLASSES_DISABLED", true) },
  { id: "registration", label: "ثبت‌نام", description: "امکان ثبت‌نام کاربران جدید", resolve: () => envDisabled("REGISTRATION_DISABLED", true) },
  { id: "maintenance_mode", label: "حالت تعمیر", description: "سایت در حالت تعمیر است", resolve: () => envFlag("MAINTENANCE_MODE", false) },
];

export function getFeatureFlags(): FeatureFlag[] {
  return FLAG_DEFS.map((d) => ({
    id: d.id,
    label: d.label,
    description: d.description,
    enabled: d.resolve(),
    source: "env" as const,
  }));
}

export function isFeatureEnabled(id: FeatureFlagId): boolean {
  return getFeatureFlags().find((f) => f.id === id)?.enabled ?? false;
}
