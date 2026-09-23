"use client";

import Link from "next/link";

export default function PluginsError() {
  return (
    <main className="container-ay py-16">
      <div className="card-ay mx-auto max-w-xl p-10 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-red-300/15 bg-red-300/[.05] text-lg">!</div>
        <h1 className="text-xl font-semibold text-sand-50">کتابخانه پلاگین موقتاً در دسترس نیست</h1>
        <p className="mt-3 text-sm leading-7 text-ink-400">یک خطای موقت در بارگذاری این بخش رخ داد. دوباره تلاش کنید.</p>
        <Link href="/plugins" className="btn-primary mt-6 inline-flex">تلاش دوباره</Link>
      </div>
    </main>
  );
}
