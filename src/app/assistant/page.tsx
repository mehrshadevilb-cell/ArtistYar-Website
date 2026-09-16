"use client";

import { FormEvent, useMemo, useState } from "react";
import { SectionHeading } from "@/components/SectionHeading";

type Msg = { role: "user" | "assistant"; text: string };

export default function AssistantPage() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text: "سلام؛ من دستیار آموزشی آرتیست‌یار هستم (همان موتور ربات راه‌یار). درباره دوره‌ها، کلاس‌ها و موضوعات موسیقی بپرس.",
    },
  ]);
  const [busy, setBusy] = useState(false);
  const clientId = useMemo(() => {
    if (typeof window === "undefined") return "ssr";
    const key = "ay_assistant_client";
    let id = localStorage.getItem(key);
    if (!id) {
      id = `c_${Math.random().toString(36).slice(2)}_${Date.now()}`;
      localStorage.setItem(key, id);
    }
    return id;
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const message = String(fd.get("message") || "").trim();
    if (!message || busy) return;
    e.currentTarget.reset();
    setMessages((m) => [...m, { role: "user", text: message }]);
    setBusy(true);
    try {
      const res = await fetch("/api/rahyar/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, client_id: clientId }),
      });
      const data = await res.json();
      const reply =
        data.reply ||
        data.error ||
        data.detail ||
        "پاسخی دریافت نشد. اتصال به ربات را بررسی کنید.";
      setMessages((m) => [...m, { role: "assistant", text: String(reply) }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "خطای شبکه. دوباره تلاش کنید." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="container-ay py-16">
      <SectionHeading
        eyebrow="AI Assistant"
        title="دستیار آموزشی"
        subtitle="همان Chat Assistant ربات راه‌یار — کاتالوگ، دانش آکادمی و پاسخ فارسی مینیمال."
      />

      <div className="card-ay mx-auto mt-10 flex max-w-2xl flex-col overflow-hidden">
        <div className="max-h-[28rem] space-y-3 overflow-y-auto p-5">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`rounded-2xl px-4 py-3 text-sm leading-7 ${
                m.role === "user"
                  ? "mr-8 bg-gold-500/15 text-sand-50"
                  : "ml-8 bg-white/[0.04] text-ink-300"
              }`}
            >
              {m.text}
            </div>
          ))}
        </div>
        <form
          onSubmit={onSubmit}
          className="flex gap-2 border-t border-white/[0.06] p-4"
        >
          <input
            className="input-ay flex-1"
            name="message"
            placeholder="سؤالت را بنویس..."
            disabled={busy}
            maxLength={1000}
          />
          <button type="submit" className="btn-primary !px-5" disabled={busy}>
            {busy ? "..." : "ارسال"}
          </button>
        </form>
      </div>
    </section>
  );
}
