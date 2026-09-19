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
    body: "بهترین کیفیت موجود با مدل Demucs روی دستگاه شما؛ فایل صوتی به سرور ارسال نمی‌شود.",
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

async function downloadZip(blob: Blob, filename: string) {
  if (blob.size <= 22) throw new Error("فایل ZIP خروجی خالی است؛ پردازش را دوباره امتحان کنید.");
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

async function validateZip(blob: Blob, expectedNames: string[]) {
  if (blob.size <= 22) throw new Error("فایل ZIP خروجی خالی است؛ پردازش را دوباره امتحان کنید.");
  const head = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
  if (head[0] !== 0x50 || head[1] !== 0x4b || head[2] !== 0x03 || head[3] !== 0x04) {
    throw new Error("فایل ZIP خروجی معتبر نیست.");
  }
  const tailStart = Math.max(0, blob.size - 65_557);
  const tail = new Uint8Array(await blob.slice(tailStart).arrayBuffer());
  const tailView = new DataView(tail.buffer, tail.byteOffset, tail.byteLength);
  let eocd = -1;
  for (let i = tail.length - 22; i >= 0; i -= 1) {
    if (tailView.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("فایل ZIP فاقد Central Directory است.");
  const count = tailView.getUint16(eocd + 10, true);
  const centralSize = tailView.getUint32(eocd + 12, true);
  const centralOffset = tailView.getUint32(eocd + 16, true);
  if (count !== expectedNames.length || centralOffset + centralSize > blob.size) {
    throw new Error("تعداد فایل‌های ZIP با خروجی مورد انتظار مطابقت ندارد.");
  }
  const central = new Uint8Array(await blob.slice(centralOffset, centralOffset + centralSize).arrayBuffer());
  const view = new DataView(central.buffer, central.byteOffset, central.byteLength);
  const names: string[] = [];
  let cursor = 0;
  for (let i = 0; i < count; i += 1) {
    if (view.getUint32(cursor, true) !== 0x02014b50) throw new Error("Central Directory فایل ZIP خراب است.");
    const nameLength = view.getUint16(cursor + 28, true);
    names.push(new TextDecoder().decode(central.slice(cursor + 46, cursor + 46 + nameLength)));
    cursor += 46 + nameLength + view.getUint16(cursor + 30, true) + view.getUint16(cursor + 32, true);
  }
  if (expectedNames.some((name) => !names.includes(name))) throw new Error("همه فایل‌های استم داخل ZIP ساخته نشده‌اند.");
}

export default function SeparatePage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preset, setPreset] = useState<(typeof presets)[number]["id"]>(presets[0].id);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

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

    void load("/separator/browser-separator.js?v=20260919-4").catch(() => {
      setError("موتور تفکیک صدا بارگذاری نشد. لطفاً صفحه را دوباره بارگذاری کنید.");
    });
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

    setStatus("در حال ساخت و اعتبارسنجی ZIP خروجی روی دستگاه…");
    await validateZip(blob, mode === "full" ? ["vocals.wav", "drums.wav", "bass.wav", "other.wav"] : ["vocals.wav", "instrumental.wav"]);
    setStatus("در حال آماده‌سازی دانلود ZIP…");
    await downloadZip(blob, "artistyar-" + file.name.replace(/\.[^.]+$/, "") + downloadSuffix);
    setStatus(doneMessage);
  }

  async function separate() {
    if (!file || busy) return;

    setBusy(true);
    setError("");

    try {
      const browser = (window as Window & { artistYarBrowserSeparate?: BrowserSeparateFn })
        .artistYarBrowserSeparate;

      if (!browser) {
        throw new Error("موتور تفکیک صدا هنوز در حال بارگذاری است. چند لحظه صبر کنید و دوباره تلاش کنید.");
      }

      await runBrowser(
        browser,
        preset === "full_stem" ? "full" : "standard",
        preset === "full_stem" ? "-full-stem.zip" : preset === "demucs_mdx_hq5" ? "-hq-local.zip" : "-vocal-inst.zip",
        preset === "full_stem"
          ? "انجام شد — تفکیک کامل روی دستگاه شما انجام شد. وکال، درام، بیس و سایر سازها در ZIP قرار گرفتند."
          : preset === "demucs_mdx_hq5"
            ? "انجام شد — تفکیک HQ روی دستگاه شما انجام شد و ZIP آماده دانلود است."
            : "انجام شد — تفکیک استاندارد روی دستگاه شما انجام شد و ZIP آماده دانلود است.",
      );
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err || "");
      let msg = raw || "تفکیک صدا با خطا مواجه شد.";
      if (/Aborted|out of memory|OOM|memory|RuntimeError|grow_memory/i.test(raw)) {
        msg =
          "حافظه مرورگر برای این فایل کافی نبود. فایل کوتاه‌تر (زیر ۹۰ ثانیه) امتحان کنید، تب‌های دیگر را ببندید، یا حالت HQ را انتخاب کنید.";
      }
      setError(msg);
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
            هر سه موتور مستقیماً روی دستگاه شما پردازش می‌شوند؛ فایل صوتی به سرور ارسال نمی‌شود و خروجی به‌صورت ZIP دانلود می‌شود.
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
                  <Loader2 className="h-4 w-4 shrink-0 text-amber-300" />
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
                  {item.id === "demucs_mdx_hq5" ? (
                    <p className="mt-2 text-[11px] leading-5 text-emerald-200/80">
                      پردازش کامل روی دستگاه شما انجام می‌شود و فایل صوتی ارسال نمی‌شود.
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
