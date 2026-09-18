"use client";

import { useMemo, useRef, useState } from "react";
import { AudioLines, CheckCircle2, Download, FileAudio, Loader2, ShieldCheck, Sparkles, Upload, Waves } from "lucide-react";

const presets = [
  { id: "vocal_balanced", title: "Vocal + Instrumental", body: "UVR-based balanced ensemble for a strong all-around result.", tag: "Recommended" },
  { id: "vocal_clean", title: "Clean Vocal", body: "Prioritizes vocal isolation and reduced instrumental bleed.", tag: "Vocal" },
  { id: "instrumental_clean", title: "Clean Instrumental", body: "Prioritizes a clean instrumental / karaoke stem.", tag: "Instrumental" },
  { id: "instrumental_full", title: "Full Instrumental", body: "Preserves more of the instrumental body and fullness.", tag: "Instrumental" },
  { id: "karaoke", title: "Karaoke / Lead Vocal", body: "UVR-family karaoke separation with an additional vocal-focused stage.", tag: "Advanced" },
  { id: "htdemucs_ft", title: "4-Stem Demucs", body: "Vocals, drums, bass and other. Slower, but useful for stem work.", tag: "4-Stem" },
] as const;

export default function SeparatePage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preset, setPreset] = useState<(typeof presets)[number]["id"]>("vocal_balanced");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const size = useMemo(() => {
    if (!file) return "";
    const mb = file.size / 1024 / 1024;
    return (mb >= 10 ? mb.toFixed(0) : mb.toFixed(1)) + " MB";
  }, [file]);

  function chooseFile(next: File | null) {
    setError("");
    setStatus("");
    if (!next) return;
    if (!next.type.startsWith("audio/") && !/\.(wav|mp3|flac|m4a|aac|ogg|opus)$/i.test(next.name)) return setError("Please choose an audio file.");
    if (next.size > 250 * 1024 * 1024) return setError("Maximum file size is 250 MB.");
    setFile(next);
  }

  async function separate() {
    if (!file || busy) return;
    setBusy(true);
    setError("");
    setStatus("Uploading audio and starting the UVR inference worker…");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("preset", preset);
      const response = await fetch("/api/separation", { method: "POST", body: form });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Separation failed.");
      }
      setStatus("Separation complete. Preparing your stems…");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "artistyar-" + file.name.replace(/\.[^.]+$/, "") + "-stems.zip";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setStatus("Done — your separated stems are ready.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Separation failed.");
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container-ay section-space">
      <div className="mx-auto max-w-4xl">
        <div className="eyebrow">/ ARTISTYAR STEM SEPARATOR</div>
        <h1 className="section-title mt-4 max-w-3xl">Vocal و Instrumental<br /><span className="text-gold-400">با موتور مبتنی بر UVR.</span></h1>
        <p className="section-sub max-w-2xl">فایل صوتی را بده؛ پردازش روی worker جداگانه انجام می‌شود تا سایت سبک بماند و مدل‌های سنگین AI داخل مرورگر اجرا نشوند.</p>

        <div className="mt-10 grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
          <section className="rounded-[1.5rem] border border-white/[.08] bg-white/[.025] p-5 sm:p-7">
            <button type="button" onClick={() => inputRef.current?.click()} className="group flex min-h-64 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-black/20 px-6 text-center transition hover:border-gold-400/50 hover:bg-gold-400/[.035]">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gold-400/10 text-gold-300 transition group-hover:scale-105">{file ? <FileAudio size={25} /> : <Upload size={25} />}</span>
              <strong className="mt-5 text-base text-sand-50">{file ? file.name : "Drop audio here or choose a file"}</strong>
              <span className="mt-2 text-xs text-ink-500">{file ? size : "WAV · MP3 · FLAC · M4A · AAC · OGG · up to 250 MB"}</span>
            </button>
            <input ref={inputRef} type="file" accept="audio/*,.wav,.mp3,.flac,.m4a,.aac,.ogg,.opus" className="hidden" onChange={(event) => chooseFile(event.target.files?.[0] || null)} />
            <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-ink-500">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5"><ShieldCheck size={13} /> Server-side processing</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5"><Waves size={13} /> WAV output</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5"><Sparkles size={13} /> UVR-family models</span>
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-white/[.08] bg-white/[.025] p-5 sm:p-7">
            <div className="flex items-center gap-2 text-sm text-sand-50"><AudioLines size={17} className="text-gold-300" /> Separation mode</div>
            <div className="mt-4 grid gap-2">
              {presets.map((item) => (
                <button key={item.id} type="button" onClick={() => setPreset(item.id)} className={"rounded-xl border p-3 text-right transition " + (preset === item.id ? "border-gold-400/45 bg-gold-400/[.08]" : "border-white/[.07] bg-black/10 hover:border-white/15")}>
                  <div className="flex items-center justify-between gap-3"><strong className="text-sm text-sand-50">{item.title}</strong><span className="text-[10px] text-ink-500">{item.tag}</span></div>
                  <p className="mt-1 text-xs leading-6 text-ink-500">{item.body}</p>
                </button>
              ))}
            </div>
            <button type="button" disabled={!file || busy} onClick={separate} className="btn-primary mt-5 w-full gap-2 disabled:cursor-not-allowed disabled:opacity-40">{busy ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}{busy ? "در حال جداسازی…" : "شروع جداسازی"}</button>
            {status ? <div className="mt-4 rounded-xl border border-white/10 bg-black/15 p-3 text-xs leading-6 text-ink-300"><CheckCircle2 size={14} className="mb-1 inline text-gold-300" /> {status}</div> : null}
            {error ? <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[.04] p-3 text-xs leading-6 text-red-200">{error}</div> : null}
          </section>
        </div>

        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-white/[.06] bg-white/[.015] p-4 text-xs leading-6 text-ink-500"><Download size={15} className="mt-1 shrink-0 text-gold-300" />خروجی‌ها داخل یک ZIP تحویل داده می‌شوند. کیفیت به مدل، GPU، طول فایل و تنظیمات inference وابسته است؛ پردازش به worker AI جدا منتقل می‌شود.</div>
      </div>
    </main>
  );
}
