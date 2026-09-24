/**
 * HitNevis AI Gateway — Phase 2
 *
 * Architecture:
 *   HitNevis → AI Gateway → (existing) Provider Registry → Model pool → Health/Failover Router
 *
 * CRITICAL RULES:
 * - NEVER hard-code a specific AI provider or model as the only path.
 * - Discover providers from ENV + runtime pool (getRuntimeProviderPool / runtimeAutoChat).
 * - Automatic failover on 429, 401/403, 5xx, timeout, quota, network, malformed response.
 * - Bounded retry via runtimeAutoChat (no infinite loops).
 * - Temporary cooldown of unhealthy models/providers (handled in ai-runtime).
 * - If ALL providers fail: controlled Persian error, never crash, never blank page.
 * - API keys stay server-side; never log secrets or full user lyrics.
 */

import { type ChatMessage } from "@/lib/ai-providers";
import { runtimeAutoChat, listRuntimePoolStatus } from "@/lib/ai-runtime";
import { buildHitNevisSystemPrompt, buildHitNevisUserPrompt, isValidMode } from "./prompts";
import type {
  HitNevisGenerateRequest,
  HitNevisHealthSnapshot,
  HitNevisResponse,
} from "./types";

const MAX_TOPIC = 500;
const MAX_LYRICS = 6000;
const MAX_CONSTRAINTS = 400;
const GATEWAY_TIMEOUT_MS = 45_000;

/** In-memory concurrency guard (process-local). */
let inFlight = 0;
const MAX_IN_FLIGHT = 12;

function newRequestId(): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 10);
  return `hn-${t}-${r}`;
}

function sanitizeLogText(text: string, max = 80): string {
  return text.replace(/\s+/g, " ").trim().slice(0, max);
}

function mapGatewayError(
  error: unknown,
  requestId: string,
  startedAt: number,
): HitNevisResponse {
  const raw = error instanceof Error ? error.message : String(error || "");
  const latencyMs = Date.now() - startedAt;

  if (raw === "aborted" || /aborted/i.test(raw)) {
    return {
      ok: false,
      requestId,
      error: "درخواست لغو شد.",
      code: "aborted",
      retryable: true,
      latencyMs,
    };
  }
  if (/timeout/i.test(raw)) {
    return {
      ok: false,
      requestId,
      error: "زمان پاسخ مدل‌ها تمام شد. دوباره امتحان کن.",
      code: "timeout",
      retryable: true,
      latencyMs,
    };
  }
  if (raw === "no_provider_configured" || /no_provider/i.test(raw)) {
    return {
      ok: false,
      requestId,
      error:
        "هیچ ارائه‌دهندهٔ هوش مصنوعی روی سرور پیکربندی نشده. کلید API را در محیط استقرار تنظیم کنید.",
      code: "no_providers",
      retryable: false,
      latencyMs,
    };
  }
  if (raw.startsWith("all_providers_failed:")) {
    return {
      ok: false,
      requestId,
      error:
        "همهٔ مدل‌های در دسترس موقتاً پاسخ ندادند. چند لحظه بعد دوباره تلاش کن — متنت حفظ می‌شود.",
      code: "all_failed",
      retryable: true,
      latencyMs,
    };
  }
  if (/429|rate.?limit/i.test(raw)) {
    return {
      ok: false,
      requestId,
      error: "محدودیت نرخ درخواست. کمی صبر کن و دوباره بزن.",
      code: "rate_limit",
      retryable: true,
      latencyMs,
    };
  }

  console.error("[hitnevis-gateway]", requestId, sanitizeLogText(raw, 200));
  return {
    ok: false,
    requestId,
    error: "اتصال به هوش مصنوعی برقرار نشد. متنت امن است — دوباره امتحان کن.",
    code: "internal",
    retryable: true,
    latencyMs,
  };
}

export function validateHitNevisRequest(
  body: unknown,
): { ok: true; data: HitNevisGenerateRequest } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "بدنهٔ درخواست نامعتبر است." };
  }
  const b = body as Record<string, unknown>;
  if (!isValidMode(b.mode)) {
    return { ok: false, error: "حالت (mode) نامعتبر است." };
  }
  const topic = typeof b.topic === "string" ? b.topic.trim().slice(0, MAX_TOPIC) : undefined;
  const existingLyrics =
    typeof b.existingLyrics === "string" ? b.existingLyrics.trim().slice(0, MAX_LYRICS) : undefined;
  const constraints =
    typeof b.constraints === "string" ? b.constraints.trim().slice(0, MAX_CONSTRAINTS) : undefined;

  if (!topic && !existingLyrics && b.mode !== "structure" && b.mode !== "title_ideas") {
    return { ok: false, error: "موضوع یا متن فعلی را وارد کن." };
  }

  const language =
    b.language === "en" || b.language === "fa-en" || b.language === "fa" ? b.language : "fa";

  return {
    ok: true,
    data: {
      mode: b.mode,
      topic,
      existingLyrics,
      genre: typeof b.genre === "string" ? (b.genre as HitNevisGenerateRequest["genre"]) : undefined,
      tone: typeof b.tone === "string" ? (b.tone as HitNevisGenerateRequest["tone"]) : undefined,
      language,
      constraints,
      preferredProvider:
        typeof b.preferredProvider === "string" ? b.preferredProvider.slice(0, 64) : undefined,
      preferredModel: typeof b.preferredModel === "string" ? b.preferredModel.slice(0, 128) : undefined,
    },
  };
}

/**
 * Core gateway entry: build prompts → runtimeAutoChat (multi-provider failover) → structured result.
 */
export async function hitnevisGenerate(
  req: HitNevisGenerateRequest,
  options?: { signal?: AbortSignal; clientId?: string },
): Promise<HitNevisResponse> {
  const requestId = newRequestId();
  const startedAt = Date.now();

  if (inFlight >= MAX_IN_FLIGHT) {
    return {
      ok: false,
      requestId,
      error: "سرور در حال پردازش درخواست‌های زیاد است. چند ثانیه بعد دوباره بزن.",
      code: "rate_limit",
      retryable: true,
      latencyMs: 0,
    };
  }

  inFlight += 1;
  const controller = new AbortController();
  const parent = options?.signal;
  const onParentAbort = () => controller.abort();
  parent?.addEventListener("abort", onParentAbort, { once: true });
  const timer = setTimeout(() => controller.abort(), GATEWAY_TIMEOUT_MS);

  try {
    const system = buildHitNevisSystemPrompt(req);
    const user = buildHitNevisUserPrompt(req);
    const messages: ChatMessage[] = [
      { role: "system", content: system },
      { role: "user", content: user },
    ];

    const result = await runtimeAutoChat(
      messages,
      req.preferredProvider,
      req.preferredModel,
      options?.clientId || "hitnevis",
      controller.signal,
    );

    const text = (result.reply || "").trim();
    if (!text) {
      return mapGatewayError(new Error("empty_reply"), requestId, startedAt);
    }

    return {
      ok: true,
      requestId,
      text,
      provider: result.provider,
      model: result.model,
      latencyMs: Date.now() - startedAt,
      mode: req.mode,
    };
  } catch (error) {
    return mapGatewayError(error, requestId, startedAt);
  } finally {
    clearTimeout(timer);
    parent?.removeEventListener("abort", onParentAbort);
    inFlight = Math.max(0, inFlight - 1);
  }
}

/** Health snapshot for ops / Phase 2 verification — no secrets. */
export async function hitnevisHealth(): Promise<HitNevisHealthSnapshot> {
  const requestId = newRequestId();
  try {
    const pool = await listRuntimePoolStatus();
    const healthy = pool.filter((p) => p.hasKey && p.deadForMs === 0);
    return {
      ok: healthy.length > 0,
      requestId,
      providersConfigured: pool.length,
      providersHealthy: healthy.length,
      pool: pool.map((p) => ({
        id: p.id,
        name: p.name,
        hasKey: p.hasKey,
        modelsSample: (p.models || []).slice(0, 4),
        deadForMs: p.deadForMs,
      })),
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[hitnevis-health]", requestId, error instanceof Error ? error.message : error);
    return {
      ok: false,
      requestId,
      providersConfigured: 0,
      providersHealthy: 0,
      pool: [],
      timestamp: new Date().toISOString(),
    };
  }
}
