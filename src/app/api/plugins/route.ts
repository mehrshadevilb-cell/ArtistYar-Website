import { NextResponse } from "next/server";
import { queryLatestPlugins } from "@/lib/plugins-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const limit = Math.min(Math.max(Number(q.get("limit") || 3), 1), 3);

  const result = await queryLatestPlugins(limit);

  if (result.unavailable) {
    return NextResponse.json(
      {
        ok: false,
        items: [],
        error: result.errorCode || "plugin_query_failed",
      },
      {
        status: 503,
        headers: { "cache-control": "private, no-store, max-age=0" },
      },
    );
  }

  return NextResponse.json(
    { ok: true, items: result.items },
    { headers: { "cache-control": "private, no-store, max-age=0" } },
  );
}
