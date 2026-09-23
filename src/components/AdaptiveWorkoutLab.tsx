"use client";

type Props = { onBack?: () => void; mode?: "workout" | "practice" };

export function AdaptiveWorkoutLab({ onBack, mode = "workout" }: Props) {
  return (
    <div className="container-ay py-8" dir="rtl">
      <button type="button" className="text-sm text-ink-500" onClick={onBack}>
        بازگشت
      </button>
      <h1 className="mt-4 text-xl text-sand-50">
        {mode === "practice" ? "تمرین آزاد" : "تمرین هوشمند امروز"}
      </h1>
      <p className="mt-2 text-sm text-ink-500">ورک‌اوت تطبیقی بر اساس پروفایل مهارت.</p>
    </div>
  );
}
