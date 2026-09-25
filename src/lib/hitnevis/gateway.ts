/**
 * HitNevis AI Gateway — Phases 2–5 + Persian Hit KB retrieval
 * Provider/model agnostic via runtimeAutoChat. No hard-coded sole provider.
 */

import { type ChatMessage } from "@/lib/ai-providers";
import { runtimeAutoChat, listRuntimePoolStatus } from "@/lib/ai-runtime";
import { buildHitNevisSystemPrompt, buildHitNevisUserPrompt, isValidMode } from "./prompts";
import { retrieveHitPatterns } from "./kb/retrieve";
import { getCurrentChartContext } from "./kb/current-chart-context";
import {
  analyzeHitDna,
  formatHitDnaReport,
  formatHumanTestsReport,
  runHumanTests,
} from "./hit-dna";
import type {
  ArtistVoiceProfile,
  HitNevisGenerateRequest,
  HitNevisHealthSnapshot,
  HitNevisMode,
  HitNevisResponse,
  LyricSectionId,
} from "./types";

const MAX_TOPIC = 500;
const MAX_LYRICS = 8000;
const MAX_CONSTRAINTS = 1200;
const GATEWAY_TIMEOUT_MS = 45_000;
const MAX_IN_FLIGHT = 12;

let inFlight = 0;

const dedupeMap = new Map<string, { at: number; promise: Promise<HitNevisResponse> }>();
const DEDUPE_MS = 4_000;

function newRequestId(): string {
  return `hn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeLogText(text: string, max = 80): string {
  return text.replace(/\s+/g, " ").trim().slice(0, max);
}

function hashPayload(req: HitNevisGenerateRequest): string {
  const hist = (req.conversationHistory || [])
    .slice(-4)
    .map((t) => `${t.role}:${t.content.slice(0, 120)}`)
    .join("|");
  return JSON.stringify({
    mode: req.mode,
    topic: req.topic || "",
    existingLyrics: (req.existingLyrics || "").slice(0, 800),
    sectionType: req.sectionType || "",
    genre: req.genre || "",
    tone: req.tone || "",
    language: req.language || "fa",
    constraints: req.constraints || "",
    directionsCount: req.directionsCount || 0,
    artistVoice: req.artistVoice || null,
    hist,
  });
}

function mapGatewayError(error: unknown, requestId: string, startedAt: number): HitNevisResponse {
  const raw = error instanceof Error ? error.message : String(error || "");
  const latencyMs = Date.now() - startedAt;

  if (raw === "aborted" || /aborted/i.test(raw)) {
    return { ok: false, requestId, error: "درخواست لغو شد.", code: "aborted", retryable: true, latencyMs };
  }
  if (/timeout/i.test(raw)) {
    console.warn("[hitnevis-gateway] upstream timeout", requestId, sanitizeLogText(raw, 300));
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
      error: "هیچ ارائه‌دهندهٔ هوش مصنوعی روی سرور پیکربندی نشده.",
      code: "no_providers",
      retryable: false,
      latencyMs,
    };
  }
  if (raw.startsWith("all_providers_failed:")) {
    console.warn("[hitnevis-gateway] provider fallback exhausted", requestId, sanitizeLogText(raw, 900));
    return {
      ok: false,
      requestId,
      error: "همهٔ مدل‌های در دسترس موقتاً پاسخ ندادند. متنت حفظ می‌شود — بعداً دوباره بزن.",
      code: "all_failed",
      retryable: true,
      latencyMs,
    };
  }
  if (/429|rate.?limit/i.test(raw)) {
    return {
      ok: false,
      requestId,
      error: "محدودیت نرخ درخواست. کمی صبر کن.",
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

function parseArtistVoice(raw: unknown): ArtistVoiceProfile | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const v = raw as Record<string, unknown>;
  const preferredWords = Array.isArray(v.preferredWords)
    ? v.preferredWords.filter((x): x is string => typeof x === "string").slice(0, 30)
    : undefined;
  const avoidedWords = Array.isArray(v.avoidedWords)
    ? v.avoidedWords.filter((x): x is string => typeof x === "string").slice(0, 30)
    : undefined;
  return {
    name: typeof v.name === "string" ? v.name.slice(0, 80) : undefined,
    styleNotes: typeof v.styleNotes === "string" ? v.styleNotes.slice(0, 500) : undefined,
    preferredWords,
    avoidedWords,
    register:
      v.register === "colloquial" || v.register === "literary" || v.register === "mixed"
        ? v.register
        : undefined,
    rhymePreference:
      v.rhymePreference === "loose" || v.rhymePreference === "tight" || v.rhymePreference === "free"
        ? v.rhymePreference
        : undefined,
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

  const localOnly: HitNevisMode[] = ["hit_dna", "human_tests"];
  const hasHistory =
    Array.isArray(b.conversationHistory) &&
    b.conversationHistory.some(
      (t) => t && typeof t === "object" && typeof (t as { content?: unknown }).content === "string",
    );
  if (
    !localOnly.includes(b.mode as HitNevisMode) &&
    !topic &&
    !existingLyrics &&
    !hasHistory &&
    b.mode !== "structure" &&
    b.mode !== "title_ideas" &&
    b.mode !== "chat"
  ) {
    return { ok: false, error: "موضوع یا متن فعلی را وارد کن." };
  }
  if (
    b.mode === "chat" &&
    !topic &&
    !existingLyrics &&
    !hasHistory &&
    !(typeof b.constraints === "string" && b.constraints.trim())
  ) {
    return { ok: false, error: "پیامت را بنویس." };
  }

  const language =
    b.language === "en" || b.language === "fa-en" || b.language === "fa" ? b.language : "fa";

  const sectionType =
    typeof b.sectionType === "string" &&
    ["verse", "pre_chorus", "chorus", "bridge", "outro", "hook", "other"].includes(b.sectionType)
      ? (b.sectionType as LyricSectionId)
      : undefined;

  const directionsCount =
    typeof b.directionsCount === "number" && Number.isFinite(b.directionsCount)
      ? Math.min(5, Math.max(2, Math.floor(b.directionsCount)))
      : undefined;

  let conversationHistory: HitNevisGenerateRequest["conversationHistory"];
  if (Array.isArray(b.conversationHistory)) {
    conversationHistory = b.conversationHistory
      .filter(
        (t): t is { role: "user" | "assistant"; content: string } =>
          !!t &&
          typeof t === "object" &&
          ((t as { role?: string }).role === "user" ||
            (t as { role?: string }).role === "assistant") &&
          typeof (t as { content?: unknown }).content === "string",
      )
      .map((t) => ({
        role: t.role,
        content: t.content.trim().slice(0, 1200),
      }))
      .filter((t) => t.content.length > 0)
      .slice(-12);
    if (!conversationHistory.length) conversationHistory = undefined;
  }

  return {
    ok: true,
    data: {
      mode: b.mode as HitNevisMode,
      topic,
      existingLyrics,
      sectionType,
      genre: typeof b.genre === "string" ? (b.genre as HitNevisGenerateRequest["genre"]) : undefined,
      tone: typeof b.tone === "string" ? (b.tone as HitNevisGenerateRequest["tone"]) : undefined,
      language,
      constraints,
      artistVoice: parseArtistVoice(b.artistVoice),
      directionsCount,
      preferredProvider:
        typeof b.preferredProvider === "string" ? b.preferredProvider.slice(0, 64) : undefined,
      preferredModel: typeof b.preferredModel === "string" ? b.preferredModel.slice(0, 128) : undefined,
      conversationHistory,
    },
  };
}

function buildKbContext(req: HitNevisGenerateRequest): string {
  try {
    const result = retrieveHitPatterns({
      genre: req.genre,
      mood: req.tone,
      topic: req.topic,
      sectionType: req.sectionType,
      goal: req.mode,
      text: [req.topic, req.existingLyrics, req.constraints].filter(Boolean).join(" ").slice(0, 800),
      limit: 4,
    });
    if (!result.patternSummary) return "";
    const parts = [result.patternSummary];
    if (result.antiCliche.length) {
      parts.push("پرهیز از کلیشه‌های رایج در این فضا: " + result.antiCliche.slice(0, 5).join("؛ "));
    }
    if (result.originality.length) {
      parts.push("تکنیک اصالت پیشنهادی: " + result.originality.join("، "));
    }
    return parts.join("\n");
  } catch {
    return "";
  }
}

async function runAi(
  req: HitNevisGenerateRequest,
  signal: AbortSignal,
  clientId: string,
): Promise<{ reply: string; provider: string; model: string }> {
  const kb = buildKbContext(req);
  const userBase = buildHitNevisUserPrompt(req);
  const userContent = kb
    ? `${userBase}\n\n---\n${kb}\n---\nیادآوری: فقط از الگوهای بالا الهام بگیر. هیچ ترانهٔ موجود را کپی یا بازنویسی نزدیک نکن.`
    : userBase;
  const messages: ChatMessage[] = [
    { role: "system", content: buildHitNevisSystemPrompt(req) },
    { role: "user", content: userContent },
  ];
  return runtimeAutoChat(messages, req.preferredProvider, req.preferredModel, clientId, signal);
}

function splitDirections(text: string): string[] | undefined {
  const blocks = text
    .split(/\n(?=\s*(?:\d+[\).\-–]|جهت\s*\d|نسخه\s*\d|Direction\s*\d))/i)
    .map((b) => b.trim())
    .filter((b) => b.length > 20);
  return blocks.length >= 2 ? blocks.slice(0, 5) : undefined;
}

async function hitnevisGenerateInner(
  req: HitNevisGenerateRequest,
  options?: { signal?: AbortSignal; clientId?: string },
): Promise<HitNevisResponse> {
  const requestId = newRequestId();
  const startedAt = Date.now();

  if (req.mode === "hit_dna") {
    const dna = analyzeHitDna(req.existingLyrics || req.topic || "");
    return {
      ok: true,
      requestId,
      text: formatHitDnaReport(dna),
      provider: "local-hit-dna",
      model: "analytical-v1",
      latencyMs: Date.now() - startedAt,
      mode: req.mode,
    };
  }
  if (req.mode === "human_tests") {
    const report = runHumanTests(
      req.existingLyrics || req.topic || "",
      req.artistVoice?.styleNotes,
    );
    return {
      ok: true,
      requestId,
      text: formatHumanTestsReport(report),
      provider: "local-human-tests",
      model: "analytical-v1",
      latencyMs: Date.now() - startedAt,
      mode: req.mode,
    };
  }

  if (inFlight >= MAX_IN_FLIGHT) {
    return {
      ok: false,
      requestId,
      error: "سرور شلوغ است. چند ثانیه بعد دوباره بزن.",
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
    const result = await runAi(req, controller.signal, options?.clientId || "hitnevis");
    const text = (result.reply || "").trim();
    if (!text) return mapGatewayError(new Error("empty_reply"), requestId, startedAt);

    const directions =
      req.mode === "save_lyric" || req.mode === "hook_lab" ? splitDirections(text) : undefined;

    return {
      ok: true,
      requestId,
      text,
      provider: result.provider,
      model: result.model,
      latencyMs: Date.now() - startedAt,
      mode: req.mode,
      directions,
    };
  } catch (error) {
    return mapGatewayError(error, requestId, startedAt);
  } finally {
    clearTimeout(timer);
    parent?.removeEventListener("abort", onParentAbort);
    inFlight = Math.max(0, inFlight - 1);
  }
}

export async function hitnevisGenerate(
  req: HitNevisGenerateRequest,
  options?: { signal?: AbortSignal; clientId?: string },
): Promise<HitNevisResponse> {
  const key = hashPayload(req);
  const now = Date.now();
  const existing = dedupeMap.get(key);
  if (existing && now - existing.at < DEDUPE_MS) {
    return existing.promise;
  }
  const promise = hitnevisGenerateInner(req, options).finally(() => {
    const cur = dedupeMap.get(key);
    if (cur?.promise === promise) dedupeMap.delete(key);
  });
  dedupeMap.set(key, { at: now, promise });
  return promise;
}

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
