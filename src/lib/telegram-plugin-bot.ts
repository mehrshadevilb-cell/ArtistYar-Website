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

/** Ordered resolution — first non-empty wins. Keep in sync across all callers. */
export function resolvePluginBotToken(): string {
  const candidates = [
    process.env.TELEGRAM_PLUGIN_BOT_TOKEN,
    process.env.TELEGRAM_BOT_TOKEN,
    process.env.TELEGRAM_TOKEN,
    process.env.BOT_TOKEN,
  ];
  for (const raw of candidates) {
    const value = String(raw || "").trim();
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
  if ((process.env.TELEGRAM_PLUGIN_BOT_TOKEN || "").trim()) return "TELEGRAM_PLUGIN_BOT_TOKEN";
  if ((process.env.TELEGRAM_BOT_TOKEN || "").trim()) return "TELEGRAM_BOT_TOKEN";
  if ((process.env.TELEGRAM_TOKEN || "").trim()) return "TELEGRAM_TOKEN";
  if ((process.env.BOT_TOKEN || "").trim()) return "BOT_TOKEN";
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
  const plugin = (process.env.TELEGRAM_PLUGIN_BOT_TOKEN || "").trim();
  const other = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
  if (plugin && other && plugin !== other) {
    // Both set to different values is fine — plugin token wins. Log for ops clarity.
    warnings.push("plugin_token_overrides_TELEGRAM_BOT_TOKEN");
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

/** Safe identity probe — never returns the token. */
export async function probePluginBotIdentity(): Promise<PluginBotIdentity> {
  const source = pluginBotTokenSource();
  const warnings = pluginBotTokenWarnings();
  const token = resolvePluginBotToken();
  if (!token) {
    return { configured: false, token_source: source, warnings, error: "telegram_bot_token_missing" };
  }
  try {
    const res = await fetch(TG + "/bot" + token + "/getMe", {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      return {
        configured: true,
        token_source: source,
        warnings,
        error: String(data?.description || "getMe_failed").slice(0, 200),
      };
    }
    return {
      configured: true,
      token_source: source,
      warnings,
      bot_id: data.result?.id,
      bot_username: data.result?.username,
      can_join_groups: data.result?.can_join_groups,
    };
  } catch (error) {
    return {
      configured: true,
      token_source: source,
      warnings,
      error: error instanceof Error ? error.message.slice(0, 200) : String(error).slice(0, 200),
    };
  }
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
    // Map classic wrong-bot failure
    if (/not found|404/i.test(description) || res.status === 404) {
      return {
        ok: false,
        error: "file_id_not_found_for_configured_bot — token may belong to a different bot than the one that received the post",
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
