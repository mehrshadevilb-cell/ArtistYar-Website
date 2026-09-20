"use client";

import { ArrowLeft, Bot, Headphones, Sparkles, Trophy, Zap } from "lucide-react";
import { SafeLink } from "@/components/SafeLink";

const signals = [
  { label: "RAHYAR AI", detail: "دستیار تخصصی تولید موسیقی", icon: Bot, href: "/assistant", accent: "gold" },
  { label: "PRACTICE ENGINE", detail: "Ear Training + Professional Audio Skills", icon: Headphones, href: "/practice", accent: "cyan" },
];

export function HeroDifferentiator() {
  return (
    <div className="hero-differentiator" aria-label="ویژگی‌های اختصاصی ArtistYar">
      <div className="hero-differentiator-head">
        <span className="hero-differentiator-live"><i /> LIVE SYSTEM</span>
        <span className="hero-differentiator-label">فراتر از یک سایت آموزشی</span>
      </div>

      <div className="hero-differentiator-grid">
        {signals.map(({ label, detail, icon: Icon, href, accent }, index) => (
          <SafeLink key={label} href={href} hard className={"hero-feature-card hero-feature-" + accent}>
            <span className="hero-feature-icon"><Icon size={17} /></span>
            <span className="hero-feature-copy">
              <strong>{label}</strong>
              <small>{detail}</small>
            </span>
            <ArrowLeft className="hero-feature-arrow" size={15} />
            <span className="hero-feature-index">۰{index + 1}</span>
          </SafeLink>
        ))}
      </div>

      <div className="hero-differentiator-bottom">
        <div className="hero-xp">
          <span className="hero-xp-icon"><Zap size={13} /></span>
          <span><b>XP</b> · تمرینت ثبت می‌شود</span>
        </div>
        <div className="hero-xp">
          <Trophy size={13} />
          <span>رکورد · پیشرفت · چالش روزانه</span>
        </div>
        <span className="hero-differentiator-spark"><Sparkles size={13} /> built for producers</span>
      </div>
    </div>
  );
}
