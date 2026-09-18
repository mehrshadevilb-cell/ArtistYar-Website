"use client";

import Link from "next/link";
import { ArrowRight, UserRound } from "lucide-react";
import { PracticeProgressPanel } from "@/components/PracticeProgressPanel";

export default function PracticeProfilePage() {
  return <main className="container-ay py-12 sm:py-16">
    <Link href="/practice" className="btn-ghost !px-4 !py-2 text-xs"><ArrowRight size={14}/> بازگشت به تمرین‌ها</Link>
    <div className="mt-8 flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-400/10 text-gold-300"><UserRound size={22}/></span><div><span className="eyebrow">PROFILE · PRACTICE</span><h1 className="mt-1 text-2xl font-semibold text-sand-50">پروفایل تمرین و رکوردها</h1></div></div>
    <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-400">رکوردهای بازی‌ها، XP، تعداد جلسات و جایگاه جدول امتیازات در این بخش جمع می‌شوند.</p>
    <PracticeProgressPanel />
  </main>;
}
