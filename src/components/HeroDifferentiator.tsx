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
  },
  {
    label: "Practice Arcade",
    detail: "تمرین شنیداری و مهارت‌های حرفه‌ای صدا با XP و چالش روزانه.",
    icon: Gamepad2,
    href: "/practice",
    accent: "cyan",
    soon: false,
  },
  {
    label: "Analyze Music",
    detail: "فایل، میکس، فرکانس و بالانس را با نگاه حرفه‌ای بررسی کن.",
    icon: BarChart3,
    href: "/music-analyzer",
    accent: "blue",
    soon: false,
  },
  {
    label: "AI Music Generator",
    detail: "ساخت ایده و جهت‌گیری موسیقی با هوش مصنوعی — به‌زودی.",
    icon: Wand2,
    href: "#",
    accent: "violet",
    soon: true,
  },
] as const;

export function HeroDifferentiator() {
  return (
    <div className="hero-differentiator hero-differentiator-fill" aria-label="ویژگی‌های اصلی ArtistYar">
      <div className="hero-differentiator-grid hero-differentiator-grid-4">
        {signals.map(({ label, detail, icon: Icon, href, accent, soon }, index) =>
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
              <span className="hero-feature-index">۰{index + 1}</span>
            </SafeLink>
          ),
        )}
      </div>

      <div className="hero-differentiator-bottom">
        <div className="hero-xp">
          <span className="hero-xp-icon">
            <Zap size={13} />
          </span>
          <span>
            <b>XP</b> · تمرینت ثبت می‌شود
          </span>
        </div>
        <div className="hero-xp">
          <Trophy size={13} />
          <span>رکورد · پیشرفت · چالش روزانه</span>
        </div>
      </div>
    </div>
  );
}
