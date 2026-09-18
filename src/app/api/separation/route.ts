import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 250 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const worker = (process.env.UVR_WORKER_URL || "").replace(/\/$/, "");
  if (!worker) return NextResponse.json({ ok: false, error: "UVR_WORKER_URL is not configured on the server." }, { status: 503 });

  const form = await request.formData();
  const file = form.get("file");
  const preset = String(form.get("preset") || "vocal_balanced");

  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "Audio file is required." }, { status: 400 });
  if (file.size <= 0 || file.size > MAX_BYTES) return NextResponse.json({ ok: false, error: "File must be between 1 byte and 250 MB." }, { status: 413 });

  const allowed = new Set(["vocal_balanced", "vocal_clean", "instrumental_clean", "instrumental_full", "karaoke", "htdemucs_ft"]);
  if (!allowed.has(preset)) return NextResponse.json({ ok: false, error: "Unsupported separation preset." }, { status: 400 });

  const upstream = new FormData();
  upstream.append("file", file, file.name);
  upstream.append("preset", preset);

  try {
    const response = await fetch(worker + "/separate", {
      method: "POST",
      body: upstream,
      signal: AbortSignal.timeout(30 * 60 * 1000),
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
  return NextResponse.json({ ok: true, configured: Boolean(worker), service: "artistyar-uvr-gateway" });
}
