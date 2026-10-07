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

export type EnsurePluginWebhookResult = {
  ok: boolean;
  error?: string;
  category?: "permanent" | "transient" | "config";
  attempts?: number;
  verified?: boolean;
};

function classifyWebhookError(
  message: string,
  httpStatus?: number,
): "permanent" | "transient" | "config" {
  const m = message.toLowerCase();
  if (
    /token_missing|unauthorized|401|not found|404|bad request|400|invalid|forbidden|403|webhook_url_empty|url_invalid|ssl|certificate/i.test(
      m,
    ) ||
    httpStatus === 401 ||
    httpStatus === 403 ||
    httpStatus === 400
  ) {
    if (/token_missing|unauthorized|401|invalid token|revoked/i.test(m) || httpStatus === 401) {
      return "config";
    }
    return "permanent";
  }
  if (
    /fetch failed|timeout|timed out|aborted|network|econnrefused|enotfound|econnreset|socket|429|500|502|503|504|rate limit|retry/i.test(
      m,
    ) ||
    (httpStatus != null && (httpStatus === 429 || httpStatus >= 500))
  ) {
    return "transient";
  }
  return "transient";
}

/**
 * Ensure the plugin bot webhook is bound to the current production site.
 * Retries transient network/Telegram failures with bounded exponential backoff.
 * Never logs tokens or secrets.
 */
export async function getPluginWebhookInfo(): Promise<Record<string, any>> {
  const token = resolvePluginBotToken();
  if (!token) throw new Error("telegram_bot_token_missing");
  const res = await fetch(TG + "/bot" + token + "/getWebhookInfo", {
    method: "GET",
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ok) {
    throw new Error(String(data?.description || "telegram_get_webhook_info_failed").slice(0, 240));
  }
  return data.result || {};
}

export async function ensurePluginWebhook(): Promise<EnsurePluginWebhookResult> {
  const token = resolvePluginBotToken();
  if (!token) {
    return { ok: false, error: "telegram_bot_token_missing", category: "config", attempts: 0 };
  }

  const siteRaw = String(process.env.NEXT_PUBLIC_SITE_URL || "https://artistyaar.ir").trim();
  const site = siteRaw.endsWith("/") ? siteRaw.slice(0, -1) : siteRaw;
  const webhookUrl = site + "/api/telegram/plugins/webhook";

  if (!/^https:\/\//i.test(webhookUrl)) {
    return {
      ok: false,
      error: "webhook_url_must_be_https",
      category: "config",
      attempts: 0,
    };
  }

  const explicit = String(process.env.TELEGRAM_PLUGIN_WEBHOOK_SECRET || "").trim();
  let secret = explicit;
  if (!secret) {
    const digest = await globalThis.crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode("artistyar-plugin-webhook:" + token),
    );
    secret = Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 48);
  }

  const maxAttempts = 4;
  let lastError = "telegram_set_webhook_failed";
  let lastCategory: "permanent" | "transient" | "config" = "transient";
  let lastStatus: number | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const started = Date.now();
    try {
      const res = await fetch(TG + "/bot" + token + "/setWebhook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ["channel_post", "edited_channel_post"],
          secret_token: secret,
          drop_pending_updates: false,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      lastStatus = res.status;
      const data = await res.json().catch(() => null);
      const durationMs = Date.now() - started;

      if (res.ok && data?.ok) {
        let verified = false;
        try {
          const infoRes = await fetch(TG + "/bot" + token + "/getWebhookInfo", {
            method: "GET",
            cache: "no-store",
            signal: AbortSignal.timeout(10000),
          });
          const info = await infoRes.json().catch(() => null);
          if (infoRes.ok && info?.ok && info.result) {
            const configuredUrl = String(info.result.url || "");
            const pendingUpdates = Number(info.result.pending_update_count || 0);
            const lastErrorMessage = String(info.result.last_error_message || "").slice(0, 240);
            const lastErrorDate = Number(info.result.last_error_date || 0);
            verified = configuredUrl === webhookUrl || configuredUrl.startsWith(site + "/");
            console.info("telegram_plugin_webhook_state", {
              attempt,
              durationMs,
              verified,
              pending_updates: pendingUpdates,
              has_last_error: Boolean(lastErrorMessage),
              last_error_date: lastErrorDate || null,
              has_url: Boolean(configuredUrl),
            });
            if (!verified || lastErrorMessage) {
              console.warn("telegram_plugin_webhook_verify_problem", {
                attempt,
                pending_updates: pendingUpdates,
                has_last_error: Boolean(lastErrorMessage),
                last_error_date: lastErrorDate || null,
                has_url: Boolean(configuredUrl),
              });
            }
          }
        } catch {
          // verification is optional
        }

        console.info("telegram_plugin_webhook_success", {
          attempt,
          durationMs,
          verified,
          token_source: pluginBotTokenSource(),
        });
        return { ok: true, attempts: attempt, verified };
      }

      const description = String(data?.description || "telegram_set_webhook_failed").slice(0, 240);
      lastError = description;
      lastCategory = classifyWebhookError(description, res.status);

      const retryAfter = Number(data?.parameters?.retry_after || 0);
      if (lastCategory === "transient" && attempt < maxAttempts) {
        const waitMs =
          retryAfter > 0
            ? Math.min(20000, retryAfter * 1000)
            : Math.min(8000, 400 * Math.pow(2, attempt - 1));
        console.warn("telegram_plugin_webhook_retry", {
          attempt,
          category: lastCategory,
          status: res.status,
          waitMs,
          durationMs,
          error: description.slice(0, 120),
        });
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      console.error("telegram_plugin_webhook_permanent_failure", {
        attempt,
        category: lastCategory,
        status: res.status,
        durationMs,
        error: description.slice(0, 160),
      });
      return {
        ok: false,
        error: description,
        category: lastCategory,
        attempts: attempt,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message.slice(0, 240) : String(error).slice(0, 240);
      lastError = msg;
      lastCategory = classifyWebhookError(msg, lastStatus);
      const durationMs = Date.now() - started;

      if (lastCategory === "transient" && attempt < maxAttempts) {
        const waitMs = Math.min(8000, 400 * Math.pow(2, attempt - 1));
        console.warn("telegram_plugin_webhook_retry", {
          attempt,
          category: lastCategory,
          waitMs,
          durationMs,
          error: msg.slice(0, 120),
        });
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      console.error("telegram_plugin_webhook_permanent_failure", {
        attempt,
        category: lastCategory,
        durationMs,
        error: msg.slice(0, 160),
      });
      return {
        ok: false,
        error: msg,
        category: lastCategory,
        attempts: attempt,
      };
    }
  }

  return {
    ok: false,
    error: lastError,
    category: lastCategory,
    attempts: maxAttempts,
  };
}
