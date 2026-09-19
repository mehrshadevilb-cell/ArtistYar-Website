import { ArrowLeft, BarChart3, Bot, Dumbbell, Headphones } from "lucide-react";
import { SafeLink } from "@/components/SafeLink";

const coreFeatures = [
  {
    href: "/practice",
    eyebrow: "01 · CORE SKILL",
    title: "تمرین شنیداری",
    body: "هر روز کوتاه، تطبیقی و مستقیم روی مهارت‌های صدا تمرکز کن.",
    icon: Headphones,
    tone: "gold",
    cta: "شروع تمرین",
  },
  {
    href: "/assistant",
    eyebrow: "02 · AI MENTOR",
    title: "ArtistYar AI",
    body: "برای یادگیری، عیب‌یابی میکس و قدم بعدی از راه‌یار کمک بگیر.",
    icon: Bot,
    tone: "cyan",
    cta: "شروع گفتگو",
  },
  {
    href: "/music-analyzer",
    eyebrow: "03 · PRO ANALYSIS",
    title: "تحلیل موسیقی",
    body: "فایل، میکس، فرکانس و بالانس را با نگاه حرفه‌ای بررسی کن.",
    icon: BarChart3,
    tone: "blue",
    cta: "تحلیل فایل",
  },
  {
    href: "/courses",
    eyebrow: "04 · YOUR PATH",
    title: "مسیر پیشرفت",
    body: "سطح، دقت و تمرین پیشنهادی‌ات را در مسیر یادگیری دنبال کن.",
    icon: Dumbbell,
    tone: "violet",
    cta: "دیدن مسیر",
  },
] as const;

export function CoreFeatureRail() {
  return (
    <section className="core-rail container-ay" aria-labelledby="core-features-title">
      <div className="core-rail-heading">
        <div>
          <p className="eyebrow">/ THE ARTISTYAR METHOD</p>
          <h2 id="core-features-title" className="core-rail-title">
            از شنیدن تا ساختن،
            <br />
            <span>همه‌چیز در یک مسیر.</span>
          </h2>
        </div>
        <p className="core-rail-copy">چه بخواهی تمرین کنی، تحلیل بگیری یا سؤال بپرسی، از همین‌جا شروع کن.</p>
      </div>

      <div className="core-rail-grid">
        {coreFeatures.map(({ href, eyebrow, title, body, icon: Icon, tone, cta }) => (
          <SafeLink key={href} href={href} hard={href === "/assistant"} className={`core-feature core-feature-${tone}`}>
            <div className="core-feature-top">
              <span className="core-feature-icon"><Icon size={19} aria-hidden /></span>
              <ArrowLeft size={16} aria-hidden className="core-feature-arrow" />
            </div>
            <p className="core-feature-eyebrow">{eyebrow}</p>
            <h3>{title}</h3>
            <p className="core-feature-body">{body}</p>
            <span className="core-feature-cta">{cta} <span aria-hidden>←</span></span>
          </SafeLink>
        ))}
      </div>
    </section>
  );
}
