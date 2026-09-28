"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Play } from "lucide-react";
import {
  startLiveTone,
  setLiveToneHz,
  stopLiveTone,
} from "@/lib/practice-audio-engine";
import { formatHz } from "@/lib/practice-game";
import "@/styles/practice-shell.css";

function toLog(hz: number, min: number, max: number) {
  const lo = Math.max(20, min);
  const hi = Math.max(lo + 1, max);
  const a = Math.log(lo);
  const b = Math.log(hi);
  const t = (Math.log(Math.max(lo, Math.min(hi, hz))) - a) / (b - a);
  return Math.max(0, Math.min(1, t));
}

function fromLog(t: number, min: number, max: number) {
  const lo = Math.max(20, min);
  const hi = Math.max(lo + 1, max);
  const clamped = Math.max(0, Math.min(1, t));
  return Math.round(Math.exp(Math.log(lo) + clamped * (Math.log(hi) - Math.log(lo))));
}

export type FreqDialMode = "listen" | "remember" | "recreate";

type Props = {
  minHz: number;
  maxHz: number;
  valueHz: number;
  waveHz: number;
  mode: FreqDialMode;
  playing?: boolean;
  disabled?: boolean;
  onChangeHz: (hz: number) => void;
  onLock?: () => void;
  onReplay?: () => void;
  showReplay?: boolean;
  replayLabel?: string;
};

export function FrequencyMemoryDial({
  minHz,
  maxHz,
  valueHz,
  waveHz,
  mode,
  playing = false,
  disabled = false,
  onChangeHz,
  onLock,
  onReplay,
  showReplay = false,
  replayLabel = "پخش دوباره",
}: Props) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const lastXRef = useRef(0);
  const lastTRef = useRef(0);
  const velocityRef = useRef(0);
  const [velocity, setVelocity] = useState(0);
  const [phase, setPhase] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const rafRef = useRef<number | null>(null);
  const interactive = mode === "recreate" && !disabled;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const speed = playing ? 2.4 : mode === "recreate" ? 1.2 + Math.min(2, velocityRef.current) * 0.8 : mode === "listen" ? 0.9 : 0.25;
      setPhase((p) => p + dt * speed);
      velocityRef.current *= 0.92;
      setVelocity(velocityRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [playing, mode, reducedMotion]);

  useEffect(() => {
    return () => {
      stopLiveTone();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const setFromClientX = useCallback(
    (clientX: number, withTone: boolean) => {
      const el = surfaceRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const t = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
      const hz = fromLog(t, minHz, maxHz);
      const now = performance.now();
      const dt = Math.max(1, now - lastTRef.current);
      const dx = Math.abs(clientX - lastXRef.current);
      velocityRef.current = Math.min(3, (dx / dt) * 8);
      lastXRef.current = clientX;
      lastTRef.current = now;
      setVelocity(velocityRef.current);
      onChangeHz(hz);
      if (withTone) {
        void startLiveTone(hz);
        setLiveToneHz(hz);
      }
    },
    [minHz, maxHz, onChangeHz],
  );

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    lastXRef.current = e.clientX;
    lastTRef.current = performance.now();
    setFromClientX(e.clientX, true);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!interactive || !draggingRef.current) return;
    setFromClientX(e.clientX, true);
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* */
    }
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const step = e.shiftKey ? 12 : 3;
    const t = toLog(valueHz, minHz, maxHz);
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      const hz = fromLog(t - step / 100, minHz, maxHz);
      onChangeHz(hz);
      void startLiveTone(hz);
      setLiveToneHz(hz);
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      const hz = fromLog(t + step / 100, minHz, maxHz);
      onChangeHz(hz);
      void startLiveTone(hz);
      setLiveToneHz(hz);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      stopLiveTone();
      onLock?.();
    }
  };

  const layers = useMemo(() => {
    const hz = Math.max(40, Math.min(8000, waveHz || valueHz || 440));
    const logT = toLog(hz, Math.min(minHz, 80), Math.max(maxHz, 2000));
    const cycles = 1.2 + logT * 4.5;
    const ampBoost = 1 + Math.min(0.55, velocity * 0.25) + (playing ? 0.15 : 0);
    const baseAmp = (reducedMotion ? 10 : 14) * ampBoost;
    const paths: { d: string; opacity: number; width: number }[] = [];
    const H = 200;
    for (let layer = 0; layer < 5; layer++) {
      const amp = baseAmp * (1 - layer * 0.12);
      const phaseOff = phase * (1 + layer * 0.07) + layer * 0.4;
      const xCenter = 50 + (layer - 2) * 3.2;
      const pts: string[] = [];
      const steps = reducedMotion ? 24 : 48;
      for (let i = 0; i <= steps; i++) {
        const y = (i / steps) * H;
        const x = xCenter + Math.sin((i / steps) * cycles * Math.PI * 2 + phaseOff) * amp;
        pts.push(`${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`);
      }
      paths.push({
        d: pts.join(" "),
        opacity: 0.28 + layer * 0.12,
        width: 1.1 + layer * 0.2,
      });
    }
    return paths;
  }, [waveHz, valueHz, minHz, maxHz, phase, velocity, playing, reducedMotion]);

  const modeLabel =
    mode === "listen" ? "گوش بده" : mode === "remember" ? "به‌خاطر بسپار" : "بازسازی کن";

  return (
    <div className="fm-dial">
      <p className="fm-dial-mode" aria-live="polite">
        {modeLabel}
      </p>

      <div
        ref={surfaceRef}
        className={`fm-dial-surface ${interactive ? "is-interactive" : ""} ${mode === "remember" ? "is-locked" : ""}`}
        role="slider"
        tabIndex={interactive ? 0 : -1}
        aria-valuemin={minHz}
        aria-valuemax={maxHz}
        aria-valuenow={valueHz}
        aria-valuetext={formatHz(valueHz)}
        aria-label="تنظیم فرکانس حدس با کشیدن افقی"
        aria-disabled={!interactive}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        <svg viewBox="0 0 100 200" className="fm-wave" aria-hidden>
          <defs>
            <linearGradient id="fmWaveGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5eead4" stopOpacity="0.95" />
              <stop offset="45%" stopColor="#a78bfa" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#d4af37" stopOpacity="0.85" />
            </linearGradient>
          </defs>
          {layers.map((L, i) => (
            <path
              key={i}
              d={L.d}
              fill="none"
              stroke="url(#fmWaveGrad)"
              strokeWidth={L.width}
              opacity={L.opacity}
              strokeLinecap="round"
            />
          ))}
        </svg>

        <div className="fm-hz-readout">
          <p className="fm-hz-label">{mode === "recreate" ? "GUESS" : mode === "listen" ? "TARGET" : "—"}</p>
          <p className="fm-hz-value">{mode === "remember" ? "···" : formatHz(mode === "listen" ? waveHz : valueHz)}</p>
        </div>

        <input
          type="range"
          className="fm-range-sr"
          min={0}
          max={1000}
          step={1}
          value={Math.round(toLog(valueHz, minHz, maxHz) * 1000)}
          disabled={!interactive}
          aria-label="اسلایدر فرکانس"
          onChange={(e) => {
            const hz = fromLog(Number(e.target.value) / 1000, minHz, maxHz);
            onChangeHz(hz);
            void startLiveTone(hz);
            setLiveToneHz(hz);
          }}
        />
      </div>

      <div className="fm-dial-actions">
        {showReplay && onReplay && (
          <button type="button" className="btn-ay inline-flex items-center gap-2" onClick={onReplay} disabled={playing}>
            <Play size={16} />
            {playing ? "در حال پخش…" : replayLabel}
          </button>
        )}
        {mode === "recreate" && onLock && (
          <button
            type="button"
            className="btn-ay btn-ay-primary flex-1"
            onClick={() => {
              stopLiveTone();
              onLock();
            }}
          >
            قفل پاسخ
          </button>
        )}
        {mode === "recreate" && (
          <button type="button" className="btn-ay" onClick={() => void startLiveTone(valueHz)}>
            پخش حدس
          </button>
        )}
      </div>
    </div>
  );
}
