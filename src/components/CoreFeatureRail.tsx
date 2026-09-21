import { ArrowLeft, BarChart3, Bot, Gamepad2, Wand2 } from "lucide-react";
import { SafeLink } from "@/components/SafeLink";

const coreFeatures = [
  {
    href: "/assistant",
    eyebrow: "01 · LIVE SYSTEM",
    title: "ArtistYar AI",
    body: "سؤال بپرس، عیب‌یابی میکس کن و قدم بعدی را با دستیار هوشمند راه‌یار پیدا کن.",
    icon: Bot,
    tone: "cyan",
    cta: "شروع گفتگو",
    soon: false,
  },
  {
    href: "/practice",
    eyebrow: "02 · PRACTICE ARCADE",
    title: "Practice Arcade",
    body: "تمرین شنیداری و مهارت‌های حرفه‌ای صدا در یک مسیر یکپارچه با XP و چالش روزانه.",
    icon: Gamepad2,
    tone: "gold",
    cta: "ورود به تمرین",
    soon: false,
  },
  {
    href: "/music-analyzer",
    eyebrow: "03 · PRO ANALYSIS",
    title: "Analyze Music",
    body: "فایل، میکس، فرکانس و بالانس را با نگاه حرفه‌ای بررسی و تحلیل کن.",
    icon: BarChart3,
    tone: "blue",
    cta: "تحلیل فایل",
    soon: false,
  },
  {
    href: "/ai-music",
    eyebrow: "04 · AI CREATE",
    title: "AI Music Generator",
    body: "ریف، بیس‌لاین، ملودی و فیل درام را با زبان طبیعی بخواه و بشنو.",
    icon: Wand2,
    tone: "violet",
    cta: "شروع تولید",
    soon: false,
  },
] as const;

export function CoreFeatureRail() {
  return (
    <section className="core-rail container-ay" aria-labelledby="core-features-title">
      <div className="core-rail-heading">
        <div>
          <p className="eyebrow">/ LIVE SYSTEM · ARTISTYAR METHOD</p>
          <h2 id="core-features-title" className="core-rail-title">
            از شنیدن تا ساختن،
            <br />
            <span>همه‌چیز در یک مسیر.</span>
          </h2>
        </div>
        <p className="core-rail-copy">
          ArtistYar AI، Practice Arcade، تحلیل موسیقی و ساخت با هوش مصنوعی — همه از همین‌جا.
        </p>
      </div>

      <div className="core-rail-grid">
        {coreFeatures.map(({ href, eyebrow, title, body, icon: Icon, tone, cta, soon }, index) =>
          soon ? (
            <div
              key={`${title}-${index}`}
              className={`core-feature core-feature-${tone} core-feature-soon`}
              aria-disabled="true"
            >
              <div className="core-feature-top">
                <span className="core-feature-icon">
                  <Icon size={19} aria-hidden />
                </span>
                <span className="core-feature-soon-badge">به‌زودی</span>
              </div>
              <p className="core-feature-eyebrow">{eyebrow}</p>
              <h3>{title}</h3>
              <p className="core-feature-body">{body}</p>
              <span className="core-feature-cta opacity-60">{cta}</span>
            </div>
          ) : (
            <SafeLink
              key={`${title}-${index}`}
              href={href}
              hard={href === "/assistant"}
              className={`core-feature core-feature-${tone}`}
            >
              <div className="core-feature-top">
                <span className="core-feature-icon">
                  <Icon size={19} aria-hidden />
                </span>
                <ArrowLeft size={16} aria-hidden className="core-feature-arrow" />
              </div>
              <p className="core-feature-eyebrow">{eyebrow}</p>
              <h3>{title}</h3>
              <p className="core-feature-body">{body}</p>
              <span className="core-feature-cta">
                {cta} <span aria-hidden>←</span>
              </span>
            </SafeLink>
          ),
        )}
      </div>
    </section>
  );
}
