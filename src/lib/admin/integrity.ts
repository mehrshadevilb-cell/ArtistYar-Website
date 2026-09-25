/**
 * Data-integrity scan foundation — read-only, bounded, schema-aware.
 */
export type IntegrityFinding = {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  title: string;
  description: string;
  entity_type?: string;
  count?: number;
  sample_ids?: string[];
};

export type IntegrityReport = {
  scanned_at: string;
  findings: IntegrityFinding[];
  checks_run: number;
  duration_ms: number;
};

export async function runIntegrityScan(limit = 50): Promise<IntegrityReport> {
  const t0 = Date.now();
  const findings: IntegrityFinding[] = [];
  let checksRun = 0;
  const { getServiceSupabase } = await import("@/lib/admin/supabase-admin");
  const sb = getServiceSupabase();

  if (!sb) {
    return {
      scanned_at: new Date().toISOString(),
      findings: [
        {
          id: "no_supabase",
          severity: "high",
          category: "config",
          title: "Supabase در دسترس نیست",
          description: "اسکن یکپارچگی بدون اتصال دیتابیس قابل اجرا نیست.",
        },
      ],
      checks_run: 0,
      duration_ms: Date.now() - t0,
    };
  }

  checksRun++;
  try {
    const { data, error } = await sb
      .from("media_assets")
      .select("id, path, public_url")
      .is("public_url", null)
      .limit(limit);
    if (!error && data && data.length > 0) {
      findings.push({
        id: "media_missing_public_url",
        severity: "medium",
        category: "media",
        title: "رسانه بدون public_url",
        description: `${data.length} مورد رسانه بدون آدرس عمومی یافت شد (نمونه محدود).`,
        entity_type: "media_assets",
        count: data.length,
        sample_ids: data.slice(0, 5).map((r) => String(r.id)),
      });
    }
  } catch {
    // optional table
  }

  checksRun++;
  try {
    const { data, error } = await sb
      .from("practice_payment_requests")
      .select("id, user_id")
      .is("user_id", null)
      .limit(limit);
    if (!error && data && data.length > 0) {
      findings.push({
        id: "practice_payment_orphan_user",
        severity: "high",
        category: "payment",
        title: "درخواست پرداخت Practice بدون کاربر",
        description: `${data.length} درخواست بدون user_id.`,
        entity_type: "practice_payment_requests",
        count: data.length,
        sample_ids: data.slice(0, 5).map((r) => String(r.id)),
      });
    }
  } catch {
    // optional
  }

  checksRun++;
  try {
    const { data, error } = await sb
      .from("admin_ai_models")
      .select("id, model_id, enabled, is_preferred")
      .eq("is_preferred", true)
      .eq("enabled", false)
      .limit(limit);
    if (!error && data && data.length > 0) {
      findings.push({
        id: "ai_preferred_disabled",
        severity: "medium",
        category: "ai",
        title: "مدل ترجیحی غیرفعال",
        description: `${data.length} مدل preferred اما disabled است.`,
        entity_type: "admin_ai_models",
        count: data.length,
        sample_ids: data.slice(0, 5).map((r) => String(r.id ?? r.model_id)),
      });
    }
  } catch {
    // optional
  }

  // Education integrity checks are intentionally read-only and bounded.
  checksRun++;
  try {
    const { data: lessons, error } = await sb.from("educational_lessons")
      .select("id,course_id,section_id,is_active,sort_order")
      .limit(limit);
    if (!error && lessons) {
      const ids = new Set((lessons as any[]).map((x) => String(x.id)));
      const orphanSections = (lessons as any[]).filter((x) => x.is_active && x.section_id === null);
      if (orphanSections.length) findings.push({
        id: "education_lessons_without_section",
        severity: "low",
        category: "education",
        title: "درس آموزشی بدون بخش",
        description: `${orphanSections.length} درس فعال بدون section_id در نمونه محدود.`,
        entity_type: "educational_lessons",
        count: orphanSections.length,
        sample_ids: orphanSections.slice(0, 5).map((x) => String(x.id)),
      });
      const { data: videos, error: videoError } = await sb.from("educational_videos")
        .select("id,lesson_id,course_id,is_active")
        .limit(limit);
      if (!videoError && videos) {
        const orphanVideos = (videos as any[]).filter((x) => x.is_active && !ids.has(String(x.lesson_id)));
        if (orphanVideos.length) findings.push({
          id: "education_orphan_videos",
          severity: "high",
          category: "education",
          title: "ویدئوی آموزشی یتیم",
          description: `${orphanVideos.length} ویدئو به درس موجود متصل نیست.`,
          entity_type: "educational_videos",
          count: orphanVideos.length,
          sample_ids: orphanVideos.slice(0, 5).map((x) => String(x.id)),
        });
      }
      const { data: progress, error: progressError } = await sb.from("educational_video_progress")
        .select("user_id,lesson_id")
        .limit(limit);
      if (!progressError && progress) {
        const orphanProgress = (progress as any[]).filter((x) => !ids.has(String(x.lesson_id)));
        if (orphanProgress.length) findings.push({
          id: "education_orphan_progress",
          severity: "high",
          category: "education",
          title: "پیشرفت آموزشی با درس ناموجود",
          description: `${orphanProgress.length} رکورد progress به درس موجود اشاره نمی‌کند.`,
          entity_type: "educational_video_progress",
          count: orphanProgress.length,
        });
      }
    }
  } catch {
    // Education tables may not be deployed in older environments.
  }

  if (findings.length === 0) {
    findings.push({
      id: "clean",
      severity: "low",
      category: "data",
      title: "مشکل آشکاری یافت نشد",
      description: `در ${checksRun} بررسی محدود، مورد بحرانی پیدا نشد.`,
    });
  }

  return {
    scanned_at: new Date().toISOString(),
    findings,
    checks_run: checksRun,
    duration_ms: Date.now() - t0,
  };
}
