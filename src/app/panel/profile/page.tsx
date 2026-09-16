"use client";

import { FormEvent, useState } from "react";
import { useAuth } from "@/components/AuthProvider";

export default function PanelProfilePage() {
  const { user, linkTelegram } = useAuth();
  const [msg, setMsg] = useState("");

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
      <div className="card-ay p-6">
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

      <div className="card-ay p-6">
        <h2 className="text-lg font-medium text-sand-50">همگام‌سازی با ربات</h2>
        <p className="mt-2 text-sm leading-7 text-ink-400">
          با وارد کردن شناسه تلگرام، حساب وب برای لینک بعدی به اکانت ربات علامت‌گذاری
          می‌شود. تأیید امن از سمت backend راه‌یار خواهد بود.
        </p>
        <form className="mt-5 space-y-3" onSubmit={onLink}>
          <input
            className="input-ay"
            name="telegramId"
            placeholder="مثال: 123456789"
            defaultValue={user?.telegramId || ""}
          />
          <button type="submit" className="btn-primary !text-xs">
            ذخیره لینک
          </button>
        </form>
        {msg ? <p className="mt-3 text-xs text-gold-400">{msg}</p> : null}
      </div>
    </div>
  );
}
