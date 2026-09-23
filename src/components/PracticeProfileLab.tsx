"use client";
type Props = { onBack?: () => void };
export function PracticeProfileLab({ onBack }: Props) {
  return (
    <div className="container-ay py-8" dir="rtl">
      <button type="button" className="text-sm text-ink-500" onClick={onBack}>بازگشت</button>
      <h1 className="mt-4 text-xl text-sand-50">پروفایل تمرین</h1>
      <p className="mt-2 text-sm text-ink-500">امتیاز مهارت، XP، استریک و لیدربورد.</p>
    </div>
  );
}
