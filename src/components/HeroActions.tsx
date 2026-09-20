"use client";

import { ArrowLeft } from "lucide-react";
import { SafeLink } from "./SafeLink";

/** Primary homepage CTAs — hard navigation in Telegram so the button always opens /courses. */
export function HeroActions() {
  return (
    <div className="hero-actions" data-hero-actions>
      <SafeLink href="/courses" hard className="btn-primary gap-2" ariaLabel="دیدن پکیج‌های آموزشی">
        دیدن پکیج‌های آموزشی <ArrowLeft size={16} aria-hidden />
      </SafeLink>
    </div>
  );
}
