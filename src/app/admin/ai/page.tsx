"use client";

import { useCallback, useEffect, useState } from "react";

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
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/rahyar/ai-status")
      .then((r) => r.json())
      .then((json) => {
        setData(json);
        setUpdatedAt(new Date().toLocaleTimeString("fa-IR"));
      })
      .catch(() => setData({ ok: false, error: "fetch failed — اتصال به ربات برقرار نشد" }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const assistantOn = Boolean(data?.chat_assistant_enabled);
  const healthy = data?.ok !== false && !data?.error;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium text-sand-50">AI Agent · پل ربات</h2>
          {updatedAt ? (
            <p className="mt-1 text-xs text-ink-500">آخرین بروزرسانی: {updatedAt}</p>
          ) : null}
        </div>
        <button
          type="button"
          className="btn-ghost !py-2 text-xs"
          onClick={load}
          disabled={loading}
        >
          {loading ? "در حال بارگذاری…" : "بروزرسانی"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card-ay p-4">
          <p className="text-xs text-ink-500">وضعیت کلی</p>
          <p className={`mt-1 text-sm font-medium ${healthy ? "text-emerald-400" : "text-red-400"}`}>
            {loading ? "…" : healthy ? "سالم" : "مشکل"}
          </p>
        </div>
        <div className="card-ay p-4">
          <p className="text-xs text-ink-500">Chat Assistant</p>
          <p className={`mt-1 text-sm font-medium ${assistantOn ? "text-gold-400" : "text-ink-400"}`}>
            {loading ? "…" : assistantOn ? "فعال" : "خاموش / نامشخص"}
          </p>
        </div>
        <div className="card-ay p-4">
          <p className="text-xs text-ink-500">منبع</p>
          <p className="mt-1 text-sm font-medium text-sand-50">
            {loading ? "…" : data?.source ?? "—"}
          </p>
        </div>
      </div>

      <div className="card-ay space-y-3 p-6 text-sm">
        {data?.note ? <p className="text-xs text-ink-500">{data.note}</p> : null}
        {data?.error ? <p className="text-xs text-red-400">{data.error}</p> : null}
        {!data && !loading ? (
          <p className="text-xs text-ink-500">هنوز داده‌ای دریافت نشده.</p>
        ) : null}
      </div>

      <div className="card-ay p-6">
        <h3 className="text-sm font-medium text-sand-50">Self-Check</h3>
        <pre className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap text-xs leading-6 text-ink-400">
          {loading ? "در حال بارگذاری…" : data?.self_check || "—"}
        </pre>
      </div>

      <div className="card-ay p-6">
        <h3 className="text-sm font-medium text-sand-50">Agent Status</h3>
        <pre className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap text-xs leading-6 text-ink-400">
          {loading ? "در حال بارگذاری…" : data?.agent_status || "—"}
        </pre>
      </div>

      <p className="text-xs leading-6 text-ink-500">
        Taskهای نوشتن کد (Fix / Feature / PR) فقط از تلگرام ادمین اجرا می‌شوند تا سطح حمله
        وب باز نشود. سایت و ربات از یک provider و یک دیتابیس برای دستیار آموزشی استفاده
        می‌کنند. برای پیشرفت خودکار وقتی owner آنلاین نیست، از پنل تلگرام Diagnostics /
        Test Models و در صورت نیاز AI_AGENT_WRITE_ENABLED استفاده کنید.
      </p>
    </div>
  );
}
