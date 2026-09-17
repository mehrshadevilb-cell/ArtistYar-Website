"use client";

import { useMemo, useState } from "react";
import { licenseStats, spotplayerLicenses, spotplayerLicensesImportedAt } from "@/data/spotplayer-licenses";
import { listLocalMembers } from "@/lib/auth";

function formatBytes(n: number) {
  if (n <= 0) return "۰";
  if (n < 1024 ** 2) return `${Math.round(n / 1024)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(1)} GB`;
}

function formatWatch(sec: number) {
  if (sec <= 0) return "۰";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}س ${m}د`;
  return `${m} دقیقه`;
}

export default function AdminStudentsPage() {
  const [q, setQ] = useState("");
  const stats = licenseStats();
  const localWeb = listLocalMembers();

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return spotplayerLicenses;
    return spotplayerLicenses.filter(
      (l) =>
        l.name.toLowerCase().includes(needle) ||
        l.phone.includes(needle) ||
        l.courses.some((c) => c.toLowerCase().includes(needle)),
    );
  }, [q]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium text-sand-50">هنرجویان SpotPlayer</h2>
          <p className="mt-1 text-xs leading-6 text-ink-500">
            {stats.total} لایسنس از فایل واقعی ({spotplayerLicensesImportedAt}) · {stats.activated} فعال · {stats.inactive}{" "}
            غیرفعال
          </p>
        </div>
        <input
          className="input-ay max-w-xs"
          placeholder="جستجو نام / موبایل / دوره…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="card-ay overflow-x-auto">
        <table className="w-full min-w-[720px] text-right text-sm">
          <thead className="border-b border-white/[0.06] text-xs text-ink-500">
            <tr>
              <th className="px-4 py-3 font-medium">نام</th>
              <th className="px-4 py-3 font-medium">موبایل</th>
              <th className="px-4 py-3 font-medium">دوره‌ها</th>
              <th className="px-4 py-3 font-medium">وضعیت</th>
              <th className="px-4 py-3 font-medium">تماشا</th>
              <th className="px-4 py-3 font-medium">دانلود</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => (
              <tr key={l.id} className="border-b border-white/[0.04] last:border-0">
                <td className="px-4 py-3 text-sand-100">{l.name}</td>
                <td className="px-4 py-3 tabular-nums text-ink-300" dir="ltr">
                  {l.phone}
                </td>
                <td className="px-4 py-3 text-xs leading-6 text-ink-400">{l.courses.join(" · ")}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] ${
                      l.activated ? "bg-emerald-400/10 text-emerald-300" : "bg-white/[.06] text-ink-500"
                    }`}
                  >
                    {l.activated ? "فعال" : "فعال‌نشده"}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink-300">{formatWatch(l.watch_seconds)}</td>
                <td className="px-4 py-3 text-ink-300">{formatBytes(l.download_bytes)}</td>
              </tr>
            ))}
            {!filtered.length ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink-500">
                  نتیجه‌ای یافت نشد.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {localWeb.length ? (
        <div className="card-ay p-5">
          <h3 className="text-sm font-medium text-sand-50">ثبت‌نام‌های وب‌سایت (محلی)</h3>
          <ul className="mt-3 space-y-2 text-xs text-ink-400">
            {localWeb.map((m) => (
              <li key={m.id}>
                {m.fullName} · {m.username}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
