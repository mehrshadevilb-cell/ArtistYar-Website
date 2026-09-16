"use client";

import { useEffect, useState } from "react";

type AiStatus = {
  ok?: boolean;
  source?: string;
  chat_assistant_enabled?: boolean;
  self_check?: string;
  agent_status?: string;
  note?: string;
  error?: string;
};

export default function AdminAiPage() {
  const [data, setData] = useState<AiStatus | null>(null);

  function load() {
    fetch("/api/rahyar/ai-status")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ ok: false, error: "fetch failed" }));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-medium text-sand-50">AI Agent · پل ربات</h2>
        <button type="button" className="btn-ghost !py-2 text-xs" onClick={load}>
          بروزرسانی
        </button>
      </div>

      <div className="card-ay space-y-3 p-6 text-sm">
        <p className="text-ink-300">
          منبع:{" "}
          <span className="text-gold-400">{data?.source ?? "..."}</span>
        </p>
        <p className="text-ink-300">
          Chat Assistant:{" "}
          <span className="text-gold-400">
            {data?.chat_assistant_enabled ? "فعال" : "خاموش / نامشخص"}
          </span>
        </p>
        {data?.note ? <p className="text-xs text-ink-500">{data.note}</p> : null}
        {data?.error ? <p className="text-xs text-red-400">{data.error}</p> : null}
      </div>

      <div className="card-ay p-6">
        <h3 className="text-sm font-medium text-sand-50">Self-Check</h3>
        <pre className="mt-3 whitespace-pre-wrap text-xs leading-6 text-ink-400">
          {data?.self_check || "..."}
        </pre>
      </div>

      <div className="card-ay p-6">
        <h3 className="text-sm font-medium text-sand-50">Agent Status</h3>
        <pre className="mt-3 whitespace-pre-wrap text-xs leading-6 text-ink-400">
          {data?.agent_status || "..."}
        </pre>
      </div>

      <p className="text-xs leading-6 text-ink-500">
        Taskهای نوشتن کد (Fix / Feature / PR) فقط از تلگرام ادمین اجرا می‌شوند تا سطح حمله
        وب باز نشود. سایت و ربات از یک provider و یک دیتابیس برای دستیار آموزشی استفاده
        می‌کنند.
      </p>
    </div>
  );
}
