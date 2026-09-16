import Link from "next/link";

export default function NotFound() {
  return (
    <section className="container-ay flex min-h-[55vh] items-center justify-center py-20 text-center">
      <div className="card-ay max-w-lg p-8 sm:p-10">
        <p className="eyebrow">404 / ArtistYar</p>
        <h1 className="mt-4 text-3xl font-semibold text-sand-50">این مسیر پیدا نشد</h1>
        <p className="mt-4 text-sm leading-8 text-ink-400">
          صفحه‌ای که دنبالش بودی وجود ندارد یا جابه‌جا شده است. از مسیرهای اصلی ادامه بده.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn-primary">
            بازگشت به خانه
          </Link>
          <Link href="/courses" className="btn-ghost">
            دیدن مسیرها
          </Link>
        </div>
      </div>
    </section>
  );
}

