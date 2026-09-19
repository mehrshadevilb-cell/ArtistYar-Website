"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AudioLines,
  CheckCircle2,
  Download,
  FileAudio,
  Loader2,
  ShieldCheck,
  Sparkles,
  Upload,
  Waves,
} from "lucide-react";

const LOCAL_MAX_BYTES = 30 * 1024 * 1024;

const presets = [
  {
    id: "standard_vocal_inst",
    title: "استاندارد — وکال / بی‌کلام",
    body: "تفکیک سریع دو بخشی برای وکال و موسیقی بی‌کلام. کاملاً روی دستگاه شما.",
    tag: "استاندارد",
  },
  {
    id: "demucs_mdx_hq5",
    title: "HQ — وکال / بی‌کلام حرفه‌ای",
    body: "بهترین کیفیت موجود: اگر سرور UVR فعال باشد هیبرید سروری، وگرنه Demucs حرفه‌ای روی دستگاه شما.",
    tag: "HQ",
  },
  {
    id: "full_stem",
    title: "تفکیک کامل — Demucs چهار استم",
    body: "تفکیک کامل به ۴ بخش: وکال، درام، بیس و سایر سازها. روی دستگاه شما.",
    tag: "۴ استم",
  },
] as const;

type Progress = {
  phase?: string;
  loaded?: number;
  total?: number;
  segment?: number;
  totalSegments?: number;
};

type BrowserSeparateFn = (
  file: File,
  progress: (p: Progress) => void,
  mode?: "standard" | "full",
) => Promise<Blob>;

export default function SeparatePage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preset, setPreset] = useState<(typeof presets)[number]["id"]>(presets[0].id);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [serverReady, setServerReady] = useState<boolean | null>(null);

  useEffect(() => {
    const load = (src: string) =>
      new Promise<void>((resolve, reject) => {
        const existing = document.querySelector('script[src="' + src + '"]');
        if (existing) {
          resolve();
          return;
        }
        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("اجرای موتور تفکیک صدا بارگذاری نشد."));
        document.head.appendChild(script);
      });

    void Promise.all([
      load("https://cdn.jsdelivr.net/npm/jszip@3.10.2/dist/jszip.min.js"),
      load("/separator/browser-separator.js?v=20260918-4"),
    ]).catch(() => {
      setError("موتور تفکیک صدا بارگذاری نشد. لطفاً صفحه را دوباره بارگذاری کنید.");
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/separation", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!cancelled) setServerReady(Boolean(data?.configured));
      } catch {
        if (!cancelled) setServerReady(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const size = useMemo(() => {
    if (!file) return "";
    const mb = file.size / 1024 / 1024;
    return (mb >= 10 ? mb.toFixed(0) : mb.toFixed(1)) + " مگابایت";
  }, [file]);

  function chooseFile(next: File | null) {
    setError("");
    setStatus("");
    if (!next) return;

    if (
      !next.type.startsWith("audio/") &&
      !/\.(wav|mp3|flac|m4a|aac|ogg|opus)$/i.test(next.name)
    ) {
      setError("لطفاً یک فایل صوتی پشتیبانی‌شده انتخاب کنید.");
      return;
    }

    if (next.size > 250 * 1024 * 1024) {
      setError("حداکثر حجم فایل ۲۵۰ مگابایت است.");
      return;
    }

    setFile(next);
  }

  async function runBrowser(
    browser: BrowserSeparateFn,
    mode: "standard" | "full",
    downloadSuffix: string,
    doneMessage: string,
  ) {
    if (!file) throw new Error("فایل انتخاب نشده است.");

    setStatus(
      ("gpu" in navigator)
        ? mode === "full"
          ? "در حال آماده‌سازی تفکیک کامل با پردازنده گرافیکی دستگاه…"
          : "در حال آماده‌سازی تفکیک وکال / بی‌کلام با پردازنده گرافیکی دستگاه…"
        : mode === "full"
          ? "پردازنده گرافیکی در دسترس نیست؛ در حال استفاده از پردازنده دستگاه برای تفکیک کامل…"
          : "پردازنده گرافیکی در دسترس نیست؛ در حال استفاده از پردازنده دستگاه برای تفکیک وکال / بی‌کلام…",
    );

    const blob = await browser(
      file,
      (p) => {
        if (p.phase === "model") {
          const pct = p.total ? Math.round(((p.loaded || 0) / p.total) * 100) : 0;
          setStatus("در حال دریافت و آماده‌سازی مدل تفکیک روی دستگاه… " + pct + "٪");
        } else if (p.segment) {
          setStatus(
            "در حال تفکیک " +
              (mode === "full" ? "۴ استم" : "وکال / بی‌کلام") +
              " با " +
              (("gpu" in navigator) ? "پردازنده گرافیکی" : "پردازنده مرکزی") +
              " دستگاه: بخش " +
              p.segment +
              " از " +
              (p.totalSegments || "?") +
              "…",
          );
        }
      },
      mode,
    );

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "artistyar-" + file.name.replace(/\.[^.]+$/, "") + downloadSuffix;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setStatus(doneMessage);
  }

  async function separate() {
    if (!file || busy) return;

    setBusy(true);
    setError("");

    try {
      // Browser Demucs expands compressed audio to large Float32 PCM buffers and
      // keeps multiple stem buffers alive while creating the ZIP. Large uploads
      // therefore can exhaust browser memory and surface as opaque AbortError/
      // WASM failures. Keep large files on the server path instead of crashing
      // the tab.
      if (file.size > LOCAL_MAX_BYTES && preset !== "demucs_mdx_hq5") {
        throw new Error("این فایل برای پردازش محلی بزرگ است. برای فایل‌های بالای ۳۰ مگابایت، حالت HQ سروری را انتخاب کنید.");
      }

      if (file.size > LOCAL_MAX_BYTES && preset === "demucs_mdx_hq5" && !serverReady) {
        throw new Error("فایل بزرگ است و موتور سروری UVR در دسترس نیست. برای جلوگیری از خطای حافظه، فایل را به زیر ۳۰ مگابایت کاهش دهید یا بعداً دوباره امتحان کنید.");
      }
      const browser = (window as Window & { artistYarBrowserSeparate?: BrowserSeparateFn })
        .artistYarBrowserSeparate;

      // HQ: try server first if configured, otherwise seamless on-device fallback
      if (preset === "demucs_mdx_hq5") {
        if (serverReady) {
          setStatus("در حال آماده‌سازی تفکیک HQ روی سرور…");
          const form = new FormData();
          form.append("file", file);
          form.append("preset", "demucs_mdx_hq5");

          const response = await fetch("/api/separation", {
            method: "POST",
            body: form,
            cache: "no-store",
          });

          if (response.ok) {
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download =
              "artistyar-" + file.name.replace(/\.[^.]+$/, "") + "-hq-hybrid.zip";
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(url);
            setStatus("انجام شد — تفکیک HQ سروری با موفقیت کامل شد.");
            return;
          }

          if (file.size > LOCAL_MAX_BYTES) {
            throw new Error("پردازش سروری ناموفق بود و فایل برای پردازش محلی بزرگ است. لطفاً بعداً دوباره تلاش کنید یا فایل را به زیر ۳۰ مگابایت کاهش دهید.");
          }
          setStatus("سرور در دسترس نبود؛ ادامه با Demucs حرفه‌ای روی دستگاه…");
        } else {
          setStatus("در حال تفکیک HQ با Demucs حرفه‌ای روی دستگاه شما…");
        }

        if (!browser) {
          throw new Error("موتور تفکیک صدا هنوز در حال بارگذاری است. چند لحظه صبر کنید و دوباره تلاش کنید.");
        }

        await runBrowser(
          browser,
          "standard",
          "-hq-local.zip",
          "انجام شد — تفکیک HQ روی دستگاه با موفقیت انجام شد (وکال + بی‌کلام).",
        );
        return;
      }

      if (!browser) {
        throw new Error("موتور تفکیک صدا هنوز در حال بارگذاری است. چند لحظه صبر کنید و دوباره تلاش کنید.");
      }

      if (preset === "full_stem") {
        await runBrowser(
          browser,
          "full",
          "-full-stem.zip",
          "انجام شد — تفکیک کامل با موفقیت انجام شد. وکال، درام، بیس و سایر سازها در فایل خروجی قرار گرفتند.",
        );
        return;
      }

      await runBrowser(
        browser,
        "standard",
        "-vocal-inst.zip",
        "انجام شد — تفکیک استاندارد وکال / بی‌کلام با موفقیت انجام شد و فایل‌ها به‌صورت محلی پردازش شدند.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "تفکیک صدا با خطا مواجه شد.");
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  const selectedPreset = presets.find((item) => item.id === preset) ?? presets[0];

  return (
    <main dir="rtl" className="min-h-screen bg-[#050505] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
            <Waves className="h-7 w-7 text-amber-300" />
          </div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.3em] text-amber-300/80">
            آزمایشگاه صدای آرتیست‌یار
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
            جداسازی وکال
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-white/55 sm:text-base">
            هر سه حالت بدون نیاز به سرور کار می‌کنند. اگر سرور UVR فعال باشد، حالت HQ از آن استفاده می‌کند؛ در غیر این صورت روی دستگاه شما پردازش می‌شود.
          </p>
        </div>

        <section className="grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/30 sm:p-7">
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              onDragEnter={(e) => {
                e.preventDefault();
                if (!busy) setDragging(true);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                if (!busy) chooseFile(e.dataTransfer.files?.[0] ?? null);
              }}
              className={
                "flex min-h-72 w-full flex-col items-center justify-center rounded-2xl border border-dashed px-6 text-center transition " +
                (dragging
                  ? "border-amber-300/70 bg-amber-300/[0.06]"
                  : "border-white/15 bg-black/20 hover:border-white/30 hover:bg-white/[0.025]")
              }
            >
              <input
                ref={inputRef}
                type="file"
                accept="audio/*,.wav,.mp3,.flac,.m4a,.aac,.ogg,.opus"
                className="hidden"
                onChange={(e) => chooseFile(e.target.files?.[0] ?? null)}
              />

              {file ? (
                <>
                  <FileAudio className="mb-5 h-12 w-12 text-amber-300" />
                  <p className="max-w-full truncate text-lg font-medium">{file.name}</p>
                  <p className="mt-2 text-sm text-white/45">{size}</p>
                  <span className="mt-5 rounded-full border border-white/10 px-4 py-2 text-xs text-white/60">
                    برای انتخاب فایل دیگر کلیک کنید یا فایل را اینجا رها کنید
                  </span>
                </>
              ) : (
                <>
                  <Upload className="mb-5 h-12 w-12 text-white/70" />
                  <p className="text-lg font-medium">فایل صوتی را اینجا رها کنید</p>
                  <p className="mt-2 text-sm text-white/45">
                    WAV، MP3، FLAC، M4A، AAC، OGG یا OPUS · حداکثر ۲۵۰ مگابایت
                  </p>
                  <span className="mt-5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-white/65">
                    انتخاب فایل صوتی
                  </span>
                </>
              )}
            </button>

            {error && (
              <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            {status && (
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70">
                {busy ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-amber-300" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
                )}
                <span>{status}</span>
              </div>
            )}

            <button
              type="button"
              disabled={!file || busy}
              onClick={separate}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-35"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  در حال پردازش…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {selectedPreset.title}
                </>
              )}
            </button>
          </div>

          <aside className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-7">
            <div className="mb-5 flex items-center gap-3">
              <AudioLines className="h-5 w-5 text-amber-300" />
              <h2 className="font-semibold">موتور تفکیک</h2>
            </div>

            <div className="space-y-3">
              {presets.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setPreset(item.id);
                    setError("");
                    setStatus("");
                  }}
                  className={
                    "w-full rounded-2xl border p-4 text-right transition " +
                    (preset === item.id
                      ? "border-amber-300/35 bg-amber-300/[0.06]"
                      : "border-white/10 bg-black/20 hover:border-white/20")
                  }
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium leading-5">{item.title}</span>
                    <span className="shrink-0 rounded-full border border-amber-300/20 px-2 py-1 text-[10px] tracking-wider text-amber-200/80">
                      {item.tag}
                    </span>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-white/45">{item.body}</p>
                  {item.id === "demucs_mdx_hq5" && serverReady === false ? (
                    <p className="mt-2 text-[11px] leading-5 text-emerald-200/80">
                      بدون سرور هم کار می‌کند — پردازش روی دستگاه شما.
                    </p>
                  ) : null}
                  {item.id === "demucs_mdx_hq5" && serverReady === true ? (
                    <p className="mt-2 text-[11px] leading-5 text-emerald-200/80">
                      سرور UVR فعال است — کیفیت هیبرید سروری.
                    </p>
                  ) : null}
                </button>
              ))}
            </div>

            <div className="mt-5 space-y-3 border-t border-white/10 pt-5 text-xs text-white/45">
              <div className="flex gap-3">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-300/80" />
                <span>
                  در حالت‌های محلی، فایل اصلی روی دستگاه شما باقی می‌ماند و به سرور ارسال نمی‌شود.
                </span>
              </div>
              <div className="flex gap-3">
                <Download className="h-4 w-4 shrink-0 text-white/60" />
                <span>خروجی‌ها به‌صورت فایل‌های WAV داخل یک فایل ZIP آماده می‌شوند.</span>
              </div>
              <div className="flex gap-3">
                <Sparkles className="h-4 w-4 shrink-0 text-amber-300/80" />
                <span>
                  اگر مرورگر پردازنده گرافیکی سازگار داشته باشد، برای پردازش محلی از آن استفاده می‌شود.
                </span>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
