"use client";

import Link from "next/link";
import { CommunityLinks } from "@/components/CommunityLinks";

export default function PanelReservationsPage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-medium tracking-tight text-sand-50">رزرو کلاس‌ها</h2>
          <p className="mt-2 text-xs leading-6 text-ink-400">
            رزرو زنده پس از اتصال کامل API به سیستم راه‌یار فعال می‌شود. تا آن زمان
            لیست خالی است و داده‌ی نمایشی نمایش داده نمی‌شود.
          </p>
        </div>
        <Link href="/online" className="btn-primary min-h-11 !py-2 text-xs">
          درخواست کلاس جدید
        </Link>
      </div>

      <div className="card-ay border-dashed p-8 text-center">
        <p className="text-sm text-sand-100">هنوز رزروی برای نمایش نیست.</p>
        <p className="mt-2 text-xs leading-6 text-ink-400">
          پس از اتصال API راه‌یار، رزروهای تأیید‌شده اینجا ظاهر می‌شوند. فعلاً از
          «درخواست کلاس جدید» استفاده کن.
        </p>
        <Link href="/online" className="btn-ghost mt-5 inline-flex min-h-11 !py-2 text-xs">
          رفتن به صفحه رزرو آنلاین
        </Link>
      </div>

      <CommunityLinks variant="pills" />
    </div>
  );
}
