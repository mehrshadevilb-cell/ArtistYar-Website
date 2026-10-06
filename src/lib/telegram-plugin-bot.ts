/**
 * Single source of truth for the ArtistYar plugin Telegram bot identity.
 *
 * Telegram file_id values are bot-specific. Every plugin path — webhook secret,
 * getFile, caption edit, cover download — MUST use the same resolved token.
 *
 * Prefer TELEGRAM_PLUGIN_BOT_TOKEN so a shared product TELEGRAM_BOT_TOKEN cannot
 * silently take over file resolution for a different bot.
 */
const TG = "https://api.telegram.org";

/**
 * Normalize a raw env token value.
 * - trim whitespace
 * - strip surrounding quotes
 * - strip a mistaken leading "bot" prefix (BotFather tokens are "123:ABC", not "bot123:ABC")
 *   because callers always build URLs as `/bot` + token + `/method`
 */
export function normalizeTelegramBotToken(raw: unknown): string {
  let value = String(raw ?? "").trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }
  // Common Render/env mistake: paste includes the "bot" path segment.
  if (/^bot\d+:/i.test(value)) {
    value = value.replace(/^bot/i, "");
  }
  return value;
}

/** Ordered resolution — first non-empty wins. Keep in sync across all callers. */
export function resolvePluginBotToken(): string {
  const candidates = [
    process.env.TELEGRAM_PLUGIN_BOT_TOKEN,
    process.env.TELEGRAM_BOT_TOKEN,
    process.env.TELEGRAM_TOKEN,
    process.env.BOT_TOKEN,
  ];
  for (const raw of candidates) {
    const value = normalizeTelegramBotToken(raw);
    if (value) return value;
  }
  return "";
}

/** Which env var supplied the token — never the token itself. */
export function pluginBotTokenSource():
  | "TELEGRAM_PLUGIN_BOT_TOKEN"
  | "TELEGRAM_BOT_TOKEN"
  | "TELEGRAM_TOKEN"
  | "BOT_TOKEN"
  | "missing" {
  if (normalizeTelegramBotToken(process.env.TELEGRAM_PLUGIN_BOT_TOKEN)) {
    return "TELEGRAM_PLUGIN_BOT_TOKEN";
  }
  if (normalizeTelegramBotToken(process.env.TELEGRAM_BOT_TOKEN)) {
    return "TELEGRAM_BOT_TOKEN";
  }
  if (normalizeTelegramBotToken(process.env.TELEGRAM_TOKEN)) {
    return "TELEGRAM_TOKEN";
  }
  if (normalizeTelegramBotToken(process.env.BOT_TOKEN)) {
    return "BOT_TOKEN";
  }
  return "missing";
}

export function pluginBotTokenConfigured(): boolean {
  return Boolean(resolvePluginBotToken());
}

/**
 * Warn when TELEGRAM_PLUGIN_BOT_TOKEN is unset and a fallback token is used.
 * Different bots produce incompatible file_ids → getFile 404.
 */
export function pluginBotTokenWarnings(): string[] {
  const warnings: string[] = [];
  const source = pluginBotTokenSource();
  if (source === "missing") {
    warnings.push("plugin_bot_token_missing");
    return warnings;
  }
  if (source !== "TELEGRAM_PLUGIN_BOT_TOKEN") {
    warnings.push(
      "using_fallback_token:" +
        source +
        " — set TELEGRAM_PLUGIN_BOT_TOKEN to the bot that receives @ProAudios channel posts",
    );
  }
  const plugin = normalizeTelegramBotToken(process.env.TELEGRAM_PLUGIN_BOT_TOKEN);
  const other = normalizeTelegramBotToken(process.env.TELEGRAM_BOT_TOKEN);
  if (plugin && other && plugin !== other) {
    warnings.push("plugin_token_overrides_TELEGRAM_BOT_TOKEN");
  }
  const active = resolvePluginBotToken();
  if (active && !/^\d+:[A-Za-z0-9_-]+$/.test(active)) {
    warnings.push(
      "plugin_bot_token_format_suspicious — expected BotFather shape digits:secret (no bot prefix, no quotes)",
    );
  }
  return warnings;
}

export type PluginBotIdentity = {
  configured: boolean;
  token_source: ReturnType<typeof pluginBotTokenSource>;
  warnings: string[];
  bot_id?: number;
  bot_username?: string;
  can_join_groups?: boolean;
  error?: string;
};

async function getMeForToken(token: string): Promise<{
  ok: boolean;
  bot_id?: number;
  bot_username?: string;
  can_join_groups?: boolean;
  error?: string;
  http_status?: number;
}> {
  const t = normalizeTelegramBotToken(token);
  if (!t) return { ok: false, error: "telegram_bot_token_missing" };
  try {
    const res = await fetch(TG + "/bot" + t + "/getMe", {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.ok) {
      return {
        ok: true,
        bot_id: data.result?.id,
        bot_username: data.result?.username,
        can_join_groups: data.result?.can_join_groups,
        http_status: res.status,
      };
    }
    const description = String(data?.description || "getMe_failed").slice(0, 200);
    if (/not found/i.test(description) || res.status === 404) {
      return {
        ok: false,
        error:
          "getMe_not_found — TELEGRAM_PLUGIN_BOT_TOKEN is not a live bot token (revoked, typo, extra quotes, or includes a leading 'bot' prefix)",
        http_status: res.status,
      };
    }
    if (/unauthorized|401/i.test(description) || res.status === 401) {
      return {
        ok: false,
        error: "getMe_unauthorized — token rejected by Telegram (invalid or revoked)",
        http_status: res.status,
      };
    }
    return { ok: false, error: description, http_status: res.status };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message.slice(0, 200) : String(error).slice(0, 200),
    };
  }
}

/** Safe identity probe — never returns the token. */
export async function probePluginBotIdentity(): Promise<PluginBotIdentity> {
  const source = pluginBotTokenSource();
  const warnings = pluginBotTokenWarnings();
  const token = resolvePluginBotToken();
  if (!token) {
    return { configured: false, token_source: source, warnings, error: "telegram_bot_token_missing" };
  }
  const me = await getMeForToken(token);
  if (!me.ok) {
    return {
      configured: true,
      token_source: source,
      warnings,
      error: me.error,
    };
  }
  return {
    configured: true,
    token_source: source,
    warnings,
    bot_id: me.bot_id,
    bot_username: me.bot_username,
    can_join_groups: me.can_join_groups,
  };
}

/**
 * Diagnostics-only: probe alternate env tokens WITHOUT selecting them for runtime.
 * Helps ops see whether TELEGRAM_BOT_TOKEN is healthy while PLUGIN token is broken.
 * Never returns token values.
 */
export async function probeAlternateBotTokens(): Promise<
  Array<{
    source: string;
    configured: boolean;
    ok: boolean;
    bot_id?: number;
    bot_username?: string;
    error?: string;
    same_as_active?: boolean;
  }>
> {
  const active = resolvePluginBotToken();
  const pairs: Array<{ source: string; raw: string }> = [
    { source: "TELEGRAM_PLUGIN_BOT_TOKEN", raw: process.env.TELEGRAM_PLUGIN_BOT_TOKEN || "" },
    { source: "TELEGRAM_BOT_TOKEN", raw: process.env.TELEGRAM_BOT_TOKEN || "" },
    { source: "TELEGRAM_TOKEN", raw: process.env.TELEGRAM_TOKEN || "" },
    { source: "BOT_TOKEN", raw: process.env.BOT_TOKEN || "" },
  ];
  const out = [];
  for (const pair of pairs) {
    const normalized = normalizeTelegramBotToken(pair.raw);
    if (!normalized) {
      out.push({ source: pair.source, configured: false, ok: false, error: "unset" });
      continue;
    }
    const me = await getMeForToken(normalized);
    out.push({
      source: pair.source,
      configured: true,
      ok: me.ok,
      bot_id: me.bot_id,
      bot_username: me.bot_username,
      error: me.error,
      same_as_active: normalized === active,
    });
  }
  return out;
}

/**
 * Probe whether a file_id is resolvable with the configured bot.
 * Returns safe status only — never the download URL or token.
 */
export async function probeTelegramFileId(fileId: string): Promise<{
  ok: boolean;
  error?: string;
  has_path?: boolean;
}> {
  const token = resolvePluginBotToken();
  if (!token) return { ok: false, error: "telegram_bot_token_missing" };
  const id = String(fileId || "").trim();
  if (!id) return { ok: false, error: "file_id_required" };
  try {
    const res = await fetch(TG + "/bot" + token + "/getFile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ file_id: id }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.ok && data.result?.file_path) {
      return { ok: true, has_path: true };
    }
    const description = String(data?.description || "getFile_failed").slice(0, 200);
    if (/not found|404/i.test(description) || res.status === 404) {
      return {
        ok: false,
        error:
          "file_id_not_found_for_configured_bot — token may belong to a different bot than the one that received the post",
      };
    }
    return { ok: false, error: description };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message.slice(0, 200) : String(error).slice(0, 200),
    };
  }
}


/** Ensure the plugin bot webhook is bound to the current production site on startup. */
export async function ensurePluginWebhook(): Promise<{ ok: boolean; error?: string }> {
  const token = resolvePluginBotToken();
  if (!token) return { ok: false, error: "telegram_bot_token_missing" };
  const siteRaw = String(process.env.NEXT_PUBLIC_SITE_URL || "https://artistyaar.ir").trim();
  const site = siteRaw.endsWith("/") ? siteRaw.slice(0, -1) : siteRaw;
  const explicit = String(process.env.TELEGRAM_PLUGIN_WEBHOOK_SECRET || "").trim();
  const secret = explicit || (await import("crypto")).createHash("sha256").update("artistyar-plugin-webhook:" + token).digest("hex").slice(0, 48);
  try {
    const res = await fetch(TG + "/bot" + token + "/setWebhook", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: site + "/api/telegram/plugins/webhook", allowed_updates: ["channel_post", "edited_channel_post"], secret_token: secret }),
      cache: "no-store", signal: AbortSignal.timeout(12000),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.ok) return { ok: true };
    return { ok: false, error: String(data?.description || "telegram_set_webhook_failed").slice(0, 240) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message.slice(0, 240) : String(error).slice(0, 240) };
  }
}
