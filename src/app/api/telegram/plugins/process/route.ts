import { NextResponse } from "next/server";
import { processPendingPluginPairs } from "@/lib/telegram-plugin-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const key = (process.env.WEB_ADMIN_API_KEY || "").trim();
  if (!key) return false;
  const url = new URL(request.url);
  const provided =
    request.headers.get("x-web-admin-key") ||
    request.headers.get("x-admin-api-key") ||
    url.searchParams.get("key") ||
    "";
  return provided === key;
}

async function run(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const limitParam = new URL(request.url).searchParams.get("limit");
  const limit = Math.min(Math.max(Number(limitParam || 10) || 10, 1), 20);

  try {
    const result = await processPendingPluginPairs(limit);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("telegram_plugin_process", error);
    return NextResponse.json(
      { ok: false, error: "plugin_process_failed", detail: detail.slice(0, 1000) },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
