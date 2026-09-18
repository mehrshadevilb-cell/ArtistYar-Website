import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, USER_SESSION_COOKIE, verifyAdminSession, verifyUserSession } from "@/lib/server-admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 1800;

const MAX_BYTES = 250 * 1024 * 1024;
const ALLOWED_PRESETS = new Set([
  "vocal_balanced",
  "vocal_clean",
  "instrumental_clean",
  "instrumental_full",
  "karaoke",
  "htdemucs_ft",
]);

async function isAuthenticated() {
  const jar = await cookies();
  const admin = verifyAdminSession(jar.get(ADMIN_SESSION_COOKIE)?.value);
  if (admin) return true;
  return Boolean(verifyUserSession(jar.get(USER_SESSION_COOKIE)?.value));
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ ok: false, error: "برای استفاده از Vocal Separator ابتدا وارد حساب شوید." }, { status: 401 });
  }

  const worker = (process.env.UVR_WORKER_URL || "").replace(/\/$/, "");
  const workerSecret = process.env.UVR_WORKER_SECRET || "";
  if (!worker || !workerSecret) {
    return NextResponse.json({ ok: false, error: "UVR worker production configuration is incomplete." }, { status: 503 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const preset = String(form.get("preset") || "vocal_balanced");

  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "Audio file is required." }, { status: 400 });
  if (file.size <= 0 || file.size > MAX_BYTES) return NextResponse.json({ ok: false, error: "File must be between 1 byte and 250 MB." }, { status: 413 });
  if (!ALLOWED_PRESETS.has(preset)) return NextResponse.json({ ok: false, error: "Unsupported separation preset." }, { status: 400 });

  const upstream = new FormData();
  upstream.append("file", file, file.name);
  upstream.append("preset", preset);

  try {
    const response = await fetch(worker + "/separate", {
      method: "POST",
      body: upstream,
      headers: { "X-ArtistYar-Worker-Key": workerSecret },
      signal: AbortSignal.timeout(30 * 60 * 1000),
      cache: "no-store",
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return NextResponse.json({ ok: false, error: detail || ("Separation worker returned HTTP " + response.status + ".") }, { status: response.status >= 500 ? 502 : response.status });
    }

    const blob = await response.blob();
    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("content-type") || "application/zip",
        "Content-Disposition": response.headers.get("content-disposition") || 'attachment; filename="artistyar-stems.zip"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Separation worker is unreachable.";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
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
