"use client";

import { useEffect, useState } from "react";
import { listLocalMembers, type SessionUser } from "@/lib/auth";

export default function AdminStudentsPage() {
  const [members, setMembers] = useState<SessionUser[]>([]);

  useEffect(() => {
    setMembers(listLocalMembers());
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium text-sand-50">هنرجویان و اعضا</h2>
          <p className="mt-1 text-xs leading-6 text-ink-500">
            فعلاً از ثبت‌نام محلی سایت خوانده می‌شود. پس از اتصال کامل احراز هویت راه‌یار، لیست از backend می‌آید.
          </p>
        </div>
        <span className="text-xs text-ink-500">{members.length} عضو</span>
      </div>
      <div className="card-ay overflow-hidden">
        <table className="w-full text-right text-sm">
          <thead className="border-b border-white/[0.06] text-xs text-ink-500">
            <tr>
              <th className="px-4 py-3 font-medium">نام</th>
              <th className="px-4 py-3 font-medium">نام کاربری</th>
              <th className="px-4 py-3 font-medium">نقش</th>
              <th className="px-4 py-3 font-medium">تلگرام</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b border-white/[0.04] last:border-0">
                <td className="px-4 py-3 text-sand-100">{m.fullName}</td>
                <td className="px-4 py-3 text-ink-300">{m.username}</td>
                <td className="px-4 py-3 text-ink-300">{m.role === "admin" ? "ادمین" : "هنرجو"}</td>
                <td className="px-4 py-3 text-ink-400">{m.telegramLinked ? m.telegramId || "متصل" : "—"}</td>
              </tr>
            ))}
            {!members.length ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-ink-500">
                  هنوز عضوی ثبت نشده است.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
