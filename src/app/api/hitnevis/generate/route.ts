import { NextResponse } from "next/server";
import { hitnevisGenerate, validateHitNevisRequest } from "@/lib/hitnevis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BODY_BYTES = 160 * 1024;
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 15;
const MAX_KEYS = 8_000;

const attempts = new Map<string, { count: number; resetAt: number }>();

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const real = request.headers.get("x-real-ip")?.trim();
  return (forwarded || real || "hitnevis-anon").slice(0, 64);
}

function checkRate(key: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  for (const [k, e] of attempts) {
    if (e.resetAt <= now) attempts.delete(k);
  }
  if (!attempts.has(key) && attempts.size >= MAX_KEYS) {
    const oldest = attempts.keys().next().value;
    if (oldest) attempts.delete(oldest);
  }
  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSec: 0 };
  }
  entry.count += 1;
  if (entry.count > MAX_PER_WINDOW) {
    return { allowed: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfterSec: 0 };
}

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json(
        {
          ok: false,
          error: "درخواست بیش از حد بزرگ است.",
          code: "validation",
          retryable: false,
          requestId: "hn-size",
          latencyMs: 0,
        },
        { status: 413 },
      );
    }

    const key = clientKey(request);
    const limit = checkRate(key);
    if (!limit.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: "تعداد درخواست‌ها زیاد است. کمی بعد دوباره امتحان کن.",
          code: "rate_limit",
          retryable: true,
          requestId: "hn-rate",
          latencyMs: 0,
        },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: "JSON نامعتبر.",
          code: "validation",
          retryable: false,
          requestId: "hn-json",
          latencyMs: 0,
        },
        { status: 400 },
      );
    }

    const validated = validateHitNevisRequest(body);
    if (!validated.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: validated.error,
          code: "validation",
          retryable: false,
          requestId: "hn-val",
          latencyMs: 0,
        },
        { status: 400 },
      );
    }

    const result = await hitnevisGenerate(validated.data, {
      signal: request.signal,
      clientId: key,
    });

    if (!result.ok) {
      const status =
        result.code === "rate_limit"
          ? 429
          : result.code === "no_providers"
            ? 503
            : result.code === "timeout"
              ? 504
              : result.code === "aborted"
                ? 499
                : 502;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[hitnevis/generate]", error instanceof Error ? error.message : error);
    return NextResponse.json(
      {
        ok: false,
        error: "خطای داخلی سرور. متنت حفظ شده است.",
        code: "internal",
        retryable: true,
        requestId: "hn-catch",
        latencyMs: 0,
      },
      { status: 500 },
    );
  }
}
