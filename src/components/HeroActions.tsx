"use client";

import { ArrowLeft, Bot } from "lucide-react";
import { SafeLink } from "./SafeLink";

/** Primary homepage CTAs — hard navigation in Telegram so the button always opens /courses. */
export function HeroActions() {
  return (
    <div className="hero-actions" data-hero-actions>
      <SafeLink href="/courses" hard className="btn-primary gap-2" ariaLabel="دیدن مسیرهای آموزشی">
        دیدن مسیرهای آموزشی <ArrowLeft size={16} aria-hidden />
      </SafeLink>
      <SafeLink href="/assistant" hard className="btn-ghost gap-2" ariaLabel="سؤال از راه‌یار AI">
        سؤال از راه‌یار AI <Bot size={16} aria-hidden />
      </SafeLink>
    </div>
  );
}
