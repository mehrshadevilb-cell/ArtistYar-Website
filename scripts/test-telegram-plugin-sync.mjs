import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const sync = readFileSync(new URL("../src/lib/telegram-plugin-sync.ts", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/20260925_telegram_plugins_reliability.sql", import.meta.url), "utf8");
const card = readFileSync(new URL("../src/components/plugins/LatestPluginsLive.tsx", import.meta.url), "utf8");

assert.match(sync, /thumbnail\?: \{ file_id: string/);
assert.match(sync, /doc\.document\?\.thumbnail\?\.file_id/);
assert.match(sync, /processPluginPair\(photo: TgMessage \| null/);
assert.match(sync, /claim_telegram_plugin_item/);
assert.match(sync, /next_attempt_at/);
assert.match(sync, /status: "published"/);
assert.match(migration, /add column if not exists thumbnail_file_id/);
assert.match(migration, /create or replace function public\.claim_telegram_plugin_item/);
assert.match(migration, /create or replace function public\.claim_telegram_plugin_pair/);
assert.match(card, /ArtistYar \/ Plugin Lab/);
assert.match(card, /api\/plugins\/image\?file_id=/);
assert.match(card, /image\.style\.opacity = "0"/);
const caption = readFileSync(new URL("../src/lib/telegram-plugin-caption.ts", import.meta.url), "utf8");
assert.match(caption, /reply_markup/);
assert.match(caption, /وب‌سایت ArtistYar/);
const inflate = readFileSync(new URL("../scripts/inflate-telegram-sync.mjs", import.meta.url), "utf8");
assert.match(inflate, /reply_markup/);
assert.match(inflate, /کانال پلاگین‌ها/);
assert.match(inflate, /AI is enrichment, not a hard dependency/);
assert.match(inflate, /archives are NEVER extracted/i);
assert.match(inflate, /plugin_caption_generation_empty/);

console.log("telegram plugin sync regression checks passed");

const bot = readFileSync(new URL("../src/lib/telegram-plugin-bot.ts", import.meta.url), "utf8");
assert.match(bot, /resolvePluginBotToken/);
assert.match(bot, /TELEGRAM_PLUGIN_BOT_TOKEN/);
assert.match(bot, /BOT_TOKEN/);
assert.match(bot, /probePluginBotIdentity/);
assert.match(bot, /probeTelegramFileId/);
assert.doesNotMatch(bot, /console\.log\([^)]*token/i);

const media = readFileSync(new URL("../src/lib/telegram-plugin-media.ts", import.meta.url), "utf8");
assert.match(media, /resolvePluginBotToken/);

const imageRoute = readFileSync(new URL("../src/app/api/plugins/image/route.ts", import.meta.url), "utf8");
assert.match(imageRoute, /isTrustedStoredCover|telesco\.pe/);
assert.match(imageRoute, /pluginImageResponse/);
assert.match(imageRoute, /telegram_file_not_found_for_configured_bot|image_unavailable/);

const detail = readFileSync(new URL("../src/app/plugins/[id]/page.tsx", import.meta.url), "utf8");
assert.match(detail, /generateMetadata/);
assert.match(detail, /canonical/);
assert.match(detail, /notFound/);

console.log("telegram plugin bot-identity + cover + detail regression checks passed");
