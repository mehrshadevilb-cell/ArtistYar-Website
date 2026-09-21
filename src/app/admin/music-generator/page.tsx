"use client";

import { useCallback, useEffect, useState } from "react";

type TokenView = {
  id: string;
  label: string;
  providerKind: string;
  baseUrl: string;
  apiKeyMasked: string;
  modelId: string | null;
  path: string;
  enabled: boolean;
  priority: number;
  creditsTotal: number | null;
  creditsRemaining: number | null;
  requestCount: number;
  successCount: number;
  failCount: number;
  lastUsedAt: string | null;
  lastError: string | null;
};

type UsageRow = {
  id: string;
  token_id: string;
  user_id: string | null;
  success: boolean;
  credits_used: number;
  latency_ms: number | null;
  error_message: string | null;
  created_at: string;
};

export default function AdminMusicGeneratorPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokens, setTokens] = useState<TokenView[]>([]);
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [summary, setSummary] = useState<{
    tokenCount: number;
    enabledCount: number;
    totalRequests: number;
    totalSuccess: number;
    totalFail: number;
    creditsRemaining: number;
    creditsTotal: number;
  } | null>(null);
  const [freeCredits, setFreeCredits] = useState(3);

  const [label, setLabel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [modelId, setModelId] = useState("");
  const [path, setPath] = useState("/music/generate");
  const [providerKind, setProviderKind] = useState("openai_compat");
  const [creditsTotal, setCreditsTotal] = useState("");
  const [busy, setBusy] = useState(false);

  const [grantUserId, setGrantUserId] = useState("");
  const [grantAmount, setGrantAmount] = useState("10");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ov, us] = await Promise.all([
        fetch("/api/admin/music-generator?section=overview", { credentials: "include", cache: "no-store" }),
        fetch("/api/admin/music-generator?section=usage", { credentials: "include", cache: "no-store" }),
      ]);
      const ovData = await ov.json().catch(() => ({}));
      const usData = await us.json().catch(() => ({}));
      if (!ov.ok || !ovData.ok) {
        setError(ovData.error || "خطا در بارگذاری");
        return;
      }
      setSummary(ovData.summary);
      setTokens(ovData.summary?.tokens || []);
      setFreeCredits(ovData.freeCreditsPerUser ?? 3);
      if (us.ok && usData.ok) setUsage(usData.items || []);
    } catch {
      setError("ارتباط با سرور برقرار نشد");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/music-generator", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_token",
          label,
          baseUrl,
          apiKey,
          modelId: modelId || undefined,
          path: path || undefined,
          providerKind,
          creditsTotal: creditsTotal ? Number(creditsTotal) : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error || "ثبت توکن ناموفق");
        return;
      }
      setLabel("");
      setBaseUrl("");
      setApiKey("");
      setModelId("");
      setCreditsTotal("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function toggleEnabled(t: TokenView) {
    setBusy(true);
    try {
      await fetch("/api/admin/music-generator", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_token", id: t.id, enabled: !t.enabled }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function removeToken(id: string) {
    if (!confirm("این توکن حذف شود؟")) return;
    setBusy(true);
    try {
      await fetch("/api/admin/music-generator", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_token", id }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function onGrant(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/music-generator", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "grant_credits",
          userId: grantUserId.trim(),
          amount: Number(grantAmount),
          paymentId: `admin-manual-${Date.now()}`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error || "اعطای اعتبار ناموفق");
        return;
      }
      alert(`اعتبار جدید کاربر: ${data.balance}`);
      setGrantUserId("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8" dir="rtl">
      <div>
        <h1 className="text-xl font-semibold text-sand-50">AI Music Generator</h1>
        <p className="mt-1 text-sm text-ink-400">
          مدیریت توکن‌های provider (Base URL + API Key)، مانیتور مصرف، و اعتبار کاربران. هر کاربر بدون اشتراک{" "}
          <strong className="text-gold-400">{freeCredits}</strong> تولید رایگان دارد.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-ink-500">در حال بارگذاری…</p>
      ) : (
        <>
          {summary && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "توکن فعال", value: `${summary.enabledCount}/${summary.tokenCount}` },
                { label: "کل درخواست‌ها", value: String(summary.totalRequests) },
                { label: "موفق / ناموفق", value: `${summary.totalSuccess} / ${summary.totalFail}` },
                {
                  label: "اعتبار باقی‌مانده توکن‌ها",
                  value: `${summary.creditsRemaining}${summary.creditsTotal ? ` / ${summary.creditsTotal}` : ""}`,
                },
              ].map((c) => (
                <div key={c.label} className="card-ay p-4">
                  <p className="text-xs text-ink-500">{c.label}</p>
                  <p className="mt-1 text-lg font-semibold text-sand-50">{c.value}</p>
                </div>
              ))}
            </div>
          )}

          <section className="card-ay space-y-4 p-5">
            <h2 className="text-base font-semibold text-sand-50">افزودن توکن / Base URL</h2>
            <p className="text-xs text-ink-500">
              اگر مدل ElevenLabs را از provider دیگری گرفتی، Base URL همان سرویس و API Key مربوطه را اینجا بگذار.
              نوع <code className="text-gold-400">openai_compat</code> برای اکثر پروکسی‌ها مناسب است؛ برای API رسمی
              ElevenLabs از <code className="text-gold-400">elevenlabs</code> استفاده کن.
            </p>
            <form onSubmit={onCreate} className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-ink-400">
                برچسب
                <input
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="مثلاً proxy-1"
                  required
                />
              </label>
              <label className="text-xs text-ink-400">
                نوع
                <select
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                  value={providerKind}
                  onChange={(e) => setProviderKind(e.target.value)}
                >
                  <option value="openai_compat">openai_compat</option>
                  <option value="elevenlabs">elevenlabs</option>
                  <option value="custom">custom</option>
                </select>
              </label>
              <label className="text-xs text-ink-400 sm:col-span-2">
                Base URL
                <input
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.example.com/v1"
                  required
                  dir="ltr"
                />
              </label>
              <label className="text-xs text-ink-400 sm:col-span-2">
                API Key / Token
                <input
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-... یا xi-..."
                  required
                  dir="ltr"
                />
              </label>
              <label className="text-xs text-ink-400">
                Model ID (اختیاری)
                <input
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  placeholder="music_v2_5"
                  dir="ltr"
                />
              </label>
              <label className="text-xs text-ink-400">
                Path
                <input
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder="/music/generate"
                  dir="ltr"
                />
              </label>
              <label className="text-xs text-ink-400">
                سقف اعتبار این توکن (اختیاری)
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                  value={creditsTotal}
                  onChange={(e) => setCreditsTotal(e.target.value)}
                  placeholder="مثلاً 500"
                />
              </label>
              <div className="flex items-end">
                <button type="submit" disabled={busy} className="btn-ghost !py-2.5 text-xs disabled:opacity-50">
                  ذخیره توکن
                </button>
              </div>
            </form>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-sand-50">توکن‌ها و مصرف</h2>
            {tokens.length === 0 ? (
              <p className="text-sm text-ink-500">هنوز توکنی ثبت نشده.</p>
            ) : (
              <ul className="space-y-2">
                {tokens.map((t) => (
                  <li key={t.id} className="card-ay flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-sand-50">{t.label}</span>
                        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-ink-400">
                          {t.providerKind}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] ${
                            t.enabled ? "bg-emerald-400/15 text-emerald-300" : "bg-white/5 text-ink-500"
                          }`}
                        >
                          {t.enabled ? "فعال" : "خاموش"}
                        </span>
                      </div>
                      <p className="truncate text-xs text-ink-500" dir="ltr">
                        {t.baseUrl} · {t.apiKeyMasked} · model={t.modelId || "—"}
                      </p>
                      <p className="text-xs text-ink-400">
                        درخواست: {t.requestCount} · موفق: {t.successCount} · ناموفق: {t.failCount}
                        {t.creditsRemaining != null && (
                          <> · اعتبار باقی: {t.creditsRemaining}{t.creditsTotal != null ? `/${t.creditsTotal}` : ""}</>
                        )}
                      </p>
                      {t.lastError && <p className="text-xs text-red-400">{t.lastError}</p>}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void toggleEnabled(t)}
                        className="btn-ghost !py-1.5 text-[11px]"
                      >
                        {t.enabled ? "خاموش" : "روشن"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void removeToken(t.id)}
                        className="btn-ghost !py-1.5 text-[11px] text-red-300"
                      >
                        حذف
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card-ay space-y-3 p-5">
            <h2 className="text-base font-semibold text-sand-50">اعطای اعتبار به کاربر (بعد از پرداخت)</h2>
            <p className="text-xs text-ink-500">
              هر تولید کوتاه ≈ ۱ اعتبار. کاربر بدون اشتراک {freeCredits} اعتبار رایگان می‌گیرد؛ برای بیشتر باید
              پرداخت کند و اینجا (یا از webhook پرداخت) اعتبار اضافه شود.
            </p>
            <form onSubmit={onGrant} className="flex flex-wrap items-end gap-3">
              <label className="text-xs text-ink-400">
                User ID
                <input
                  className="mt-1 block w-56 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                  value={grantUserId}
                  onChange={(e) => setGrantUserId(e.target.value)}
                  required
                  dir="ltr"
                />
              </label>
              <label className="text-xs text-ink-400">
                تعداد اعتبار
                <input
                  type="number"
                  min={1}
                  className="mt-1 block w-28 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                  value={grantAmount}
                  onChange={(e) => setGrantAmount(e.target.value)}
                  required
                />
              </label>
              <button type="submit" disabled={busy} className="btn-ghost !py-2.5 text-xs">
                اعطا
              </button>
            </form>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-sand-50">لاگ مصرف اخیر</h2>
            {usage.length === 0 ? (
              <p className="text-sm text-ink-500">هنوز استفاده‌ای ثبت نشده.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full min-w-[640px] text-left text-xs" dir="ltr">
                  <thead className="bg-white/5 text-ink-400">
                    <tr>
                      <th className="px-3 py-2">زمان</th>
                      <th className="px-3 py-2">توکن</th>
                      <th className="px-3 py-2">کاربر</th>
                      <th className="px-3 py-2">نتیجه</th>
                      <th className="px-3 py-2">ms</th>
                      <th className="px-3 py-2">خطا</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usage.map((u) => (
                      <tr key={u.id} className="border-t border-white/5">
                        <td className="px-3 py-2 text-ink-400">{new Date(u.created_at).toLocaleString("fa-IR")}</td>
                        <td className="px-3 py-2 font-mono text-[10px]">{u.token_id.slice(0, 8)}…</td>
                        <td className="px-3 py-2">{u.user_id || "—"}</td>
                        <td className="px-3 py-2">{u.success ? "✓" : "✗"}</td>
                        <td className="px-3 py-2">{u.latency_ms ?? "—"}</td>
                        <td className="max-w-[200px] truncate px-3 py-2 text-red-300">{u.error_message || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
