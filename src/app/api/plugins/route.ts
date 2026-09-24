import { NextResponse } from "next/server";
import { queryLatestPlugins } from "@/lib/plugins-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const limit = Math.min(Math.max(Number(q.get("limit") || 3), 1), 3);
  const debug = q.get("debug") === "1";

  const result = await queryLatestPlugins(limit);

  if (result.unavailable) {
    const body: Record<string, unknown> = {
      ok: false,
      items: [],
      error: result.errorCode || "plugin_query_failed",
    };
    // Non-secret diagnostic detail helps operators after deploy.
    if (debug && result.errorDetail) {
      body.detail = result.errorDetail;
    }
    return NextResponse.json(body, {
      status: 503,
      headers: { "cache-control": "private, no-store, max-age=0" },
    });
  }

  return NextResponse.json(
    { ok: true, items: result.items },
    { headers: { "cache-control": "private, no-store, max-age=0" } },
  );
}
