"use client";

import { useMemo, useRef, useState } from "react";
import { Upload, Play, Square } from "lucide-react";
import { CoreEarGym } from "@/components/CoreEarGym";

type Props = { onBack?: () => void };

export function UserAudioLab({ onBack }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const [error, setError] = useState("");
  const sizeLabel = useMemo(() => file ? (file.size / 1024 / 1024).toFixed(1) + " MB" : "", [file]);

  const pickFile = (next: File | null) => {
    setError("");
    if (!next) return;
    if (!next.type.startsWith("audio/")) return setError("فقط فایل صوتی مجاز است.");
    if (next.size > 30 * 1024 * 1024) return setError("برای تمرین مرورگری، حجم فایل باید حداکثر ۳۰ مگابایت باشد.");
    if (url) URL.revokeObjectURL(url);
    setFile(next);
    setUrl(URL.createObjectURL(next));
  };

  return (
    <section className="container-ay py-8" dir="rtl">
      <button type="button" className="btn-ghost !px-3 !py-2 text-xs" onClick={onBack}>بازگشت</button>
      <div className="card-ay mt-5 p-6 sm:p-8">
        <p className="eyebrow text-violet-300">USER AUDIO LAB</p>
        <h1 className="mt-3 text-2xl font-semibold text-sand-50">آزمایشگاه صوت شخصی</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-ink-400">فایل صوتی فقط در مرورگر باز می‌شود و به سرور ارسال نمی‌شود.</p>
        <label className="mt-6 flex cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed border-violet-300/30 bg-violet-300/[.04] p-8 text-sm text-ink-300">
          <Upload size={18} /> انتخاب فایل صوتی
          <input type="file" accept="audio/*" className="sr-only" onChange={(e) => pickFile(e.target.files?.[0] || null)} />
        </label>
        {error ? <p className="mt-3 text-xs text-red-300">{error}</p> : null}
        {file && url ? (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[.025] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><strong className="block text-sm text-sand-50">{file.name}</strong><span className="text-xs text-ink-500">{sizeLabel}</span></div>
              <div className="flex gap-2">
                <button type="button" className="btn-primary !px-3 !py-2 text-xs" onClick={() => void audioRef.current?.play()}><Play size={13} /> پخش</button>
                <button type="button" className="btn-ghost !px-3 !py-2 text-xs" onClick={() => audioRef.current?.pause()}><Square size={13} /> توقف</button>
              </div>
            </div>
            <audio ref={audioRef} src={url} controls className="mt-4 w-full" />
          </div>
        ) : null}
      </div>
      <div className="mt-5"><CoreEarGym onBack={onBack} title="تمرین شنیداری مهارت‌های میکس" /></div>
    </section>
  );
}
