"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, AlertCircle, Copy, Check } from "lucide-react";

type Mode =
  | "write_full"
  | "write_chorus"
  | "write_verse"
  | "improve"
  | "rhyme"
  | "title_ideas"
  | "structure";

const MODES: { id: Mode; label: string }[] = [
  { id: "write_full", label: "ترانه کامل" },
  { id: "write_chorus", label: "کورس" },
  { id: "write_verse", label: "ورس" },
  { id: "improve", label: "بهبود" },
  { id: "rhyme", label: "قافیه" },
  { id: "title_ideas", label: "عنوان" },
  { id: "structure", label: "ساختار" },
];

const GENRES = [
  { id: "", label: "ژانر (اختیاری)" },
  { id: "pop", label: "پاپ" },
  { id: "hiphop", label: "هیپ‌هاپ" },
  { id: "rock", label: "راک" },
  { id: "traditional", label: "سنتی" },
  { id: "electronic", label: "الکترونیک" },
  { id: "rnb", label: "R&B" },
  { id: "folk", label: "فولک" },
  { id: "other", label: "دیگر" },
];

const TONES = [
  { id: "", label: "حس (اختیاری)" },
  { id: "romantic", label: "عاشقانه" },
  { id: "sad", label: "غمگین" },
  { id: "hopeful", label: "امیدوار" },
  { id: "angry", label: "عصبانی" },
  { id: "playful", label: "شوخ" },
  { id: "epic", label: "حماسی" },
  { id: "neutral", label: "خنثی" },
];

type ApiOk = {
  ok: true;
  text: string;
  provider: string;
  model: string;
  latencyMs: number;
  requestId: string;
};

type ApiErr = {
  ok: false;
  error: string;
  code?: string;
  retryable?: boolean;
  requestId?: string;
};

const DRAFT_KEY = "hitnevis_draft_v1";

export default function HitNevisClient() {
  const [mode, setMode] = useState<Mode>("write_full");
  const [topic, setTopic] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [genre, setGenre] = useState("");
  const [tone, setTone] = useState("");
  const [constraints, setConstraints] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryable, setRetryable] = useState(false);
  const [meta, setMeta] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as {
        topic?: string;
        lyrics?: string;
        output?: string;
        mode?: Mode;
      };
      if (d.topic) setTopic(d.topic);
      if (d.lyrics) setLyrics(d.lyrics);
      if (d.output) setOutput(d.output);
      if (d.mode) setMode(d.mode);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ topic, lyrics, output, mode }),
      );
    } catch {
      /* ignore */
    }
  }, [topic, lyrics, output, mode]);

  const generate = useCallback(async () => {
    setError(null);
    setRetryable(false);
    setMeta(null);
    setLoading(true);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const res = await fetch("/api/hitnevis/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          topic: topic.trim() || undefined,
          existingLyrics: lyrics.trim() || undefined,
          genre: genre || undefined,
          tone: tone || undefined,
          constraints: constraints.trim() || undefined,
          language: "fa",
        }),
        signal: ac.signal,
        cache: "no-store",
      });

      const data = (await res.json()) as ApiOk | ApiErr;

      if (!data.ok) {
        setError(data.error || "خطای ناشناخته");
        setRetryable(Boolean(data.retryable));
        return;
      }

      setOutput(data.text);
      setMeta(`${data.provider} · ${data.model} · ${data.latencyMs}ms · ${data.requestId}`);
    } catch (e) {
      if ((e as Error)?.name === "AbortError") {
        setError("درخواست لغو شد.");
        setRetryable(true);
      } else {
        setError("ارتباط با سرور برقرار نشد. متنت حفظ شده — دوباره امتحان کن.");
        setRetryable(true);
      }
    } finally {
      setLoading(false);
    }
  }, [mode, topic, lyrics, genre, tone, constraints]);

  const copyOut = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const applyToLyrics = () => {
    if (!output) return;
    setLyrics(output);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card-ay space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={`rounded-full px-3 py-1.5 text-xs transition ${
                mode === m.id
                  ? "bg-gold-400/20 text-gold-200 ring-1 ring-gold-400/40"
                  : "bg-ink-900/60 text-ink-400 hover:text-sand-100"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <label className="block text-xs text-ink-400">
          موضوع / حس
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            maxLength={500}
            placeholder="مثلاً: جدایی در شب بارانی"
            className="mt-1.5 w-full rounded-xl border border-ink-700/80 bg-ink-950/80 px-3 py-2.5 text-sm text-sand-50 outline-none focus:border-gold-400/40"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs text-ink-400">
            ژانر
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-ink-700/80 bg-ink-950/80 px-3 py-2.5 text-sm text-sand-50 outline-none"
            >
              {GENRES.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-ink-400">
            حس
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-ink-700/80 bg-ink-950/80 px-3 py-2.5 text-sm text-sand-50 outline-none"
            >
              {TONES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block text-xs text-ink-400">
          متن فعلی (برای بهبود / قافیه)
          <textarea
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            rows={8}
            maxLength={6000}
            placeholder="متن ترانه را اینجا بگذار…"
            className="mt-1.5 w-full resize-y rounded-xl border border-ink-700/80 bg-ink-950/80 px-3 py-2.5 text-sm leading-7 text-sand-50 outline-none focus:border-gold-400/40"
            dir="auto"
          />
        </label>

        <label className="block text-xs text-ink-400">
          محدودیت‌ها (اختیاری)
          <input
            value={constraints}
            onChange={(e) => setConstraints(e.target.value)}
            maxLength={400}
            placeholder="مثلاً: بدون کلمات انگلیسی، قافیه غمگین"
            className="mt-1.5 w-full rounded-xl border border-ink-700/80 bg-ink-950/80 px-3 py-2.5 text-sm text-sand-50 outline-none focus:border-gold-400/40"
          />
        </label>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            disabled={loading}
            onClick={generate}
            className="inline-flex items-center gap-2 rounded-xl bg-gold-400/90 px-4 py-2.5 text-sm font-medium text-ink-950 transition hover:bg-gold-300 disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? "در حال نوشتن…" : "تولید با هیت‌نویس"}
          </button>
          {loading && (
            <button
              type="button"
              onClick={() => abortRef.current?.abort()}
              className="rounded-xl border border-ink-600 px-3 py-2.5 text-xs text-ink-300"
            >
              لغو
            </button>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-950/40 px-3 py-3 text-sm text-red-100"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div>
              <p>{error}</p>
              {retryable && (
                <button
                  type="button"
                  onClick={generate}
                  className="mt-2 text-xs text-gold-300 underline"
                >
                  تلاش دوباره
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="card-ay flex min-h-[320px] flex-col p-5 sm:p-6">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-sand-100">خروجی</h2>
          <div className="flex gap-2">
            {output && (
              <>
                <button
                  type="button"
                  onClick={copyOut}
                  className="inline-flex items-center gap-1 rounded-lg border border-ink-600 px-2 py-1 text-xs text-ink-300"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "کپی شد" : "کپی"}
                </button>
                <button
                  type="button"
                  onClick={applyToLyrics}
                  className="rounded-lg border border-ink-600 px-2 py-1 text-xs text-ink-300"
                >
                  انتقال به متن فعلی
                </button>
              </>
            )}
          </div>
        </div>
        <pre
          className="flex-1 whitespace-pre-wrap rounded-xl bg-ink-950/60 p-4 text-sm leading-8 text-sand-50"
          dir="auto"
        >
          {output || (loading ? "…" : "خروجی اینجا نمایش داده می‌شود.")}
        </pre>
        {meta && <p className="mt-2 text-[10px] text-ink-600">{meta}</p>}
      </section>
    </div>
  );
}
