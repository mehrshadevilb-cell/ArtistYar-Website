"use client";
type Props = { onBack?: () => void };
export function DailyChallengeLab({ onBack }: Props) {
  return (
    <div className="container-ay py-8" dir="rtl">
      <button type="button" className="text-sm text-ink-500" onClick={onBack}>بازگشت</button>
      <h1 className="mt-4 text-xl text-sand-50">چالش روزانه</h1>
      <p className="mt-2 text-sm text-ink-500">۵ راند ثابت · لیدربورد امروز.</p>
    </div>
  );
}
