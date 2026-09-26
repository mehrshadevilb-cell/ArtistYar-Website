import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { getPluginWebhookInfo, setPluginWebhook, pluginTokenConfigured } from "@/lib/telegram-plugin-sync";
import {
  resolvePluginBotToken,
  pluginBotTokenSource,
  pluginBotTokenWarnings,
} from "@/lib/telegram-plugin-bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const expected = (process.env.WEB_ADMIN_API_KEY || "").trim();
  if (!expected) return false;
  const provided =
    request.headers.get("x-admin-api-key") ||
    new URL(request.url).searchParams.get("key") ||
    "";
  return provided === expected;
}

/**
 * MUST match expectedSecret() in webhook/route.ts exactly.
 * Prefer TELEGRAM_PLUGIN_BOT_TOKEN so plugin bot and webhook stay aligned.
 */
function webhookSecret() {
  const explicit = (process.env.TELEGRAM_PLUGIN_WEBHOOK_SECRET || "").trim();
  if (explicit) return explicit;
  const token = resolvePluginBotToken();
  return token
    ? createHash("sha256").update("artistyar-plugin-webhook:" + token).digest("hex").slice(0, 48)
    : "";
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    if (!pluginTokenConfigured()) {
      return NextResponse.json(
        {
          ok: false,
          error: "telegram_bot_token_missing",
          detail: "Set TELEGRAM_PLUGIN_BOT_TOKEN (preferred) or TELEGRAM_BOT_TOKEN",
        },
        { status: 500 },
      );
    }
    const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://artistyaar.ir").replace(/\/$/, "");
    const secret = webhookSecret();
    if (!secret) {
      throw new Error("telegram_webhook_secret_unavailable");
    }
    const url = base + "/api/telegram/plugins/webhook";
    await setPluginWebhook(url, secret);
    const info = await getPluginWebhookInfo();
    return NextResponse.json({
      ok: true,
      webhook_url: url,
      secret_mode: (process.env.TELEGRAM_PLUGIN_WEBHOOK_SECRET || "").trim()
        ? "explicit"
        : "token-derived",
      token_source: pluginBotTokenSource(),
      token_warnings: pluginBotTokenWarnings(),
      webhook: info,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: String(error instanceof Error ? error.message : error) },
      { status: 500 },
    );
  }
}
