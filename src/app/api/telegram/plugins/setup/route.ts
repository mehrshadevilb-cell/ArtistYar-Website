import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { getPluginWebhookInfo, setPluginWebhook } from "@/lib/telegram-plugin-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const expected = (process.env.WEB_ADMIN_API_KEY || "").trim();
  if (!expected) return false;
  const provided = request.headers.get("x-admin-api-key") || new URL(request.url).searchParams.get("key") || "";
  return provided === expected;
}

function webhookSecret() {
  const explicit = (process.env.TELEGRAM_PLUGIN_WEBHOOK_SECRET || "").trim();
  if (explicit) return explicit;
  const token = (process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN || process.env.BOT_TOKEN || "").trim();
  return token ? createHash("sha256").update("artistyar-plugin-webhook:" + token).digest("hex").slice(0, 48) : "";
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try {
    const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://artistyaar.ir").replace(/\/$/, "");
    const secret = webhookSecret();
    if (!secret) throw new Error("telegram_webhook_secret_unavailable");
    await setPluginWebhook(base + "/api/telegram/plugins/webhook", secret);
    const info = await getPluginWebhookInfo();
    return NextResponse.json({ ok: true, webhook: info });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error instanceof Error ? error.message : error) }, { status: 500 });
  }
}
