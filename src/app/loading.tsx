export default function Loading() {
  return (
    <div className="container-ay flex min-h-[55vh] items-center justify-center py-20" role="status" aria-live="polite">
      <div className="w-full max-w-2xl space-y-5">
        <div className="h-3 w-28 animate-pulse rounded-full bg-gold-500/20" />
        <div className="h-12 w-3/4 animate-pulse rounded-2xl bg-white/[.06]" />
        <div className="h-4 w-full animate-pulse rounded-full bg-white/[.04]" />
        <div className="h-4 w-2/3 animate-pulse rounded-full bg-white/[.04]" />
        <span className="sr-only">در حال بارگذاری…</span>
      </div>
    </div>
  );
}

