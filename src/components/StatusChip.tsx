export function StatusChip({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "gold" | "ok" | "warn";
  children: React.ReactNode;
}) {
  const tones = {
    neutral: "border-white/10 text-ink-400",
    gold: "border-gold-500/30 text-gold-400",
    ok: "border-emerald-500/30 text-emerald-400",
    warn: "border-amber-500/30 text-amber-400",
  } as const;

  return (
    <span
      className={`status-chip inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
