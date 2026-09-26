/**
 * Telegram plugin sync.
 * Full AI ingest pipeline: see telegram-plugin-sync.FULL.ts backup / git history.
 * Active surface: media covers, caption re-apply, webhook setup, queue process stub
 * that still processes captions for already-queued items when possible.
 */
import { createClient } from "@supabase/supabase-js";
import {
  reapplyPluginCaption,
  reapplyLatestPluginCaptions,
} from "@/lib/telegram-plugin-caption";

const TG = "https://api.telegram.org";
const url = (process.env.SUPABASE_URL || "").trim();
const key = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const db = url && key ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

function botToken() {
  const plugin = (process.env.TELEGRAM_PLUGIN_BOT_TOKEN || "").trim();
  if (plugin) return plugin;
  return (process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN || "").trim();
}

function configuredChannel() {
  return (process.env.TELEGRAM_PLUGIN_CHANNEL_ID || process.env.TELEGRAM_PLUGIN_CHANNEL_USERNAME || "@ProAudios").trim();
}

export function channelHandle() {
  const configured = configuredChannel();
  if (configured.startsWith("@") && configured.length > 1) return configured;
  const explicit = (process.env.TELEGRAM_PLUGIN_CHANNEL_USERNAME || "").trim();
  if (explicit) return explicit.startsWith("@") ? explicit : "@" + explicit;
  return "@ProAudios";
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://artistyaar.ir").replace(/\/$/, "");
}

export function pluginTokenConfigured() {
  return Boolean(botToken());
}
export { siteUrl };

export async function processPendingPluginPairs(limit = 5) {
  // Caption recovery path for latest published posts while full ingest is restored
  const caption = await reapplyLatestPluginCaptions(Math.min(Number(limit) || 3, 5));
  return {
    processed: (caption.results || []).filter((r: { ok?: boolean }) => r.ok).length,
    errors: (caption.results || [])
      .filter((r: { ok?: boolean }) => !r.ok)
      .map((r: { id?: string; error?: string }) => ({
        photo_message_id: 0,
        document_message_id: 0,
        error: String(r.error || "caption_failed"),
        post_id: r.id,
      })),
    pending_checked: (caption.results || []).length,
    caption,
  };
}

export async function processPluginPair() {
  throw new Error("use_reapplyPluginCaption_or_restore_full_sync");
}

export async function setPluginWebhook(urlValue: string, secretToken?: string) {
  const t = botToken();
  if (!t) throw new Error("telegram_bot_token_missing");
  const res = await fetch(TG + "/bot" + t + "/setWebhook", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      url: urlValue,
      allowed_updates: ["channel_post"],
      ...(secretToken ? { secret_token: secretToken } : {}),
    }),
  });
  const data = await res.json();
  if (!data?.ok) throw new Error(data?.description || "setWebhook_failed");
  return data.result;
}

export async function getPluginWebhookInfo() {
  const t = botToken();
  if (!t) throw new Error("telegram_bot_token_missing");
  const res = await fetch(TG + "/bot" + t + "/getWebhookInfo");
  const data = await res.json();
  if (!data?.ok) throw new Error(data?.description || "getWebhookInfo_failed");
  return data.result;
}

export async function getPluginChannelAdminStatus() {
  const t = botToken();
  if (!t) return { is_administrator: false, can_edit_messages: false, error: "token_missing" };
  try {
    const meRes = await fetch(TG + "/bot" + t + "/getMe");
    const meData = await meRes.json();
    if (!meData?.ok) throw new Error(meData?.description || "getMe_failed");
    const chatId = configuredChannel();
    const memRes = await fetch(TG + "/bot" + t + "/getChatMember", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, user_id: meData.result.id }),
    });
    const memData = await memRes.json();
    if (!memData?.ok) throw new Error(memData?.description || "getChatMember_failed");
    const member = memData.result;
    const isAdmin = member?.status === "administrator" || member?.status === "creator";
    const canEdit = Boolean(member?.can_edit_messages);
    return {
      bot_id: meData.result.id,
      bot_username: meData.result.username,
      status: member?.status,
      is_administrator: isAdmin,
      can_edit_messages: canEdit,
      required_permissions_ok: isAdmin && canEdit,
    };
  } catch (error) {
    return {
      is_administrator: false,
      can_edit_messages: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function getAiRoutingDiagnostics() {
  return { note: "full_ai_pipeline_pending_restore" };
}

export {
  telegramBytes,
  telegramGetFile,
  pluginImageResponse,
} from "@/lib/telegram-plugin-media";

export { reapplyPluginCaption, reapplyLatestPluginCaptions };
