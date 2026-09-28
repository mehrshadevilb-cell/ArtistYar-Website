"use client";

/**
 * Frequency Memory dial — Dialed.gg /sound parity presentation.
 * Canvas dual-wave, vertical log drag, circular submit, result overlay.
 * UX polish: phase status, replay, visibility-aware RAF, mobile-safe glow.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ArrowRight, RotateCcw } from "lucide-react";
import { startLiveTone, setLiveToneHz, stopLiveTone } from "@/lib/practice-audio-engine";
import "@/styles/practice-shell.css";

function clamp(v: number, a = 0, b = 1) {
  return Math.max(a, Math.min(b, v));
}
function toLog(hz: number, min: number, max: number) {
  const lo = Math.max(20, min);
  const hi = Math.max(lo + 1, max);
  return clamp((Math.log(clamp(hz, lo, hi)) - Math.log(lo)) / (Math.log(hi) - Math.log(lo)));
}
function fromLog(t: number, min: number, max: number) {
  const lo = Math.max(20, min);
  const hi = Math.max(lo + 1, max);
  return Math.exp(Math.log(lo) + clamp(t) * (Math.log(hi) - Math.log(lo)));
}
function formatHzPrecise(hz: number) {
  if (!Number.isFinite(hz) || hz <= 0) return "—";
  if (hz >= 1000) return (hz / 1000).toFixed(hz >= 10000 ? 1 : 2);
  return hz.toFixed(2);
}
function formatHzUnit(hz: number) {
  if (!Number.isFinite(hz) || hz <= 0) return "Hz";
  return hz >= 1000 ? "kHz" : "Hz";
}

export type FreqDialMode = "listen" | "remember" | "recreate" | "result";

export type FrequencyMemoryDialProps = {
  minHz: number;
  maxHz: number;
  valueHz: number;
  waveHz: number;
  mode: FreqDialMode;
  playing?: boolean;
  disabled?: boolean;
  targetHz?: number | null;
  revealTarget?: boolean;
  audioError?: string | null;
  onChangeHz: (hz: number) => void;
  onLock?: () => void;
  onReplay?: () => void;
  showReplay?: boolean;
  replayLabel?: string;
  resultScore?: number | null;
  resultFeedback?: string | null;
  roundLabel?: string;
  brandLabel?: string;
};

const TEAL = "rgba(46, 230, 184,";
const PURPLE = "rgba(122, 60, 255,";
const CYAN = "rgba(94, 234, 212,";

const WAVE_LAYERS = [
  { color: PURPLE, alpha: 0.12, width: 1.1, phaseOff: 0.55, ampMul: 1.18, lag: 0.35 },
  { color: TEAL, alpha: 0.14, width: 1.15, phaseOff: -0.4, ampMul: 1.12, lag: 0.22 },
  { color: PURPLE, alpha: 0.22, width: 1.35, phaseOff: 0.18, ampMul: 1.05, lag: 0.1 },
  { color: CYAN, alpha: 0.38, width: 1.55, phaseOff: 0, ampMul: 1, lag: 0 },
  { color: TEAL, alpha: 0.55, width: 1.85, phaseOff: -0.08, ampMul: 0.92, lag: -0.05 },
] as const;

const PHASE_STATUS: Record<FreqDialMode, string | null> = {
  listen: "گوش بده",
  remember: "به‌خاطر بسپار",
  recreate: "بکش و تنظیم کن",
  result: null,
};

export function FrequencyMemoryDial({
  minHz,
  maxHz,
  valueHz,
  waveHz,
  mode,
  playing = false,
  disabled = false,
  targetHz = null,
  audioError = null,
  onChangeHz,
  onLock,
  onReplay,
  showReplay = false,
  replayLabel = "پخش دوباره",
  resultScore = null,
  resultFeedback = null,
  roundLabel,
  brandLabel = "ArtistYar",
}: FrequencyMemoryDialProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef({ active: false, moved: false, lastY: 0, startY: 0, startT: 0 });
  const phaseRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [cursorY, setCursorY] = useState<number | null>(null);
  const [displayScore, setDisplayScore] = useState(0);
  const [lowPower, setLowPower] = useState(false);
  const waveHzRef = useRef(waveHz);
  const valueHzRef = useRef(valueHz);
  const playingRef = useRef(playing);
  const draggingRef = useRef(false);
  const cursorYRef = useRef<number | null>(null);
  const reducedMotionRef = useRef(false);
  const lowPowerRef = useRef(false);
  const visibleRef = useRef(true);
  const sizeRef = useRef({ w: 1, h: 1 });
  const glowRef = useRef<CanvasGradient | null>(null);
  const fadeRef = useRef<CanvasGradient | null>(null);
  const interactive = mode === "recreate" && !disabled;
  const phaseStatus = PHASE_STATUS[mode];

  useEffect(() => {
    waveHzRef.current = waveHz;
    valueHzRef.current = valueHz;
    playingRef.current = playing;
    draggingRef.current = dragging;
    cursorYRef.current = cursorY;
    reducedMotionRef.current = reducedMotion;
    lowPowerRef.current = lowPower;
  }, [waveHz, valueHz, playing, dragging, cursorY, reducedMotion, lowPower]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  useEffect(() => {
    const coarse = window.matchMedia?.("(pointer: coarse)")?.matches;
    const narrow = typeof window !== "undefined" && window.innerWidth < 640;
    setLowPower(Boolean(coarse || narrow));
  }, []);

  useEffect(() => {
    phaseRef.current = 0;
  }, [mode, roundLabel]);

  useEffect(() => {
    if (mode !== "result" || resultScore == null) {
      setDisplayScore(0);
      return;
    }
    const target = Math.max(0, Math.min(10, resultScore));
    if (reducedMotion) {
      setDisplayScore(target);
      return;
    }
    const start = performance.now();
    const dur = 900;
    let id = 0;
    const tick = (now: number) => {
      const t = clamp((now - start) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      setDisplayScore(Math.round(target * e * 100) / 100);
      if (t < 1) id = requestAnimationFrame(tick);
      else setDisplayScore(Math.round(target * 100) / 100);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [mode, resultScore, reducedMotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const surface = surfaceRef.current;
    if (!canvas || !surface) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let running = true;
    let last = performance.now();
    const onVis = () => {
      visibleRef.current = document.visibilityState !== "hidden";
    };
    onVis();
    document.addEventListener("visibilitychange", onVis);

    const resize = () => {
      const r = surface.getBoundingClientRect();
      const dprCap = lowPowerRef.current ? 1.25 : 2;
      const dpr = Math.min(dprCap, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.floor(r.width));
      const h = Math.max(1, Math.floor(r.height));
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { w, h };
      const glow = ctx.createRadialGradient(w * 0.5, h * 0.45, 4, w * 0.5, h * 0.45, h * 0.55);
      glow.addColorStop(0, "rgba(94,234,212,0.07)");
      glow.addColorStop(0.45, "rgba(122,60,255,0.05)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      glowRef.current = glow;
      const fade = ctx.createLinearGradient(0, h * 0.72, 0, h);
      fade.addColorStop(0, "rgba(0,0,0,0)");
      fade.addColorStop(1, "rgba(0,0,0,0.85)");
      fadeRef.current = fade;
    };
    resize();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    ro?.observe(surface);
    window.addEventListener("resize", resize);

    const draw = (now: number) => {
      if (!running) return;
      if (!visibleRef.current) {
        rafRef.current = requestAnimationFrame(draw);
        last = now;
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const motionReduced = reducedMotionRef.current;
      const lp = lowPowerRef.current;
      if (!motionReduced) {
        phaseRef.current += dt * (playingRef.current || draggingRef.current ? 2.8 : 1.15);
      }
      const { w, h } = sizeRef.current;
      ctx.fillStyle = "rgba(0, 0, 0, 0.16)";
      ctx.fillRect(0, 0, w, h);
      const hz = Math.max(40, waveHzRef.current || valueHzRef.current || 440);
      const lobes = clamp(4 + Math.log2(hz / 80) * 2.2, 4, 18);
      const wavelength = h / lobes;
      const cx = w * 0.5;
      const ampBase = Math.min(w * 0.22, 78);
      const phase = phaseRef.current;
      if (glowRef.current) {
        ctx.fillStyle = glowRef.current;
        ctx.fillRect(0, 0, w, h);
      }
      const layers = lp ? WAVE_LAYERS.slice(2) : WAVE_LAYERS;
      const stepDiv = lp ? 3 : 2;
      for (const layer of layers) {
        ctx.beginPath();
        const steps = Math.max(64, Math.floor(h / stepDiv));
        for (let i = 0; i <= steps; i++) {
          const y = (i / steps) * h;
          const yn = y / h;
          const env = Math.sin(Math.PI * yn) ** 0.85;
          const primary = Math.sin((y / wavelength) * Math.PI * 2 + phase + layer.phaseOff);
          const secondary = Math.sin((y / (wavelength * 1.37)) * Math.PI * 2 - phase * 0.7 + layer.lag);
          const beat = primary * 0.72 + secondary * 0.28;
          let deform = 0;
          const currentCursorY = cursorYRef.current;
          if (draggingRef.current && currentCursorY != null) {
            const dy = (y - currentCursorY) / (h * 0.12);
            deform = Math.exp(-dy * dy) * 0.18 * ampBase;
          }
          const x = cx + beat * ampBase * layer.ampMul * env + deform * (layer.ampMul > 1 ? 0.6 : 1);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `${layer.color}${layer.alpha})`;
        ctx.lineWidth = layer.width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        if (!motionReduced && !lp && layer.alpha >= 0.38) {
          ctx.shadowColor = `${layer.color}0.4)`;
          ctx.shadowBlur = layer.width * 3.2;
        } else {
          ctx.shadowBlur = 0;
        }
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      if (fadeRef.current) {
        ctx.fillStyle = fadeRef.current;
        ctx.fillRect(0, h * 0.72, w, h * 0.28);
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro?.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const setFromDrag = useCallback(
    (clientY: number, withTone = true) => {
      const el = surfaceRef.current;
      if (!el || !dragRef.current.active) return;
      const r = el.getBoundingClientRect();
      const height = Math.max(1, r.height);
      const deltaT = -(clientY - dragRef.current.startY) / height;
      const t = clamp(dragRef.current.startT + deltaT * 0.72);
      const hz = fromLog(t, minHz, maxHz);
      const rounded = Math.round(hz * 100) / 100;
      onChangeHz(rounded);
      setCursorY(clientY - r.top);
      if (withTone) {
        void startLiveTone(rounded);
        setLiveToneHz(rounded);
      }
    },
    [minHz, maxHz, onChangeHz],
  );

  const down = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const r = e.currentTarget.getBoundingClientRect();
    const startT = toLog(valueHz, minHz, maxHz);
    dragRef.current = { active: true, moved: false, lastY: e.clientY, startY: e.clientY, startT };
    setDragging(true);
    setCursorY(e.clientY - r.top);
    void startLiveTone(valueHz);
    setLiveToneHz(valueHz);
  };
  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    if (Math.abs(e.clientY - dragRef.current.lastY) > 3) dragRef.current.moved = true;
    dragRef.current.lastY = e.clientY;
    setFromDrag(e.clientY);
  };
  const up = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    setDragging(false);
    setCursorY(null);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* */
    }
    if (interactive) {
      stopLiveTone();
    }
  };
  const key = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const hzStep = e.shiftKey ? 0.01 : 0.1;
    let hz = valueHz;
    if (e.key === "ArrowDown" || e.key === "ArrowLeft") hz -= hzStep;
    else if (e.key === "ArrowUp" || e.key === "ArrowRight") hz += hzStep;
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      stopLiveTone();
      onLock?.();
      return;
    } else return;
    e.preventDefault();
    hz = Math.max(minHz, Math.min(maxHz, hz));
    hz = Math.round(hz * 100) / 100;
    onChangeHz(hz);
    void startLiveTone(hz);
    setLiveToneHz(hz);
  };

  const showHz = mode === "recreate" ? valueHz : null;
  const isResult = mode === "result";
  const canReplay = Boolean(showReplay && onReplay && !disabled && mode !== "result");

  return (
    <div
      className={`fm-dialed-card ${interactive ? "is-interactive" : ""} ${dragging ? "is-dragging" : ""} ${playing ? "is-playing" : ""} ${mode === "remember" ? "is-remember" : ""} ${isResult ? "is-result" : ""}`}
      dir="ltr"
    >
      <div className="fm-dialed-top">
        <span className="fm-dialed-round">{roundLabel || ""}</span>
        <span className="fm-dialed-brand">{brandLabel}</span>
      </div>

      {phaseStatus && (
        <div className="fm-dialed-status" aria-live="polite">
          <span className={`fm-dialed-status-pill ${playing ? "is-live" : ""} ${mode === "remember" ? "is-hold" : ""}`}>
            {phaseStatus}
          </span>
        </div>
      )}

      <div
        ref={surfaceRef}
        className="fm-dialed-surface"
        role="slider"
        tabIndex={interactive ? 0 : -1}
        aria-valuemin={Math.round(minHz)}
        aria-valuemax={Math.round(maxHz)}
        aria-valuenow={Math.round(valueHz)}
        aria-valuetext={`${formatHzPrecise(valueHz)} ${formatHzUnit(valueHz)}`}
        aria-label="کنترل فرکانس — برای تغییر زیر و بمی به‌صورت عمودی بکشید"
        aria-disabled={!interactive}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onKeyDown={key}
        style={{ touchAction: interactive ? "none" : undefined }}
      >
        <canvas ref={canvasRef} className="fm-dialed-canvas" aria-hidden />

        {dragging && cursorY != null && (
          <div className="fm-dialed-cursor" style={{ top: cursorY }} aria-hidden>
            <svg width="14" height="28" viewBox="0 0 14 28" fill="none">
              <path
                d="M7 2 L7 26 M7 2 L3.5 7 M7 2 L10.5 7 M7 26 L3.5 21 M7 26 L10.5 21"
                stroke="#fff"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}

        {isResult && resultScore != null && (
          <div className="fm-dialed-score" aria-live="polite">
            {displayScore.toFixed(2)}
          </div>
        )}
        {isResult && resultFeedback && <p className="fm-dialed-feedback">{resultFeedback}</p>}

        <div className="fm-dialed-hz">
          {isResult && targetHz != null && (
            <div className="fm-dialed-target-block">
              <span className="fm-dialed-target-label">TARGET</span>
              <span className="fm-dialed-target-value">
                {formatHzPrecise(targetHz)}
                <span className="fm-dialed-hz-unit">{formatHzUnit(targetHz)}</span>
              </span>
            </div>
          )}
          {showHz != null ? (
            <div className="fm-dialed-guess-block">
              <span className="fm-dialed-guess-value">
                {formatHzPrecise(showHz)}
                <span className="fm-dialed-hz-unit">{formatHzUnit(showHz)}</span>
              </span>
            </div>
          ) : (
            <div className="fm-dialed-guess-block">
              <span className="fm-dialed-guess-value fm-dialed-muted">•••</span>
            </div>
          )}
        </div>

        <input
          type="range"
          className="fm-range-sr"
          min={0}
          max={100000}
          step={1}
          value={Math.round(toLog(valueHz, minHz, maxHz) * 100000)}
          disabled={!interactive}
          aria-label="تنظیم فرکانس"
          onChange={(e) => {
            const hz = Math.round(fromLog(+e.target.value / 100000, minHz, maxHz) * 100) / 100;
            onChangeHz(hz);
            void startLiveTone(hz);
            setLiveToneHz(hz);
          }}
        />

        {canReplay && (
          <button
            type="button"
            className="fm-dialed-replay"
            aria-label={replayLabel}
            title={replayLabel}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => {
              stopLiveTone();
              void onReplay?.();
            }}
          >
            <RotateCcw size={15} strokeWidth={2.2} aria-hidden />
          </button>
        )}

        {interactive && (
          <button
            type="button"
            className="fm-dialed-submit"
            aria-label="ثبت پاسخ"
            title="ثبت پاسخ"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => {
              stopLiveTone();
              void onLock?.();
            }}
          >
            <ArrowRight size={17} strokeWidth={2.2} aria-hidden />
          </button>
        )}

        {audioError && (
          <div className="fm-dialed-error" role="status">
            {audioError}
          </div>
        )}
      </div>
    </div>
  );
}
