"use client";

import { ArrowLeft, BarChart3, Bot, Gamepad2, Trophy, Wand2, Zap } from "lucide-react";
import { SafeLink } from "@/components/SafeLink";

const signals = [
  {
    label: "ArtistYar AI",
    detail: "سؤال بپرس، عیب‌یابی میکس کن و قدم بعدی را با دستیار هوشمند پیدا کن.",
    icon: Bot,
    href: "/assistant",
    accent: "gold",
    soon: false,
    extra: null as null | "arcade",
  },
  {
    label: "Practice Arcade",
    detail: "تمرین شنیداری و مهارت‌های حرفه‌ای صدا با XP و چالش روزانه.",
    icon: Gamepad2,
    href: "/practice",
    accent: "cyan",
    soon: false,
    extra: "arcade" as const,
  },
  {
    label: "Analyze Music",
    detail: "فایل، میکس، فرکانس و بالانس را با نگاه حرفه‌ای بررسی کن.",
    icon: BarChart3,
    href: "/music-analyzer",
    accent: "blue",
    soon: false,
    extra: null as null | "arcade",
  },
  {
    label: "AI Music Generator",
    detail: "ریف، بیس‌لاین، ملودی و فیل درام را با زبان طبیعی بخواه و بشنو.",
    icon: Wand2,
    href: "/ai-music",
    accent: "violet",
    soon: false,
    extra: null as null | "arcade",
  },
] as const;

export function HeroDifferentiator() {
  return (
    <div className="hero-differentiator hero-differentiator-fill" aria-label="ویژگی‌های اصلی ArtistYar">
      <div className="hero-differentiator-grid hero-differentiator-grid-4">
        {signals.map(({ label, detail, icon: Icon, href, accent, soon, extra }, index) =>
          soon ? (
            <div
              key={label}
              className={`hero-feature-card hero-feature-large hero-feature-${accent} hero-feature-soon`}
              aria-disabled="true"
            >
              <div className="hero-feature-top">
                <span className="hero-feature-icon">
                  <Icon size={20} />
                </span>
                <span className="hero-feature-soon-badge">به‌زودی</span>
              </div>
              <strong className="hero-feature-title">{label}</strong>
              <small className="hero-feature-detail">{detail}</small>
              <span className="hero-feature-index">۰{index + 1}</span>
            </div>
          ) : (
            <SafeLink
              key={label}
              href={href}
              hard
              className={`hero-feature-card hero-feature-large hero-feature-${accent}`}
            >
              <div className="hero-feature-top">
                <span className="hero-feature-icon">
                  <Icon size={20} />
                </span>
                <ArrowLeft className="hero-feature-arrow" size={16} />
              </div>
              <strong className="hero-feature-title">{label}</strong>
              <small className="hero-feature-detail">{detail}</small>
              {extra === "arcade" ? (
                <div className="hero-arcade-meta">
                  <span className="hero-arcade-chip">
                    <Zap size={12} />
                    <b>XP</b> · تمرینت ثبت می‌شود
                  </span>
                  <span className="hero-arcade-chip">
                    <Trophy size={12} />
                    رکورد · پیشرفت · چالش روزانه
                  </span>
                </div>
              ) : null}
              <span className="hero-feature-index">۰{index + 1}</span>
            </SafeLink>
          ),
        )}
      </div>
    </div>
  );
}
