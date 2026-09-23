export default function Loading() {
  return (
    <main className="container-ay py-8 sm:py-12">
      <div className="animate-pulse space-y-6">
        <div className="h-56 rounded-[28px] bg-white/[.035]" />
        <div className="h-14 rounded-2xl bg-white/[.035]" />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-[22px] border border-white/[.06] bg-white/[.02]">
              <div className="aspect-[16/10] bg-white/[.035]" />
              <div className="space-y-3 p-5">
                <div className="h-5 w-2/3 rounded bg-white/[.05]" />
                <div className="h-4 w-full rounded bg-white/[.04]" />
                <div className="h-4 w-4/5 rounded bg-white/[.04]" />
                <div className="h-10 rounded-xl bg-white/[.04]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
