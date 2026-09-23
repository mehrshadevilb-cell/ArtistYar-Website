import { createHash } from "crypto";
import https from "https";

import { createClient } from "@supabase/supabase-js";

type TgMessage = {
  message_id: number;
  chat?: { id: number; username?: string; title?: string; type?: string };
  caption?: string;
  photo?: Array<{ file_id: string; width: number; height: number }>;
  document?: { file_id: string; file_name?: string; mime_type?: string; file_size?: number };
};

export function pluginTokenConfigured() { return Boolean((process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN || process.env.BOT_TOKEN || "").trim()); }
export function siteUrl() { return (process.env.NEXT_PUBLIC_SITE_URL || "https://artistyaar.ir").replace(/\/$/, ""); }
export async function processPendingPluginPairs(limit = 5) { return { processed: 0, errors: [{ photo_message_id: 0, document_message_id: 0, error: "telegram_plugin_sync_temporarily_restoring" }], pending_checked: 0 }; }
export async function enqueuePluginMessage(message: TgMessage) { return { ignored: true, reason: "telegram_plugin_sync_temporarily_restoring" }; }
export async function processPluginPair() { throw new Error("telegram_plugin_sync_temporarily_restoring"); }
export async function setPluginWebhook() { throw new Error("telegram_plugin_sync_temporarily_restoring"); }
export async function getPluginWebhookInfo() { return {}; }
export async function getPluginChannelAdminStatus() { return { required_permissions_ok: false }; }
export async function pluginImageResponse() { throw new Error("telegram_plugin_sync_temporarily_restoring"); }
export async function pluginDownloadResponse() { throw new Error("telegram_plugin_sync_temporarily_restoring"); }
export async function telegramBytes() { throw new Error("telegram_plugin_sync_temporarily_restoring"); }
export async function getAiRoutingDiagnostics() { return { providers: [] }; }
