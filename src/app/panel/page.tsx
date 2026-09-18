"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { CommunityLinks } from "@/components/CommunityLinks";
import { communityLinks } from "@/data/community";

export default function PanelHomePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="card-ay p-6 sm:p-7">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-500">خوش آمدی</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-sand-50 sm:text-2xl">
          {user?.fullName || user?.username || "هنرجو"}
        </h2>
        <p className="mt-3 text-sm leading-7 text-ink-400">
          پنل هنرجو به حساب واقعی راه‌یار وصل می‌شود. دوره‌ها و رزروها پس از پرداخت و تأیید اینجا نمایش داده
          می‌شوند.
        </p>
      </div>

      <div className="dashboard-panel card-ay p-6 sm:p-7">
        <h2 className="text-lg font-medium text-sand-50">اقدام سریع</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/online" className="btn-ghost min-h-11 !py-2 text-xs">
            رزرو کلاس جدید
          </Link>
          <Link href="/panel/profile" className="btn-primary min-h-11 !py-2 text-xs">
            اتصال به ربات
          </Link>
          <Link href="/courses" className="btn-ghost min-h-11 !py-2 text-xs">
            مشاهده دوره‌ها
          </Link>
          <Link href="/assistant" className="btn-ghost min-h-11 !py-2 text-xs">
            راه‌یار AI
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <a
          href={communityLinks.telegramGroup.href}
          target="_blank"
          rel="noopener noreferrer"
          className="card-ay ay-pressable block p-5 transition hover:border-gold-500/30"
        >
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-ink-500">تلگرام</p>
          <strong className="mt-2 block text-base text-sand-50">گروه پرسش و پاسخ</strong>
          <p className="mt-2 text-sm leading-7 text-ink-400">سؤال بپرس و از تجربه هم‌مسیرها استفاده کن.</p>
          <span className="mt-3 inline-flex text-xs font-medium text-gold-400">ProAudiosGP ←</span>
        </a>
        <a
          href={communityLinks.telegramPlugins.href}
          target="_blank"
          rel="noopener noreferrer"
          className="card-ay ay-pressable block p-5 transition hover:border-gold-500/30"
        >
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-ink-500">ابزار</p>
          <strong className="mt-2 block text-base text-sand-50">کانال VST و پلاگین</strong>
          <p className="mt-2 text-sm leading-7 text-ink-400">دانلود و معرفی پلاگین‌های تولید موسیقی.</p>
          <span className="mt-3 inline-flex text-xs font-medium text-gold-400">ProAudios ←</span>
        </a>
      </div>

      <CommunityLinks variant="pills" className="pt-2" />
    </div>
  );
}
