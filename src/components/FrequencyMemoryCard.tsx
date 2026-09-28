"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { setLiveToneHz, startLiveTone, stopLiveTone } from "@/lib/practice-audio-engine";
import "@/styles/fm-card.css";

export type FmCardMode = "listen" | "remember" | "recreate" | "result" | "ready";

type Props = {
  mode: FmCardMode;
  /** e.g. "1 / 5" */
  counter: string;
  minHz?: number;
  maxHz?: number;
  valueHz?: number;
  waveHz?: number;
  onChangeHz?: (hz: number) => void;
  playing?: boolean;
  disabled?: boolean;
  targetHz?: number | null;
  /** Final score, already floored to 2 decimals. */
  score?: number | null;
  feedback?: string;
  rememberLeft?: number;
  audioError?: string | null;
  showReplay?: boolean;
  onPlay?: () => void;
  onSubmit?: () => void;
  onNext?: () => void;
  onReadyDone?: () => void;
};

const READY_WORDS = ["ready", "set", "go"];

function clamp(v: number, a = 0, b = 1) {
  return Math.max(a, Math.min(b, v));
}

/** Two interfering vertical sine waves with stacked echoes, beating envelope, fading toward the bottom. */
function drawWave(ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number, phase: number, lobes: number, dim: boolean) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w * dpr, h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalCompositeOperation = "lighter";
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const cx = w / 2;
  const amp = w * (dim ? 0.09 : 0.17);
  const beats = 2.2;
  const echoes = 9;
  const layers = [
    { rgb: "46,230,184", ph: 0, mult: 1, dir: 1, bph: 0 },
    { rgb: "122,60,255", ph: 1.9, mult: 1.06, dir: -1, bph: 1.3 },
  ];
  for (const L of layers) {
    for (let k = echoes; k >= 0; k--) {
      const main = k === 0;
      const a = main ? 1 : 0.2 * (1 - k / (echoes + 1));
      ctx.strokeStyle = `rgba(${L.rgb},${a})`;
      ctx.lineWidth = main ? 1.5 : 0.7;
      ctx.shadowColor = `rgba(${L.rgb},0.9)`;
      ctx.shadowBlur = (main ? 16 : 0) * dpr;
      const off = k * 0.16;
      const sc = 1 + k * 0.05;
      ctx.beginPath();
      for (let y = 0; y <= h; y += 3) {
        const u = y / h;
        const env = 0.35 + 0.65 * Math.abs(Math.sin(u * beats * Math.PI + phase * 0.22 + L.bph));
        const x = cx + Math.sin(u * lobes * Math.PI * 2 * L.mult + phase * L.dir + L.ph + off) * amp * env * sc;
        if (y === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  ctx.shadowBlur = 0;
  ctx.globalCompositeOperation = "destination-in";
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "rgba(0,0,0,1)");
  g.addColorStop(0.62, "rgba(0,0,0,1)");
  g.addColorStop(1, "rgba(0,0,0,0.05)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "source-over";
}

export function FrequencyMemoryCard({
  mode,
  counter,
  minHz = 100,
  maxHz = 2000,
  valueHz = 440,
  waveHz,
  onChangeHz,
  playing = false,
  disabled = false,
  targetHz = null,
  score = null,
  feedback = "",
  rememberLeft = 0,
  audioError = null,
  showReplay = false,
  onPlay,
  onSubmit,
  onNext,
  onReadyDone,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, y: 0 });
  const wheelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [reduced, setReduced] = useState(false);
  const [shown, setShown] = useState(0);
  const [word, setWord] = useState(0);

  const interactive = mode === "recreate" && !disabled;
  const drawHz = waveHz ?? valueHz;

  // Latest values for the animation loop and native listeners.
  const live = useRef({ hz: drawHz, min: minHz, max: maxHz, playing, dim: mode === "remember" });
  live.current = { hz: drawHz, min: minHz, max: maxHz, playing, dim: mode === "remember" };
  const valueRef = useRef(valueHz);
  valueRef.current = valueHz;
  const interactiveRef = useRef(interactive);
  interactiveRef.current = interactive;
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;
  const doneRef = useRef(onReadyDone);
  doneRef.current = onReadyDone;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  // Waveform loop.
  useEffect(() => {
    const cv = canvasRef.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    let raf = 0;
    let last = performance.now();
    let phase = 0;
    let lobes = -1;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = live.current;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = cv.clientWidth;
      const h = cv.clientHeight;
      if (w > 0 && h > 0) {
        const pw = Math.round(w * dpr);
        const ph = Math.round(h * dpr);
        if (cv.width !== pw || cv.height !== ph) {
          cv.width = pw;
          cv.height = ph;
        }
        if (!reducedRef.current) phase += dt * (s.playing ? 1.5 : 0.55);
        const lo = Math.log(Math.max(20, s.min));
        const hi = Math.log(Math.max(s.min + 1, s.max));
        const t = clamp((Math.log(Math.max(20, s.hz)) - lo) / Math.max(0.001, hi - lo));
        const target = 2.5 + t * 13;
        lobes = lobes < 0 ? target : lobes + (target - lobes) * Math.min(1, dt * 9);
        drawWave(ctx, w, h, dpr, phase, lobes, s.dim);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Relative vertical tuning. Up = higher pitch. Log mapping over ~90% of card height per full range.
  const applyDelta = useCallback(
    (dyPx: number) => {
      const el = rootRef.current;
      if (!el) return;
      const h = el.getBoundingClientRect().height || 1;
      const lo = Math.log(Math.max(20, minHz));
      const hi = Math.log(Math.max(minHz + 1, maxHz));
      const cur = Math.log(clamp(valueRef.current, minHz, maxHz));
      const hz = Math.exp(clamp(cur - (dyPx / (h * 0.9)) * (hi - lo), lo, hi));
      valueRef.current = hz;
      onChangeHz?.(hz);
      void startLiveTone(hz);
      setLiveToneHz(hz);
    },
    [minHz, maxHz, onChangeHz],
  );
  const applyRef = useRef(applyDelta);
  applyRef.current = applyDelta;

  // Wheel / scroll tuning (needs a non-passive listener).
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!interactiveRef.current) return;
      e.preventDefault();
      applyRef.current(e.deltaY * 0.6);
      if (wheelTimer.current) clearTimeout(wheelTimer.current);
      wheelTimer.current = setTimeout(() => stopLiveTone(), 220);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      if (wheelTimer.current) clearTimeout(wheelTimer.current);
    };
  }, []);

  useEffect(() => {
    if (mode !== "recreate") stopLiveTone();
    cursorRef.current?.classList.remove("is-on");
  }, [mode]);
  useEffect(() => () => stopLiveTone(), []);

  // Count-up in result phase.
  useEffect(() => {
    if (mode !== "result" || score == null) {
      setShown(0);
      return;
    }
    if (reduced) {
      setShown(score);
      return;
    }
    const t0 = performance.now();
    const D = 700;
    let raf = 0;
    const f = (n: number) => {
      const p = Math.min(1, (n - t0) / D);
      setShown(score * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(f);
    };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [mode, score, reduced]);

  // ready -> set -> go, then hand control back.
  useEffect(() => {
    if (mode !== "ready") return;
    setWord(0);
    const ts = [setTimeout(() => setWord(1), 650), setTimeout(() => setWord(2), 1300), setTimeout(() => doneRef.current?.(), 1950)];
    return () => ts.forEach(clearTimeout);
  }, [mode]);

  const moveCursor = (e: ReactPointerEvent<HTMLDivElement>) => {
    const c = cursorRef.current;
    const r = rootRef.current?.getBoundingClientRect();
    if (!c || !r) return;
    c.style.transform = `translate(${e.clientX - r.left}px,${e.clientY - r.top}px)`;
    if (interactiveRef.current && e.pointerType !== "touch") c.classList.add("is-on");
  };
  const down = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    if ((e.target as HTMLElement).closest("button")) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* */
    }
    dragRef.current = { active: true, y: e.clientY };
    moveCursor(e);
    void startLiveTone(valueRef.current);
  };
  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    moveCursor(e);
    if (!dragRef.current.active) return;
    const dy = e.clientY - dragRef.current.y;
    dragRef.current.y = e.clientY;
    if (dy) applyDelta(dy);
  };
  const up = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* */
    }
    stopLiveTone();
  };
  const leave = () => {
    if (!dragRef.current.active) cursorRef.current?.classList.remove("is-on");
  };
  const keyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const step = e.shiftKey ? 32 : 8;
    if (e.key === "ArrowUp" || e.key === "ArrowRight") applyDelta(-step);
    else if (e.key === "ArrowDown" || e.key === "ArrowLeft") applyDelta(step);
    else if (e.key === "Enter" || e.key === " ") {
      stopLiveTone();
      onSubmit?.();
    } else return;
    e.preventDefault();
  };

  const fmt = (hz: number) => hz.toFixed(2);
  const cls = ["fmc", interactive ? "is-tuning" : "", mode === "remember" ? "is-dim" : "", mode === "ready" ? "is-blank" : "", mode === "result" ? "is-result" : ""]
    .filter(Boolean)
    .join(" ");

  const readoutHz = mode === "listen" ? drawHz : valueHz;

  return (
    <div className="fmc-stage" dir="ltr">
      <div
        ref={rootRef}
        className={cls}
        role={interactive ? "slider" : undefined}
        tabIndex={interactive ? 0 : -1}
        aria-valuemin={interactive ? minHz : undefined}
        aria-valuemax={interactive ? maxHz : undefined}
        aria-valuenow={interactive ? Math.round(valueHz * 100) / 100 : undefined}
        aria-valuetext={interactive ? `${fmt(valueHz)} Hz` : undefined}
        aria-label={interactive ? "تنظیم فرکانس با کشیدن عمودی" : undefined}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onPointerLeave={leave}
        onKeyDown={keyDown}
        onKeyUp={() => interactive && stopLiveTone()}
      >
        <canvas ref={canvasRef} className="fmc-canvas" aria-hidden />

        <span className="fmc-counter">{counter}</span>

        {mode !== "ready" && mode !== "result" && <span className="fmc-brand">ArtistYar</span>}

        {mode === "ready" && (
          <span key={word} className="fmc-word" aria-live="polite">
            {READY_WORDS[word]}
          </span>
        )}

        {mode === "result" && score != null && (
          <div className="fmc-score-wrap">
            <div className="fmc-score">{shown.toFixed(2)}</div>
            {feedback && <p className="fmc-feedback">{feedback}</p>}
          </div>
        )}

        {mode === "listen" && !playing && (
          <button type="button" className="fmc-play" onClick={onPlay} aria-label="پخش هدف" disabled={disabled}>
            <svg viewBox="0 0 24 24" fill="#000" aria-hidden>
              <path d="M6 4l14 8-14 8z" />
            </svg>
          </button>
        )}

        {mode === "remember" && (
          <p className="fmc-note" aria-live="polite">
            سکوت… به‌خاطر بسپار{rememberLeft > 0 ? ` · ${rememberLeft}` : ""}
          </p>
        )}

        {mode === "recreate" && showReplay && (
          <button type="button" className="fmc-replay" onClick={onPlay} disabled={playing}>
            {playing ? "در حال پخش…" : "پخش دوباره هدف"}
          </button>
        )}

        {audioError && (
          <p className="fmc-error" role="status">
            {audioError}
          </p>
        )}

        {(mode === "listen" || mode === "recreate" || mode === "result") && (
          <div className="fmc-readout">
            {mode === "result" && targetHz != null && (
              <div className="fmc-target">
                <p className="fmc-target-label">Target</p>
                <p className="fmc-hz">
                  <span className="fmc-hz-num">{fmt(targetHz)}</span>
                  <span className="fmc-hz-unit">Hz</span>
                </p>
              </div>
            )}
            <p className="fmc-hz">
              <span className="fmc-hz-num">{fmt(readoutHz)}</span>
              <span className="fmc-hz-unit">Hz</span>
            </p>
          </div>
        )}

        {mode === "recreate" && (
          <button type="button" className="fmc-submit" onClick={() => { stopLiveTone(); onSubmit?.(); }} disabled={disabled} aria-label="قفل پاسخ">
            <svg viewBox="0 0 16 16" fill="none" stroke="#000" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M2.5 8h11M9 3.5L13.5 8 9 12.5" />
            </svg>
          </button>
        )}
        {mode === "result" && (
          <button type="button" className="fmc-submit" onClick={onNext} aria-label="ادامه">
            <svg viewBox="0 0 16 16" fill="none" stroke="#000" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M2.5 8h11M9 3.5L13.5 8 9 12.5" />
            </svg>
          </button>
        )}

        <div ref={cursorRef} className="fmc-cursor" aria-hidden>
          <svg viewBox="0 0 22 30" fill="#fff">
            <path d="M11 1l7 8h-5v12h5l-7 8-7-8h5V9H4z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
