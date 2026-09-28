import AssistantClient from "./AssistantClient";

/**
 * Server-rendered document H1 so crawlers receive a real heading in the initial HTML.
 * AssistantClient provides the interactive chat chrome (its internal title stays visual).
 */
export default function AssistantPage() {
  return (
    <div>
      <header className="container-ay px-4 pt-6 sm:px-6 sm:pt-8">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold-500">راه‌یار AI</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-sand-50 sm:text-3xl">
          دستیار هوشمند آموزش موسیقی
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-ink-400">
          درباره تنظیم، میکس، مسترینگ و مسیر یادگیری سؤال بپرس؛ قدم‌به‌قدم راهنمایی بگیر.
        </p>
      </header>
      <AssistantClient />
    </div>
  );
}
