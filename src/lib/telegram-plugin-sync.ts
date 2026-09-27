/**
 * Telegram -> ArtistYar plugin sync.
 * ARTISTYAR_CAPTION_QUALITY_V3
 *
 * This module is the canonical runtime for webhook ingestion, queue processing,
 * Telegram media access, metadata generation and publication. Archives are never
 * extracted: filenames/captions are the only archive evidence used.
 */
import { createClient } from "@supabase/supabase-js";
import { resolvePluginBotToken } from "@/lib/telegram-plugin-bot";
import { reapplyPluginCaption, reapplyLatestPluginCaptions } from "@/lib/telegram-plugin-caption";
import { getConfiguredProviders } from "@/lib/ai-providers";

const TG = "https://api.telegram.org";
const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
const SUPABASE_KEY = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const db = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

export type TgMessage = {
  message_id: number;
  chat?: { id?: number | string; username?: string; type?: string };
  caption?: string;
  media_group_id?: string;
  photo?: Array<{ file_id: string; file_unique_id?: string; width?: number; height?: number; file_size?: number }>;
  document?: {
    file_id: string;
    file_unique_id?: string;
    file_name?: string;
    mime_type?: string;
    file_size?: number;
    thumb?: { file_id: string };
    thumbnail?: { file_id: string };
  };
};

function clean(v: unknown, max = 500) {
  return String(v ?? "").replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function botToken() {
  return resolvePluginBotToken();
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
export { siteUrl };
