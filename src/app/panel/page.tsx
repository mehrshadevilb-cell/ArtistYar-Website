"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

export default function PanelHomePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="card-ay p-6">
        <p className="text-xs text-ink-500">خوش آمدی</p>
        <h2 className="mt-2 text-xl font-semibold text-sand-50">{user?.fullName || user?.username || "هنرجو"}</h2>
        <p className="mt-3 text-sm leading-7 text-ink-400">
          پنل هنرجو بدون داده آزمایشی است. دوره‌ها و رزروهای واقعی پس از اتصال حساب به ربات راه‌یار اینجا نمایش داده می‌شوند.
        </p>
      </div>

      <div className="dashboard-panel card-ay p-6">
        <h2 className="text-lg font-medium text-sand-50">اقدام سریع</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/online" className="btn-ghost !py-2 text-xs">
            رزرو کلاس جدید
          </Link>
          <Link href="/panel/profile" className="btn-primary !py-2 text-xs">
            اتصال به ربات
          </Link>
          <Link href="/courses" className="btn-ghost !py-2 text-xs">
            مشاهده دوره‌ها
          </Link>
        </div>
      </div>
    </div>
  );
}
