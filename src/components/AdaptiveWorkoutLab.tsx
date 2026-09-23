"use client";

type Props = { onBack?: () => void; mode?: "workout" | "practice" };

export function AdaptiveWorkoutLab({ onBack, mode = "workout" }: Props) {
  const isPractice = mode === "practice";
  return (
    <div className="container-ay min-h-[50vh] py-8" dir="rtl">
      <button type="button" className="text-sm text-ink-500 hover:text-ink-300" onClick={onBack}>
        ← بازگشت به تمرین‌خانه
      </button>
      <h1 className="mt-4 text-xl font-semibold text-sand-50">
        {isPractice ? "تمرین آزاد" : "تمرین هوشمند امروز"}
      </h1>
      <p className="mt-2 max-w-lg text-sm leading-6 text-ink-500">
        {isPractice
          ? "بدون تأثیر روی Skill Rating — مهارت و سختی را خودت انتخاب کن."
          : "ورک‌اوت تطبیقی بر اساس پروفایل مهارت و نقاط ضعف."}
      </p>
      <div className="card-ay mt-6 space-y-3 p-5">
        <p className="text-sm text-sand-50">این بخش آماده است.</p>
        <p className="text-xs leading-6 text-ink-500">
          راندهای کامل پس از اتصال موتور تمرین اینجا اجرا می‌شوند. از منوی گوش می‌توانی تمرین پایه را شروع کنی.
        </p>
        <button type="button" className="btn-primary !px-4 !py-2 text-xs" onClick={onBack}>
          بازگشت
        </button>
      </div>
    </div>
  );
}
