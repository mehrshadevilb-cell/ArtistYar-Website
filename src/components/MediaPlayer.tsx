"use client";

import { Pause, Play, Volume2, VolumeX, Music2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function toFaDigits(value: string | number) {
  return String(value).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "۰:۰۰";
  const m = Math.floor(value / 60);
  const s = Math.floor(value % 60);
  return toFaDigits(`${m}:${String(s).padStart(2, "0")}`);
}

type MediaPlayerProps = {
  src: string;
  kind: "audio" | "video";
  title: string;
  coverUrl?: string | null;
  artist?: string | null;
  album?: string | null;
  genre?: string | null;
  year?: number | null;
};

export function MediaPlayer({
  src,
  kind,
  title,
  coverUrl,
  artist,
  album,
  genre,
  year,
}: MediaPlayerProps) {
  const ref = useRef<HTMLMediaElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [coverError, setCoverError] = useState(false);

  useEffect(() => {
    setPlaying(false);
    setProgress(0);
    setDuration(0);
    setMuted(false);
    setReady(false);
    setFailed(false);
    setCoverError(false);
  }, [src]);

  async function toggle() {
    if (!ref.current || failed) return;
    if (ref.current.paused) {
      try {
        await ref.current.play();
        setPlaying(true);
      } catch {
        setFailed(true);
      }
    } else {
      ref.current.pause();
      setPlaying(false);
    }
  }

  function seek(event: React.ChangeEvent<HTMLInputElement>) {
    if (!ref.current || !duration) return;
    const next = Number(event.target.value);
    ref.current.currentTime = (next / 100) * duration;
    setProgress(next);
  }

  function onTime() {
    if (!ref.current || !duration) return;
    setProgress((ref.current.currentTime / duration) * 100);
  }

  function onLoaded(event: React.SyntheticEvent<HTMLMediaElement>) {
    const d = event.currentTarget.duration;
    if (Number.isFinite(d)) setDuration(d);
    setReady(true);
  }

  const hasMeta = Boolean(artist || album || genre || year);
  const showCover = kind === "audio" && coverUrl && !coverError;

  return (
    <div
      className={`media-player rounded-2xl border border-white/[.08] bg-white/[.03] overflow-hidden ${
        kind === "video" ? "media-player-video" : "media-player-audio"
      } ${failed ? "media-player-failed" : ""}`}
    >
      {kind === "video" ? (
        <video
          ref={(node) => {
            ref.current = node;
          }}
          src={src}
          preload="metadata"
          poster={coverUrl || undefined}
          onLoadedMetadata={onLoaded}
          onCanPlay={() => setReady(true)}
          onTimeUpdate={onTime}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            setProgress(100);
          }}
          onError={() => setFailed(true)}
          aria-label={title}
          className="aspect-video w-full bg-black object-cover"
        />
      ) : (
        <>
          <audio
            ref={(node) => {
              ref.current = node;
            }}
            src={src}
            preload="metadata"
            onLoadedMetadata={onLoaded}
            onCanPlay={() => setReady(true)}
            onTimeUpdate={onTime}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => {
              setPlaying(false);
              setProgress(100);
            }}
            onError={() => setFailed(true)}
            aria-label={title}
          />
          <div className="flex gap-4 p-4 sm:p-5">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/[.1] bg-gradient-to-br from-gold-500/20 to-ink-900 sm:h-24 sm:w-24">
              {showCover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverUrl!}
                  alt={`کاور ${title}`}
                  className="h-full w-full object-cover"
                  onError={() => setCoverError(true)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gold-400/70">
                  <Music2 size={28} strokeWidth={1.5} />
                </div>
              )}
              {playing ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                  <span className="flex gap-0.5">
                    <i className="media-eq-bar h-3 w-1 animate-pulse rounded-full bg-gold-300" />
                    <i className="media-eq-bar h-5 w-1 animate-pulse rounded-full bg-gold-300 [animation-delay:120ms]" />
                    <i className="media-eq-bar h-2 w-1 animate-pulse rounded-full bg-gold-300 [animation-delay:240ms]" />
                  </span>
                </div>
              ) : null}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-sand-50">{title}</p>
              {hasMeta ? (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {artist ? (
                    <span className="media-tag rounded-full border border-white/[.1] bg-white/[.04] px-2 py-0.5 text-[10px] text-ink-300">
                      {artist}
                    </span>
                  ) : null}
                  {album ? (
                    <span className="media-tag rounded-full border border-white/[.1] bg-white/[.04] px-2 py-0.5 text-[10px] text-ink-300">
                      {album}
                    </span>
                  ) : null}
                  {genre ? (
                    <span className="media-tag rounded-full border border-white/[.1] bg-white/[.04] px-2 py-0.5 text-[10px] text-ink-300">
                      {genre}
                    </span>
                  ) : null}
                  {year ? (
                    <span className="media-tag rounded-full border border-white/[.1] bg-white/[.04] px-2 py-0.5 text-[10px] text-ink-300">
                      {toFaDigits(year)}
                    </span>
                  ) : null}
                </div>
              ) : (
                <p className="mt-1 text-[11px] text-ink-500">فایل صوتی</p>
              )}
            </div>
          </div>
        </>
      )}

      {failed ? (
        <div className="media-player-message border-t border-white/[.08] p-4 text-sm text-ink-400">
          پخش این فایل ممکن نیست.{" "}
          <a href={src} target="_blank" rel="noreferrer" className="text-gold-400 hover:text-gold-300">
            بازکردن مستقیم فایل
          </a>
        </div>
      ) : (
        <div className="media-player-controls flex items-center gap-3 border-t border-white/[.08] px-4 py-3">
          <button
            type="button"
            className="media-play-button flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-400 text-ink-950 transition hover:bg-gold-300 disabled:opacity-40"
            onClick={() => void toggle()}
            disabled={!ready}
            aria-label={playing ? "توقف" : "پخش"}
          >
            {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ms-0.5" />}
          </button>

          <div className="media-player-track min-w-0 flex-1">
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={progress}
              onChange={seek}
              disabled={!ready}
              aria-label="میزان پیشرفت پخش"
              className="media-seek w-full accent-gold-400"
            />
            <div className="mt-1 flex justify-between text-[10px] tabular-nums text-ink-500">
              <span>{formatTime((progress / 100) * duration)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <button
            type="button"
            className="media-volume-button flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-300 transition hover:bg-white/[.06] hover:text-sand-50 disabled:opacity-40"
            onClick={() => {
              if (ref.current) {
                ref.current.muted = !muted;
                setMuted(!muted);
              }
            }}
            disabled={!ready}
            aria-label={muted ? "فعال‌کردن صدا" : "بی‌صدا کردن"}
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>
      )}
    </div>
  );
}
