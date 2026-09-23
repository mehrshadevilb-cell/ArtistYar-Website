
import { NextResponse } from "next/server";
import { enqueuePluginMessage } from "@/lib/telegram-plugin-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const expected = (process.env.TELEGRAM_PLUGIN_WEBHOOK_SECRET || "").trim();
  if (!expected) return true;
  return request.headers.get("x-telegram-bot-api-secret-token") === expected;
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ ok: false }, { status: 401 });
  const update = await request.json().catch(() => null);
  const message = update?.channel_post || update?.edited_channel_post;
  if (!message) return NextResponse.json({ ok: true, ignored: true });
  try {
    const result = await enqueuePluginMessage(message);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("telegram_plugin_sync", error);
    return NextResponse.json({ ok: false, error: "plugin_sync_failed" }, { status: 200 });
  }
}
