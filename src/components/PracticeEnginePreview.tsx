import { ArrowLeft, AudioLines, Ear } from "lucide-react";
import { SafeLink } from "@/components/SafeLink";

const tracks = [
  {
    label: "01 / EAR TRAINING ENGINE",
    title: "گوش موسیقی",
    body: "Frequency، EQ، Dynamics، Phase و Harmony را با تمرین‌های تطبیقی و سؤال‌های تازه تقویت کن.",
    icon: Ear,
    accent: "cyan",
  },
  {
    label: "02 / PROFESSIONAL AUDIO SKILLS",
    title: "مهارت‌های حرفه‌ای صدا",
    body: "Reverb، Saturation، Masking و Transient را مثل مسئله‌های واقعی میکس تمرین کن.",
    icon: AudioLines,
    accent: "gold",
  },
];

export function PracticeEnginePreview() {
  return (
    <section className="container-ay section-space border-y border-white/[.06]">
      <div className="section-intro">
        <p className="eyebrow">/ ARTISTYAR PRACTICE ENGINE</p>
        <h2 className="section-title">
          یک مرکز واحد برای
          <br />
          <span className="text-gold-400">ساختن مهارت شنیداری.</span>
        </h2>
        <p className="section-sub">
          Practice Arcade و Pro Audio Lab حالا یک مسیر یکپارچه‌اند؛ از Ear Training تا Professional Audio Skills.
        </p>
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        {tracks.map(({ label, title, body, icon: Icon, accent }) => (
          <SafeLink
            key={label}
            href="/practice"
            hard
            className={`group rounded-2xl border border-white/[.08] bg-white/[.025] p-6 transition duration-300 hover:-translate-y-1 hover:border-white/[.16] sm:p-7 ${accent === "gold" ? "hover:shadow-[0_24px_60px_-42px_rgba(201,162,39,.7)]" : "hover:shadow-[0_24px_60px_-42px_rgba(70,190,210,.55)]"}`}
          >
            <div className="flex items-start justify-between gap-4">
              <span className={`grid h-11 w-11 place-items-center rounded-xl ${accent === "gold" ? "bg-gold-400/10 text-gold-300" : "bg-cyan-400/10 text-cyan-200"}`}>
                <Icon size={20} />
              </span>
              <ArrowLeft size={16} className="mt-1 text-ink-500 transition group-hover:-translate-x-1 group-hover:text-gold-300" />
            </div>
            <p className="mt-7 text-[10px] font-medium tracking-[.14em] text-ink-500">{label}</p>
            <h3 className="mt-2 text-2xl font-medium text-sand-50">{title}</h3>
            <p className="mt-3 max-w-xl text-sm leading-8 text-ink-400">{body}</p>
            <div className="mt-6 flex flex-wrap gap-2 text-[10px] text-ink-500">
              <span className="rounded-full border border-white/10 px-3 py-1.5">Adaptive</span>
              <span className="rounded-full border border-white/10 px-3 py-1.5">XP + Level</span>
              <span className="rounded-full border border-white/10 px-3 py-1.5">Real Audio</span>
            </div>
          </SafeLink>
        ))}
      </div>
    </section>
  );
}
