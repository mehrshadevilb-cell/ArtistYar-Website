import { communityLinkList } from "@/data/community";

type Props = {
  variant?: "cards" | "pills" | "list";
  className?: string;
  title?: string;
  subtitle?: string;
};

export function CommunityLinks({
  variant = "cards",
  className = "",
  title = "جامعه و منابع",
  subtitle = "کانال پلاگین، گروه پرسش‌وپاسخ و اینستاگرام رسمی مدرس.",
}: Props) {
  if (variant === "pills") {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`.trim()}>
        {communityLinkList.map((item) => (
          <a
            key={item.href}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className="ay-pressable inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-sand-100 transition hover:border-gold-500/35 hover:bg-gold-500/[0.08] hover:text-gold-300"
          >
            <span className="opacity-70" aria-hidden>
              {item.kind === "telegram" ? "✈" : "◎"}
            </span>
            {item.short}
          </a>
        ))}
      </div>
    );
  }

  if (variant === "list") {
    return (
      <ul className={`space-y-2 text-sm text-ink-300 ${className}`.trim()}>
        {communityLinkList.map((item) => (
          <li key={item.href}>
            <a
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-sm text-gold-400 transition-colors hover:text-gold-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
            >
              {item.title}
            </a>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section className={`community-links ${className}`.trim()} aria-labelledby="community-links-title">
      <div className="mb-6 max-w-2xl">
        <p className="eyebrow">/ همراهی بیرون از سایت</p>
        <h2 id="community-links-title" className="mt-3 text-2xl font-medium tracking-tight text-sand-50 sm:text-3xl">
          {title}
        </h2>
        {subtitle ? <p className="mt-3 text-sm leading-7 text-ink-400">{subtitle}</p> : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {communityLinkList.map((item) => (
          <a
            key={item.href}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className="card-ay ay-pressable group flex flex-col p-5 transition hover:border-gold-500/30"
          >
            <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-ink-500">
              {item.kind === "telegram" ? "Telegram" : "Instagram"}
            </span>
            <strong className="mt-3 text-base font-medium text-sand-50 group-hover:text-gold-300">{item.title}</strong>
            <p className="mt-2 flex-1 text-sm leading-7 text-ink-400">{item.description}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-gold-400">
              باز کردن {item.short}
              <span aria-hidden className="transition group-hover:-translate-x-0.5">
                ←
              </span>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
