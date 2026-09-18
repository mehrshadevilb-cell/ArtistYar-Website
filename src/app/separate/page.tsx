"use client";

import { useMemo, useRef, useState, useEffect } from "react";
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
  const [dragging, setDragging] = useState(false);\n\n  useEffect(() => {\n    const load = (src: string) => new Promise<void>((resolve, reject) => {\n      const script = document.createElement("script"); script.src = src; script.async = true;\n      script.onload = () => resolve(); script.onerror = () => reject(new Error("Separator runtime could not be loaded."));\n      document.head.appendChild(script);\n    });\n    void Promise.all([load("https://cdn.jsdelivr.net/npm/jszip@3.10.2/dist/jszip.min.js"), load("/separator/browser-separator.js")]).catch(() => {});\n  }, []);

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
    setStatus(navigator.gpu ? "Preparing your device GPU and loading the browser separator…" : "WebGPU is unavailable; trying CPU fallback…");
    try {
      const browser = (window as Window & {
        artistYarBrowserSeparate?: (file: File, progress: (p: { phase?: string; loaded?: number; total?: number; segment?: number; totalSegments?: number }) => void) => Promise<Blob>;
      }).artistYarBrowserSeparate;
      if (!browser) throw new Error("Browser separator is still loading. Please wait a moment and try again.");
      const blob = await browser(file, (p) => {
        if (p.phase === "model") {
          const pct = p.total ? Math.round(((p.loaded || 0) / p.total) * 100) : 0;
          setStatus("Loading separation model on your device… " + pct + "%");
        } else if (p.segment) {
          setStatus("Separating on your " + (navigator.gpu ? "GPU" : "CPU") + ": segment " + p.segment + " / " + p.totalSegments + "…");
        }
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "artistyar-" + file.name.replace(/\.[^.]+$/, "") + "-stems.zip";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setStatus("Done — browser separation complete. Your stems were processed on this device.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Browser separation failed.");
      setStatus("");
    } finally {
      setBusy(false);
    }
  }
