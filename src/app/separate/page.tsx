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
    title: "Standard — Vocal / Instrumental",
    body: "Fast 2-stem separation for vocals and instrumental.",
    tag: "Standard",
  },
  {
    id: "demucs_mdx_hq5",
    title: "HQ Hybrid — Demucs + MDX Inst HQ 5",
    body: "Demucs FT vocals + UVR-MDX-NET Inst HQ 5 instrumental workflow.",
    tag: "HQ Hybrid",
  },
  {
    id: "full_stem",
    title: "Full Stem — Demucs 4-Stem",
    body: "Full 4-stem split: Vocals, Drums, Bass and Other.",
    tag: "Full Stem",
  },
] as const;

type Progress = {
  phase?: string;
  loaded?: number;
  total?: number;
  segment?: number;
  totalSegments?: number;
};

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
        script.onerror = () => reject(new Error("Separator runtime could not be loaded."));
        document.head.appendChild(script);
      });

    void Promise.all([
      load("https://cdn.jsdelivr.net/npm/jszip@3.10.2/dist/jszip.min.js"),
      load("/separator/browser-separator.js?v=20260918-2"),
    ]).catch(() => {
      setError("Browser separation runtime could not be loaded. Please refresh the page.");
    });
  }, []);

  const size = useMemo(() => {
    if (!file) return "";
    const mb = file.size / 1024 / 1024;
    return (mb >= 10 ? mb.toFixed(0) : mb.toFixed(1)) + " MB";
  }, [file]);

  function chooseFile(next: File | null) {
    setError("");
    setStatus("");
    if (!next) return;

    if (
      !next.type.startsWith("audio/") &&
      !/\.(wav|mp3|flac|m4a|aac|ogg|opus)$/i.test(next.name)
    ) {
      setError("Please choose a supported audio file.");
      return;
    }

    if (next.size > 250 * 1024 * 1024) {
      setError("Maximum file size is 250 MB.");
      return;
    }

    setFile(next);
  }

  async function separate() {
    if (!file || busy) return;

    setBusy(true);
    setError("");

    try {
      const browser = (
        window as Window & {
          artistYarBrowserSeparate?: (
            file: File,
            progress: (p: Progress) => void,
            mode?: "standard" | "full",
          ) => Promise<Blob>;
        }
      ).artistYarBrowserSeparate;

      if (preset === "demucs_mdx_hq5") {
        setStatus("Preparing HQ Hybrid — Demucs + MDX Inst HQ 5…");

        const form = new FormData();
        form.append("file", file);
        form.append("preset", "demucs_mdx_hq5");

        const response = await fetch("/api/separation", {
          method: "POST",
          body: form,
          cache: "no-store",
        });

        const contentType = response.headers.get("content-type") || "";
        if (!response.ok) {
          let message = "HQ Hybrid separation failed.";
          if (contentType.includes("application/json")) {
            const payload = (await response.json()) as { error?: string };
            if (payload.error) message = payload.error;
          } else {
            const text = await response.text();
            if (text) message = text;
          }
          throw new Error(message);
        }

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

        setStatus("Done — HQ Hybrid separation complete.");
        return;
      }

      if (!browser) {
        throw new Error("Browser separator is still loading. Please wait a moment and try again.");
      }

      const mode = preset === "full_stem" ? "full" : "standard";
      setStatus(
        ("gpu" in navigator)
          ? (mode === "full"
              ? "Preparing Full Stem on your device GPU…"
              : "Preparing Standard Vocal / Instrumental on your device GPU…")
          : (mode === "full"
              ? "WebGPU is unavailable; trying Full Stem CPU fallback…"
              : "WebGPU is unavailable; trying Standard CPU fallback…"),
      );

      const blob = await browser(file, (p) => {
        if (p.phase === "model") {
          const pct = p.total
            ? Math.round(((p.loaded || 0) / p.total) * 100)
            : 0;
          setStatus("Loading separation model on your device… " + pct + "%");
        } else if (p.segment) {
          setStatus(
            "Separating " +
              (mode === "full" ? "4 stems" : "vocal / instrumental") +
              " on your " +
              (("gpu" in navigator) ? "GPU" : "CPU") +
              ": segment " +
              p.segment +
              " / " +
              (p.totalSegments || "?") +
              "…",
          );
        }
      });

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download =
        "artistyar-" +
        file.name.replace(/\.[^.]+$/, "") +
        (mode === "full" ? "-full-stem.zip" : "-vocal-inst.zip");
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      setStatus(
        mode === "full"
          ? "Done — Full Stem separation complete. Vocals, drums, bass and other were processed locally."
          : "Done — Standard Vocal / Instrumental separation complete. Your audio was processed locally.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Separation failed.");
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  const selectedPreset = presets.find((item) => item.id === preset) ?? presets[0];

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
            <Waves className="h-7 w-7 text-amber-300" />
          </div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.3em] text-amber-300/80">
            ArtistYar Audio Lab
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
            AI Stem Separation
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-white/55 sm:text-base">
            Choose a separation mode, then process your audio with the selected engine.
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
                    Click or drop another file
                  </span>
                </>
              ) : (
                <>
                  <Upload className="mb-5 h-12 w-12 text-white/70" />
                  <p className="text-lg font-medium">Drop your audio here</p>
                  <p className="mt-2 text-sm text-white/45">
                    WAV, MP3, FLAC, M4A, AAC, OGG or OPUS · up to 250 MB
                  </p>
                  <span className="mt-5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-white/65">
                    Choose audio file
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
                  Processing…
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
              <h2 className="font-semibold">Separation Engine</h2>
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
                    "w-full rounded-2xl border p-4 text-left transition " +
                    (preset === item.id
                      ? "border-amber-300/35 bg-amber-300/[0.06]"
                      : "border-white/10 bg-black/20 hover:border-white/20")
                  }
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium leading-5">{item.title}</span>
                    <span className="shrink-0 rounded-full border border-amber-300/20 px-2 py-1 text-[10px] uppercase tracking-wider text-amber-200/80">
                      {item.tag}
                    </span>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-white/45">{item.body}</p>
                </button>
              ))}
            </div>

            <div className="mt-5 space-y-3 border-t border-white/10 pt-5 text-xs text-white/45">
              <div className="flex gap-3">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-300/80" />
                <span>
                  Standard and Full Stem browser modes keep the source audio on your device.
                </span>
              </div>
              <div className="flex gap-3">
                <Download className="h-4 w-4 shrink-0 text-white/60" />
                <span>
                  Results are packaged locally as WAV files inside a ZIP. HQ Hybrid uses the server worker.
                </span>
              </div>
              <div className="flex gap-3">
                <Sparkles className="h-4 w-4 shrink-0 text-amber-300/80" />
                <span>WebGPU is used when the browser exposes a compatible GPU.</span>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
