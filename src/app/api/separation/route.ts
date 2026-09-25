import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  USER_SESSION_COOKIE,
  verifyAdminSession,
  verifyUserSession,
} from "@/lib/server-admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Workers hard-cap is much lower; keep declaration for platforms that honor it. */
export const maxDuration = 60;

const MAX_BYTES = 250 * 1024 * 1024;
const MAX_REQUEST_BYTES = MAX_BYTES + 2 * 1024 * 1024;
/** Cloudflare / edge-friendly proxy wait (seconds). Long UVR jobs should hit UVR worker directly from the client when possible. */
const PROXY_TIMEOUT_MS = 55 * 1000;

const ALLOWED_PRESETS = new Set([
  "vocal_balanced",
  "vocal_clean",
  "instrumental_clean",
  "instrumental_full",
  "karaoke",
  "htdemucs_ft",
  "demucs_mdx_hq5",
]);

async function isAuthenticated() {
  const jar = await cookies();
  const admin = verifyAdminSession(jar.get(ADMIN_SESSION_COOKIE)?.value);
  if (admin) return true;
  return Boolean(verifyUserSession(jar.get(USER_SESSION_COOKIE)?.value));
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json(
      { ok: false, error: "برای استفاده از جداسازی وکال ابتدا وارد حساب شوید." },
      { status: 401 },
    );
  }

  const worker = (process.env.UVR_WORKER_URL || "").replace(/\/$/, "");
  const workerSecret = process.env.UVR_WORKER_SECRET || "";
  if (!worker || !workerSecret) {
    return NextResponse.json(
      {
        ok: false,
        code: "UVR_WORKER_NOT_CONFIGURED",
        browserAvailable: true,
        error:
          "موتور سرور UVR فعال نیست. از حالت استاندارد یا تفکیک کامل روی صفحه جداسازی وکال استفاده کنید — این دو حالت روی دستگاه شما کار می‌کنند و نیازی به سرور ندارند.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return NextResponse.json({ ok: false, error: "حجم درخواست از سقف پشتیبانی‌شده بیشتر است." }, { status: 413 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const preset = String(form.get("preset") || "vocal_balanced");

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "فایل صوتی الزامی است." }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, error: "حجم فایل باید بین ۱ بایت تا ۲۵۰ مگابایت باشد." },
      { status: 413 },
    );
  }
  if (!ALLOWED_PRESETS.has(preset)) {
    return NextResponse.json({ ok: false, error: "حالت تفکیک پشتیبانی نمی‌شود." }, { status: 400 });
  }

  const upstream = new FormData();
  upstream.append("file", file, file.name);
  upstream.append("preset", preset);

  try {
    const response = await fetch(worker + "/separate", {
      method: "POST",
      body: upstream,
      headers: { "X-ArtistYar-Worker-Key": workerSecret },
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
      cache: "no-store",
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return NextResponse.json(
        {
          ok: false,
          error: response.status >= 500
            ? "موتور تفکیک موقتاً در دسترس نیست."
            : "درخواست تفکیک توسط موتور رد شد.",
        },
        { status: response.status >= 500 ? 502 : response.status },
      );
    }

    if (!response.body) {
      return NextResponse.json({ ok: false, error: "موتور تفکیک خروجی معتبری برنگرداند." }, { status: 502 });
    }
    return new NextResponse(response.body, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("content-type") || "application/zip",
        "Content-Disposition":
          response.headers.get("content-disposition") ||
          'attachment; filename="artistyar-stems.zip"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "موتور تفکیک در دسترس نیست.";
    const timedOut = /abort|timeout/i.test(message);
    return NextResponse.json(
      {
        ok: false,
        code: timedOut ? "UVR_PROXY_TIMEOUT" : "UVR_PROXY_ERROR",
        browserAvailable: true,
        error: timedOut
          ? "تفکیک سروری بیش از حد طول کشید. از حالت استاندارد روی دستگاه خودتان استفاده کنید یا بعداً دوباره امتحان کنید."
          : "موتور تفکیک در دسترس نیست. کمی بعد دوباره امتحان کن.",
      },
      { status: 502 },
    );
  }
}

export async function GET() {
  const worker = (process.env.UVR_WORKER_URL || "").replace(/\/$/, "");
  return NextResponse.json({
    ok: true,
    configured: Boolean(worker && process.env.UVR_WORKER_SECRET),
    service: "artistyar-uvr-gateway",
  });
}
