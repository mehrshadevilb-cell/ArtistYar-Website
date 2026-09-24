/**
 * HitNevis system prompts — Persian-first lyric assistant.
 * No provider/model names; pure task instructions.
 */

import type { HitNevisGenerateRequest, HitNevisMode } from "./types";

const MODE_LABELS: Record<HitNevisMode, string> = {
  write_full: "نوشتن ترانه کامل (ورس + کورس + بریج اختیاری)",
  write_chorus: "نوشتن فقط کورس/قلاب",
  write_verse: "نوشتن ورس",
  improve: "بهبود و بازنویسی متن موجود",
  rhyme: "پیشنهاد قافیه و هم‌آوایی",
  title_ideas: "ایده عنوان ترانه",
  structure: "پیشنهاد ساختار ترانه (ورس/کورس/بریج)",
};

export function buildHitNevisSystemPrompt(req: HitNevisGenerateRequest): string {
  const lang =
    req.language === "en"
      ? "English"
      : req.language === "fa-en"
        ? "Persian with optional English hooks"
        : "Persian (فارسی)";

  return [
    "تو «هیت‌نویس» هستی — دستیار حرفه‌ای ترانه‌سرایی آرتیست‌یار.",
    "فقط درباره ترانه، شعر، قافیه، ساختار آهنگ و ایده‌های موسیقایی پاسخ بده.",
    `زبان خروجی: ${lang}.`,
    "لحن: طبیعی، قابل‌خواندن روی ملودی، بدون کلیشهٔ مصنوعی مگر درخواست شود.",
    "اگر متن نامناسب یا خارج از حوزه بود، کوتاه و محترمانه رد کن.",
    "خروجی را تمیز بنویس؛ برچسب‌های غیرضروری نگذار مگر برای ورس/کورس.",
    "هرگز نام مدل یا ارائه‌دهندهٔ هوش مصنوعی را ذکر نکن.",
  ].join("\n");
}

export function buildHitNevisUserPrompt(req: HitNevisGenerateRequest): string {
  const parts: string[] = [];
  parts.push(`حالت: ${MODE_LABELS[req.mode]}`);
  if (req.topic?.trim()) parts.push(`موضوع / حس: ${req.topic.trim().slice(0, 500)}`);
  if (req.genre) parts.push(`ژانر: ${req.genre}`);
  if (req.tone) parts.push(`تون احساسی: ${req.tone}`);
  if (req.constraints?.trim()) parts.push(`محدودیت‌ها: ${req.constraints.trim().slice(0, 400)}`);
  if (req.existingLyrics?.trim()) {
    parts.push("متن فعلی:");
    parts.push(req.existingLyrics.trim().slice(0, 6000));
  }
  if (req.mode === "write_full" && !req.existingLyrics?.trim()) {
    parts.push("یک ترانه کامل با ورس و کورس بنویس. برچسب [ورس] و [کورس] بگذار.");
  }
  if (req.mode === "improve" && !req.existingLyrics?.trim()) {
    parts.push("متن فعلی خالی است؛ یک نمونهٔ کوتاه بنویس.");
  }
  return parts.join("\n\n");
}

export const HITNEVIS_MODES: HitNevisMode[] = [
  "write_full",
  "write_chorus",
  "write_verse",
  "improve",
  "rhyme",
  "title_ideas",
  "structure",
];

export function isValidMode(value: unknown): value is HitNevisMode {
  return typeof value === "string" && (HITNEVIS_MODES as string[]).includes(value);
}
