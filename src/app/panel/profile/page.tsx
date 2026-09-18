"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Crown } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { communityLinks } from "@/data/community";

export default function PanelProfilePage() {
  const { user, linkTelegram } = useAuth();
  const [msg, setMsg] = useState("");
  const [practiceStatus, setPracticeStatus] = useState<{ pro: boolean; expiresAt: string | null; remaining: number } | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    fetch("/api/practice/status?userId=" + encodeURIComponent(user.id), { cache: "no-store", credentials: "include" })
      .then((response) => response.json())
      .then((data) => { if (data?.ok) setPracticeStatus({ pro: Boolean(data.pro), expiresAt: data.proExpiresAt || null, remaining: Number(data.remaining) || 0 }); })
      .catch(() => {});
  }, [user?.id]);

  function onLink(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const telegramId = String(fd.get("telegramId") || "").trim();
    if (!telegramId) {
      setMsg("شناسه تلگرام را وارد کنید.");
      return;
    }
    linkTelegram(telegramId);
    setMsg("همگام‌سازی دمو ذخیره شد. اتصال واقعی در فاز API انجام می‌شود.");
  }

  return (
    <div className="space-y-6">
      <div className="card-ay p-6 sm:p-7">
        <h2 className="text-lg font-medium text-sand-50">پروفایل</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-4 border-b border-white/[0.05] pb-3">
            <dt className="text-ink-500">نام</dt>
            <dd className="text-sand-100">{user?.fullName}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-white/[0.05] pb-3">
            <dt className="text-ink-500">نام کاربری</dt>
            <dd className="text-sand-100">{user?.username}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-500">ربات تلگرام</dt>
            <dd className={user?.telegramLinked ? "text-gold-400" : "text-ink-400"}>
              {user?.telegramLinked ? `متصل · ${user.telegramId}` : "متصل نیست"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="card-ay p-6 sm:p-7">
        <h2 className="text-lg font-medium text-sand-50">همگام‌سازی با ربات</h2>
        <p className="mt-2 text-sm leading-7 text-ink-400">
          با وارد کردن شناسه تلگرام، حساب وب برای لینک بعدی به اکانت ربات علامت‌گذاری می‌شود. تأیید امن از سمت
          backend راه‌یار خواهد بود.
        </p>
        <form className="mt-5 space-y-3" onSubmit={onLink}>
          <label htmlFor="telegram-id" className="sr-only">
            شناسه تلگرام
          </label>
          <input
            id="telegram-id"
            className="input-ay"
            name="telegramId"
            placeholder="مثال: 123456789…"
            inputMode="numeric"
            autoComplete="off"
            defaultValue={user?.telegramId || ""}
          />
          <button type="submit" className="btn-primary min-h-11 !text-xs">
            ذخیره لینک
          </button>
        </form>
        {msg ? (
          <p className="mt-3 text-xs text-gold-400" aria-live="polite">
            {msg}
          </p>
        ) : null}
      </div>

      <div className="card-ay border-gold-400/15 p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2"><Crown size={17} className={practiceStatus?.pro ? "text-emerald-300" : "text-gold-300"} /><h2 className="text-lg font-medium text-sand-50">اشتراک Practice Pro</h2></div>
            <p className="mt-2 text-sm leading-7 text-ink-400">تمرین‌های پیشرفته‌ی گوش، مسیرهای میکس و Voicing روزانه از اینجا قابل مشاهده است.</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-[11px] ${practiceStatus?.pro ? "bg-emerald-400/10 text-emerald-200" : "bg-white/[.06] text-ink-400"}`}>{practiceStatus?.pro ? "فعال" : "رایگان"}</span>
        </div>
        <p className="mt-3 text-xs text-ink-500">{practiceStatus?.pro && practiceStatus.expiresAt ? `فعال تا ${new Date(practiceStatus.expiresAt).toLocaleDateString("fa-IR")}` : "سهمیه رایگان روزانه فعال است؛ برای فعال‌سازی Pro با ادمین تماس بگیر."}</p>
        <Link href="/profile/practice" className="btn-primary mt-4 inline-flex !px-4 !py-2 text-xs">مشاهده پروفایل تمرین</Link>
      </div>

      <div className="card-ay p-6 sm:p-7">
        <h2 className="text-lg font-medium text-sand-50">لینک‌های مفید</h2>
        <ul className="mt-4 space-y-3 text-sm">
          <li>
            <a
              href={communityLinks.telegramGroup.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold-400 hover:text-gold-300"
            >
              گروه پرسش و پاسخ (ProAudiosGP)
            </a>
          </li>
          <li>
            <a
              href={communityLinks.telegramPlugins.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold-400 hover:text-gold-300"
            >
              کانال VST و پلاگین (ProAudios)
            </a>
          </li>
          <li>
            <a
              href={communityLinks.instagram.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold-400 hover:text-gold-300"
            >
              اینستاگرام @prodbymehrshad
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
