import { createHash } from "crypto";
import https from "https";

import { createClient } from "@supabase/supabase-js";

type TgMessage = {
  message_id: number;
  media_group_id?: string;
  chat?: { id: number; username?: string; title?: string; type?: string };
  caption?: string;
  photo?: Array<{ file_id: string; width: number; height: number }>;
  document?: { file_id: string; file_name?: string; mime_type?: string; file_size?: number; thumbnail?: { file_id: string; width: number; height: number } };
};

type PluginData = {
  title: string; developer: string; version: string; category: string;
  formats: string[]; platforms: string[]; description: string; features: string[]; tags: string[];
  translatedCaption?: string;
};

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

export function pluginTokenConfigured() { return Boolean(botToken()); }
export { siteUrl };

// NOTE: Full module body was truncated during emergency recovery.
// The complete implementation is in artifacts/telegram-plugin-sync.FULL.ts
// and commit ab94738 blob 45c6438446a6857ffa7fd0cbec54db4734c1b520.
// This partial restore keeps the app building; process/webhook routes will no-op until full restore.

export async function processPendingPluginPairs(_limit = 5) {
  return { processed: 0, errors: [{ error: "sync_module_partial_restore" }], pending_checked: 0 };
}
export async function processPluginPair() {
  throw new Error("sync_module_partial_restore");
}
export async function setPluginWebhook(urlValue: string, secretToken?: string) {
  const t = botToken();
  if (!t) throw new Error("telegram_bot_token_missing");
  const res = await fetch(TG + "/bot" + t + "/setWebhook", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url: urlValue, allowed_updates: ["channel_post"], ...(secretToken ? { secret_token: secretToken } : {}) }),
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
  return { is_administrator: false, can_edit_messages: false, note: "partial_restore" };
}
export async function telegramBytes(_fileId: string) {
  throw new Error("sync_module_partial_restore");
}
export async function telegramGetFile(_fileId: string) {
  throw new Error("sync_module_partial_restore");
}
export function getAiRoutingDiagnostics() {
  return { note: "partial_restore" };
}
