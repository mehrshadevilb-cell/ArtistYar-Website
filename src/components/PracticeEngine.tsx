"use client";

import { useState } from "react";
import { Award, FileAudio, Flame, Gamepad2, Sparkles } from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";
import { PracticeProgressPanel } from "@/components/PracticeProgressPanel";
import { TheoryLab } from "@/components/TheoryLab";
import { SkillEngineDashboard } from "@/components/SkillEngineDashboard";
import { PracticeProBanner } from "@/components/PracticeProBanner";
import { useAuth } from "@/components/AuthProvider";
import { ProGate } from "@/components/PracticeProGate";

type GameId = "hub" | "theory" | "pro-arcade" | "voicing" | "personal";

export default function PracticeEngine() {
  const { user } = useAuth();
  const [active, setActive] = useState<GameId>("hub");

  return (
    <main className="container-ay relative py-12 sm:py-16">
      <div className="route-ambient route-ambient-one" aria-hidden="true" />
      <SectionHeading
        eyebrow="PRACTICE ENGINE / مرکز مهارت"
        title="مهارت شنیداری و حرفه‌ای را تمرین بده."
        subtitle="Ear Training، Theory Lab و اشتراک Pro برای تمرین حرفه‌ای."
      />
      <SkillEngineDashboard />
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div className="card-ay flex items-center gap-3 px-4 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-400/10 text-gold-300"><Award size={18} /></span>
          <span><span className="block text-[11px] text-ink-500">حساب</span><strong className="text-sm text-sand-50">{user?.fullName || user?.username || "مهمان"}</strong></span>
        </div>
        <div className="card-ay flex items-center gap-3 px-4 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-400/10 text-orange-300"><Flame size={18} /></span>
          <span className="text-xs text-ink-500">هر روز تمرین کن تا Streak حفظ شود</span>
        </div>
      </div>

      {active === "hub" && (
        <div className="mt-10 space-y-6">
          <PracticeProBanner onUpgrade={() => setActive("pro-arcade")} />
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { id: "theory" as const, title: "Theory Lab", desc: "فاصله، آکورد و گام", icon: Sparkles, color: "text-violet-300" },
              { id: "pro-arcade" as const, title: "Professional Audio Skills", desc: "Reverb · Saturation · Masking · Transient", icon: Gamepad2, color: "text-gold-300" },
              { id: "voicing" as const, title: "Voicing روزانه", desc: "۱ Voicing پیانو حرفه‌ای در روز", icon: Sparkles, color: "text-gold-300" },
              { id: "personal" as const, title: "تمرین شخصی", desc: "فایل خودت را آپلود کن", icon: FileAudio, color: "text-emerald-300" },
            ].map((g) => {
              const Icon = g.icon;
              return (
                <button key={g.id} type="button" className="card-ay p-6 text-right transition hover:border-gold-400/35" onClick={() => setActive(g.id)}>
                  <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[.04] ${g.color}`}><Icon size={22} /></span>
                  <strong className="mt-4 block text-lg text-sand-50">{g.title}</strong>
                  <p className="mt-2 text-sm leading-7 text-ink-400">{g.desc}</p>
                </button>
              );
            })}
          </div>
          <PracticeProgressPanel />
        </div>
      )}

      {active === "theory" && <TheoryLab onBack={() => setActive("hub")} />}
      {(active === "pro-arcade" || active === "voicing") && (
        <ProGate
          onBack={() => setActive("hub")}
          title={active === "pro-arcade" ? "Professional Audio Skills" : "Voicing روزانه"}
          body={active === "pro-arcade" ? "Reverb، Saturation، Masking و Transient برای کاربران Pro." : "هر روز یک Voicing پیانو حرفه‌ای برای Pro."}
        />
      )}
      {active === "personal" && (
        <section className="mt-10">
          <button type="button" className="btn-ghost !px-4 !py-2 text-xs" onClick={() => setActive("hub")}>بازگشت</button>
          <div className="card-ay mt-5 p-8 text-center">
            <FileAudio className="mx-auto text-emerald-300" size={34} />
            <h2 className="mt-4 text-xl text-sand-50">تمرین شخصی</h2>
            <p className="mt-3 text-sm leading-8 text-ink-400">به‌زودی آپلود مستقیم فایل برای A/B listening فعال می‌شود.</p>
          </div>
        </section>
      )}
    </main>
  );
}
