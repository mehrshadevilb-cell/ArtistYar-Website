import Link from "next/link";

export default function PluginNotFound() {
  return (
    <main className="mx-auto max-w-lg px-4 py-20 text-center" dir="rtl">
      <h1 className="text-xl font-semibold text-sand-50">پلاگین یافت نشد</h1>
      <p className="mt-2 text-sm text-ink-400">
        این پلاگین منتشر نشده یا حذف شده است.
      </p>
      <Link href="/plugins" className="btn-primary mt-6 inline-flex">
        بازگشت به کتابخانه
      </Link>
    </main>
  );
}
