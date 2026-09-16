"use client";

import { useEffect } from "react";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Keep the client boundary intentionally quiet; server logs contain the details.
  }, []);

  return (
    <section className="container-ay flex min-h-[60vh] items-center justify-center py-20 text-center">
      <div className="card-ay max-w-lg p-8 sm:p-10">
        <p className="eyebrow">خطای موقت / ArtistYar</p>
        <h1 className="mt-4 text-3xl font-semibold text-sand-50">این بخش آماده نشد</h1>
        <p className="mt-4 text-sm leading-8 text-ink-400">
          مشکل از سمت ماست. دوباره تلاش کن؛ اگر ادامه داشت، از مسیر پشتیبانی خبر بده.
        </p>
        <button type="button" onClick={() => reset()} className="btn-primary mt-7">
          تلاش دوباره
        </button>
      </div>
    </section>
  );
}

