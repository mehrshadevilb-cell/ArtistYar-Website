import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const sync = readFileSync(new URL("../src/lib/telegram-plugin-sync.ts", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/20260925_telegram_plugins_reliability.sql", import.meta.url), "utf8");
const caption = readFileSync(new URL("../src/lib/telegram-plugin-caption.ts", import.meta.url), "utf8");
const inflate = readFileSync(new URL("../scripts/inflate-telegram-sync.mjs", import.meta.url), "utf8");
const bot = readFileSync(new URL("../src/lib/telegram-plugin-bot.ts", import.meta.url), "utf8");
const media = readFileSync(new URL("../src/lib/telegram-plugin-media.ts", import.meta.url), "utf8");
const imageRoute = readFileSync(new URL("../src/app/api/plugins/image/route.ts", import.meta.url), "utf8");
const covers = readFileSync(new URL("../src/lib/telegram-plugin-covers.ts", import.meta.url), "utf8");
const detail = readFileSync(new URL("../src/app/plugins/[id]/page.tsx", import.meta.url), "utf8");
const card = readFileSync(new URL("../src/components/plugins/LatestPluginsLive.tsx", import.meta.url), "utf8");
const pkg = readFileSync(new URL("../package.json", import.meta.url), "utf8");

assert.match(sync, /export async function enqueuePluginMessage/);
assert.match(sync, /async function processQueuedPair/);
assert.match(sync, /export async function processPendingPluginPairs/);
assert.match(sync, /export async function processPluginPair\(photo: TgMessage \| null/);
assert.match(sync, /claim_telegram_plugin_pair/);
assert.match(sync, /next_attempt_at/);
assert.match(sync, /status: "published"/);
assert.match(sync, /onConflict: "channel_id,document_message_id"/);
assert.match(sync, /syncPublishedPluginCover/);
assert.match(sync, /deterministicMetadata/);
assert.match(sync, /buildRankedCandidates/);
assert.match(sync, /messageBelongsToConfiguredChannel/);

assert.doesNotMatch(sync, /\badm-zip\b|\byauzl\b|\bJSZip\b|\bnode-stream-zip\b|\bunzipper\b|\bextract-zip\b/i);
assert.doesNotMatch(sync, /\.extractAllTo\(|\.extract\(|extractEntry|unzipSync|gunzipSync\(/);
assert.doesNotMatch(pkg, /"adm-zip"|"yauzl"|"jszip"|"node-stream-zip"|"unzipper"|"extract-zip"/i);
assert.match(sync, /\.rar|\.zip|\.7z/);

assert.match(sync, /plugin_caption_generation_empty/);
assert.match(caption, /plugin_caption_generation_empty/);
assert.match(caption, /reply_markup/);
assert.match(caption, /وب‌سایت ArtistYar/);
assert.match(caption, /کانال پلاگین‌ها/);
assert.match(caption, /resolvePluginBotToken/);

assert.match(bot, /resolvePluginBotToken/);
assert.match(bot, /TELEGRAM_PLUGIN_BOT_TOKEN/);
assert.match(bot, /BOT_TOKEN/);
assert.match(bot, /probePluginBotIdentity/);
assert.match(bot, /probeTelegramFileId/);
assert.doesNotMatch(bot, /console\.log\([^)]*token/i);
assert.match(media, /resolvePluginBotToken/);

assert.match(covers, /syncPublishedPluginCover/);
assert.match(covers, /cover_storage_path/);
assert.match(covers, /cover_public_url/);
assert.match(imageRoute, /isTrustedStoredCover/);
assert.match(imageRoute, /pluginImageResponse/);
assert.match(imageRoute, /telegram_file_not_found_for_configured_bot|image_unavailable/);
assert.match(card, /api\/plugins\/image\?file_id=/);
assert.match(card, /image\.style\.opacity = "0"/);
assert.match(card, /telesco\.pe/);
assert.match(detail, /generateMetadata/);
assert.match(detail, /canonical/);
assert.match(detail, /notFound/);

assert.match(migration, /create or replace function public\.claim_telegram_plugin_item/);
assert.match(migration, /create or replace function public\.claim_telegram_plugin_pair/);
assert.match(inflate, /canonical production runtime/);
assert.match(inflate, /syncPublishedPluginCover/);

console.log("telegram plugin sync regression checks passed");
console.log("telegram plugin bot-identity + queue + cover + detail + archive-safety checks passed");
