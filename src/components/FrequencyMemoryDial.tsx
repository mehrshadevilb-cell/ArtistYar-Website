"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Play } from "lucide-react";
import { formatHz } from "@/lib/practice-game";
import { setLiveToneHz, startLiveTone, stopLiveTone } from "@/lib/practice-audio-engine";

type Props = {
  min: number;
  max: number;
  value: number;
  onChange: (hz: number) => void;
  onReplay: () => void;
  disabled?: boolean;
  ariaLabel?: string;
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const toLog = (hz: number, min: number, max: number) => Math.log(hz / min) / Math.log(max / min);
const fromLog = (t: number, min: number, max: number) => min * Math.pow(max / min, clamp(t, 0, 1));

export function FrequencyMemoryDial({
  min,
  max,
  value,
  onChange,
  onReplay,
  disabled = false,
  ariaLabel = "فرکانس",
}: Props) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    startHz: value,
    lastX: 0,
    lastTime: 0,
    velocity: 0,
  });
  const [active, setActive] = useState(false);
  const [hover, setHover] = useState({ x: 0.5, y: 0.5, inside: false });
  const [velocity, setVelocity] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  useEffect(() => () => stopLiveTone(), []);

  const safeMin = Math.max(20, Math.min(min, max));
  const safeMax = Math.max(safeMin + 1, max);
  const progress = useMemo(
    () => clamp(toLog(clamp(value, safeMin, safeMax), safeMin, safeMax), 0, 1),
    [value, safeMin, safeMax],
  );

  const wavePath = useMemo(() => {
    const points = 72;
    const amp = (reducedMotion ? 11 : 13) + Math.min(13, Math.abs(velocity) * 0.045) + (active ? 3 : 0);
    const cycles = 1.15 + progress * 5.2;
    const pointerBias = hover.inside ? (hover.x - 0.5) * 14 : 0;
    return [0, 1, 2, 3].map((row) => {
      const phase = row * 0.72 + progress * Math.PI * 1.4;
      let d = "";
      for (let i = 0; i < points; i++) {
        const x = (i / (points - 1)) * 100;
        const normalized = i / (points - 1);
        const envelope = 0.72 + 0.28 * Math.sin(normalized * Math.PI);
        const localPressure = hover.inside
          ? Math.exp(-Math.pow((normalized - hover.x) / 0.16, 2)) * (hover.y - 0.5) * 18
          : 0;
        const y =
          50 +
          Math.sin(normalized * Math.PI * 2 * cycles + phase) * amp * envelope * (1 - row * 0.1) +
          localPressure +
          pointerBias * (normalized - 0.5) * 0.18;
        d += (i === 0 ? "M" : "L") + " " + x.toFixed(2) + " " + y.toFixed(2) + " ";
      }
      return d;
    });
  }, [active, hover, progress, reducedMotion, velocity]);

  const updateFromPointer = (clientX: number, now = performance.now()) => {
    const drag = dragRef.current;
    const dx = clientX - drag.startX;
    const width = surfaceRef.current?.getBoundingClientRect().width || 1;
    const normalizedDelta = dx / Math.max(180, width * 0.72);
    const startProgress = toLog(clamp(drag.startHz, safeMin, safeMax), safeMin, safeMax);
    const precision = Math.abs(drag.velocity) > 0.9 ? 1.25 : Math.abs(drag.velocity) < 0.22 ? 0.42 : 0.72;
    const next = fromLog(startProgress + normalizedDelta * precision, safeMin, safeMax);
    const elapsed = Math.max(1, now - drag.lastTime);
    drag.velocity = ((clientX - drag.lastX) / elapsed) * 1000;
    drag.lastX = clientX;
    drag.lastTime = now;
    setVelocity(drag.velocity);
    onChange(Math.round(next));
    setLiveToneHz(next);
  };

  const onPointerDown = async (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    const el = e.currentTarget;
    dragRef.current = {
      active: true,
      pointerId: e.pointerId,
      startX: e.clientX,
      startHz: value,
      lastX: e.clientX,
      lastTime: performance.now(),
      velocity: 0,
    };
    el.setPointerCapture?.(e.pointerId);
    setActive(true);
    setVelocity(0);
    await startLiveTone(value);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((e.clientY - rect.top) / rect.height, 0, 1);
    setHover({ x, y, inside: true });
    if (dragRef.current.active && dragRef.current.pointerId === e.pointerId) {
      e.preventDefault();
      updateFromPointer(e.clientX);
    }
  };

  const finishPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== e.pointerId) return;
    drag.active = false;
    try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch { /* */ }
    setActive(false);
    setVelocity(0);
    stopLiveTone();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    const stepRatio = e.shiftKey ? 0.0025 : 0.01;
    const current = value;
    let next = current;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") next = fromLog(toLog(current, safeMin, safeMax) + stepRatio, safeMin, safeMax);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = fromLog(toLog(current, safeMin, safeMax) - stepRatio, safeMin, safeMax);
    else return;
    e.preventDefault();
    onChange(Math.round(next));
    void startLiveTone(next);
  };

  return (
    <div className="relative">
      <div
        ref={surfaceRef}
        role="group"
        aria-label={ariaLabel}
        className={"relative h-48 touch-none select-none overflow-hidden rounded-[1.35rem] border border-white/[0.07] bg-white/[0.018] px-3 sm:h-52 sm:px-5 " + (active ? "border-cyan-300/20 bg-cyan-300/[0.025]" : "")}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerEnter={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setHover({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, inside: true });
        }}
        onPointerLeave={() => !dragRef.current.active && setHover((h) => ({ ...h, inside: false }))}
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}
        onDoubleClick={() => !disabled && onReplay()}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(circle at " +
              hover.x * 100 +
              "% " +
              hover.y * 100 +
              "%, rgba(94,234,212,.10), transparent 30%)",
            transition: reducedMotion ? "none" : "background .16s ease-out",
          }}
        />
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
          <defs>
            <linearGradient id="ay-frequency-wave" x1="0" x2="1">
              <stop offset="0%" stopColor="#67e8f9" stopOpacity=".18" />
              <stop offset="50%" stopColor="#a78bfa" stopOpacity=".95" />
              <stop offset="100%" stopColor="#f0c96b" stopOpacity=".22" />
            </linearGradient>
            <filter id="ay-frequency-glow">
              <feGaussianBlur stdDeviation="1.4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {wavePath.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="none"
              stroke="url(#ay-frequency-wave)"
              strokeWidth={i === 1 ? 1.25 : 0.7}
              opacity={i === 1 ? 0.9 : 0.22 + i * 0.08}
              filter={i === 1 ? "url(#ay-frequency-glow)" : undefined}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[10px] tracking-[0.18em] text-ink-600">
          {active ? "تنظیم فرکانس" : "بکش و تنظیم کن"}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-center gap-3">
        <span className="font-mono text-4xl font-semibold tabular-nums tracking-tight text-sand-50 sm:text-5xl">
          {formatHz(value)}
        </span>
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.035] text-ink-300 transition hover:bg-white/[0.07] hover:text-sand-50"
          onClick={onReplay}
          disabled={disabled}
          aria-label="پخش دوباره فرکانس"
        >
          <Play size={14} fill="currentColor" />
        </button>
      </div>

      <input
        type="range"
        min={safeMin}
        max={safeMax}
        step={1}
        value={value}
        onChange={(e) => {
          const hz = Number(e.target.value);
          onChange(hz);
          void startLiveTone(hz);
        }}
        onKeyDown={onKeyDown}
        onFocus={() => setActive(true)}
        onBlur={() => { setActive(false); stopLiveTone(); }}
        className="sr-only"
        aria-label={ariaLabel}
      />
    </div>
  );
}
