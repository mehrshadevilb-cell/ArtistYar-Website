export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        aria-hidden
        className="relative flex h-9 w-9 items-center justify-center rounded-2xl border border-gold-500/30 bg-gradient-to-br from-gold-500/20 to-transparent"
      >
        <span className="h-3.5 w-3.5 rounded-full bg-gold-400 shadow-[0_0_18px_rgba(201,162,39,0.55)]" />
        <span className="absolute -bottom-0.5 h-0.5 w-5 rounded-full bg-gold-500/70" />
      </span>
      <span className="leading-none">
        <span className="block text-[15px] font-semibold tracking-tight text-sand-50">
          آرتیست‌یار
        </span>
        <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.22em] text-ink-400">
          ArtistYar
        </span>
      </span>
    </span>
  );
}
