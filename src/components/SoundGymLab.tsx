"use client";

type Props = { onBack?: () => void; initialExercise?: string };

export function SoundGymLab({ onBack }: Props) {
  return (
    <div className="container-ay min-h-[50vh] py-8" dir="rtl">
      <button type="button" className="text-sm text-ink-500 hover:text-ink-300" onClick={onBack}>
        ← بازگشت به تمرین‌خانه
      </button>
      <h1 className="mt-4 text-xl font-semibold text-sand-50">باشگاه گوش</h1>
      <p className="mt-2 text-sm leading-6 text-ink-500">تمرین‌های فرکانس، EQ، فیلتر، کمپرسور، پن و عرض استریو.</p>
      <button type="button" className="btn-primary mt-6 !px-4 !py-2 text-xs" onClick={onBack}>
        بازگشت
      </button>
    </div>
  );
}
