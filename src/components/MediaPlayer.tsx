"use client";

import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function time(value: number) { if (!Number.isFinite(value)) return "۰:۰۰"; return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`; }

export function MediaPlayer({ src, kind, title }: { src: string; kind: "audio" | "video"; title: string }) {
  const ref = useRef<HTMLMediaElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);

  useEffect(() => { setPlaying(false); setProgress(0); setDuration(0); }, [src]);
  async function toggle() { if (!ref.current) return; if (ref.current.paused) { await ref.current.play(); setPlaying(true); } else { ref.current.pause(); setPlaying(false); } }
  function seek(event: React.ChangeEvent<HTMLInputElement>) { if (!ref.current) return; const next = Number(event.target.value); ref.current.currentTime = (next / 100) * duration; setProgress(next); }
  function onTime() { if (!ref.current || !duration) return; setProgress((ref.current.currentTime / duration) * 100); }

  return <div className={`media-player ${kind === "video" ? "media-player-video" : "media-player-audio"}`}>
    {kind === "video" ? <video ref={(node) => { ref.current = node; }} src={src} preload="metadata" onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)} onTimeUpdate={onTime} onEnded={() => setPlaying(false)} aria-label={title} /> : <audio ref={(node) => { ref.current = node; }} src={src} preload="metadata" onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)} onTimeUpdate={onTime} onEnded={() => setPlaying(false)} aria-label={title} />}
    <div className="media-player-controls"><button type="button" className="media-play-button" onClick={() => void toggle()} aria-label={playing ? "توقف" : "پخش"}>{playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}</button><div className="media-player-track"><input type="range" min="0" max="100" step="0.1" value={progress} onChange={seek} aria-label="میزان پیشرفت پخش" /><div className="flex justify-between text-[10px] tabular-nums text-ink-500"><span>{time((progress / 100) * duration)}</span><span>{time(duration)}</span></div></div><button type="button" className="media-volume-button" onClick={() => { if (ref.current) { ref.current.muted = !muted; setMuted(!muted); } }} aria-label={muted ? "فعال‌کردن صدا" : "بی‌صدا کردن"}>{muted ? <VolumeX size={15} /> : <Volume2 size={15} />}</button></div>
  </div>;
}
