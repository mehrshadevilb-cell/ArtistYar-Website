import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  USER_SESSION_COOKIE,
  ADMIN_SESSION_COOKIE,
  verifyUserSession,
  verifyAdminSession,
} from "@/lib/server-admin-auth";
import {
  createGenerationJob,
  runGenerationJob,
  publicJobView,
} from "@/lib/music-generation/job-service";
import type { GenerationSpec } from "@/lib/music-generation/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const rateMap = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;

function rateOk(userId: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(userId);
  if (!entry || entry.resetAt <= now) {
    rateMap.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= MAX_PER_WINDOW;
}

async function resolveUser(): Promise<{ id: string; username: string } | null> {
  const store = await cookies();
  const admin = verifyAdminSession(store.get(ADMIN_SESSION_COOKIE)?.value);
  if (admin) return { id: `admin:${admin.username}`, username: admin.username };
  const session = verifyUserSession(store.get(USER_SESSION_COOKIE)?.value);
  if (!session) return null;
  return { id: session.id, username: session.username };
}

export async function POST(request: Request) {
  const user = await resolveUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "برای تولید موسیقی وارد شوید." }, { status: 401 });
  }
  if (!rateOk(user.id)) {
    return NextResponse.json(
      { ok: false, error: "تعداد درخواست‌ها زیاد است. کمی صبر کنید.", code: "RateLimited" },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const prompt = String(body.prompt || "").trim();
  if (!prompt || prompt.length < 3) {
    return NextResponse.json({ ok: false, error: "توضیح درخواست موسیقی را بنویسید." }, { status: 400 });
  }

  const partialSpec: Partial<GenerationSpec> = {};
  if (body.bpm != null && Number.isFinite(Number(body.bpm))) partialSpec.bpm = Number(body.bpm);
  if (body.bars != null && Number.isFinite(Number(body.bars))) partialSpec.bars = Number(body.bars);
  if (typeof body.key === "string" && body.key.trim()) partialSpec.key = body.key.trim().slice(0, 12);
  if (typeof body.instrument === "string") partialSpec.instrument = body.instrument as GenerationSpec["instrument"];
  if (typeof body.assetType === "string") partialSpec.assetType = body.assetType as GenerationSpec["assetType"];
  if (typeof body.meter === "string") partialSpec.meter = body.meter.slice(0, 8);

  const idempotencyKey =
    typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim().slice(0, 120) : undefined;

  try {
    const job = await createGenerationJob({
      userId: user.id,
      prompt,
      partialSpec,
      idempotencyKey,
    });

    // Process in this request (Cloudflare-friendly for short stub/real short clips).
    // Status is persisted so client can poll GET if the connection drops.
    const finished = await runGenerationJob(job.id);

    return NextResponse.json(
      { ok: true, job: publicJobView(finished) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "internal";
    if (msg.includes("supabase_not_configured")) {
      return NextResponse.json(
        { ok: false, error: "ذخیره‌سازی هنوز پیکربندی نشده است." },
        { status: 503 },
      );
    }
    console.error("[music/generate]", msg);
    return NextResponse.json(
      { ok: false, error: "خطا در ایجاد درخواست تولید." },
      { status: 500 },
    );
  }
}
