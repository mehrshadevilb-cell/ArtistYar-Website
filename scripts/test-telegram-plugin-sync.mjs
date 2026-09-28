import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

const sync = read("../src/lib/telegram-plugin-sync.ts");
const intelligence = read("../src/lib/telegram-plugin-intelligence.ts");
const caption = read("../src/lib/telegram-plugin-caption.ts");
const webhook = read("../src/app/api/telegram/plugins/webhook/route.ts");
const processRoute = read("../src/app/api/telegram/plugins/process/route.ts");
const processScript = read("../scripts/process-telegram-plugins.mjs");
const renderYaml = read("../render.yaml");
const bot = read("../src/lib/telegram-plugin-bot.ts");
const adminPage = read("../src/components/admin/TelegramPluginCaptionStudio.tsx");
const adminRoute = read("../src/app/api/admin/telegram/plugins/route.ts");
const pluginsDb = read("../src/lib/plugins-db.ts");
const patcher = read("../scripts/patch-telegram-plugin-intelligence.mjs");
assert.match(patcher, /review_required: false/);
assert.match(patcher, /telegram_file_ids/);
assert.match(patcher, /attachment_count/);
assert.match(patcher, /edited_channel_post/);
assert.match(sync, /allowed_updates: \["channel_post", "edited_channel_post"\]/);
assert.match(webhook, /edited_channel_post/);


assert.match(sync, /export async function enqueuePluginMessage/);
assert.match(sync, /export async function processPendingPluginPairs/);
assert.match(sync, /const result = await processPluginPair\(pair\.photo, pair\.document\)/);
assert.match(sync, /claim_telegram_plugin_pair/);
assert.match(sync, /next_attempt_at/);
assert.match(sync, /syncPublishedPluginCover/);
assert.match(sync, /messageBelongsToConfiguredChannel/);
assert.doesNotMatch(sync, /adm-zip|yauzl|JSZip|node-stream-zip|unzipper|extract-zip/i);
assert.doesNotMatch(sync, /extractAllTo|extractEntry|unzipSync|gunzipSync/);

assert.match(intelligence, /Never guess/);
assert.match(intelligence, /visionCandidate/);
assert.match(intelligence, /webSearch/);
assert.match(intelligence, /officialRank/);
assert.match(intelligence, /MAX_SEARCH_QUERIES/);
assert.match(intelligence, /MAX_REANALYSIS/);
assert.match(intelligence, /latestOfficialVersion/);
assert.match(intelligence, /identity_conflict/);
assert.match(intelligence, /evidence_refs/);
assert.match(intelligence, /product_count/);
assert.match(intelligence, /included_products/);
assert.match(intelligence, /buildVerifiedCaption/);
assert.match(intelligence, /isGenericTitle/);
assert.doesNotMatch(intelligence, /title \\|\\| "Plugin"/);
assert.doesNotMatch(intelligence, /title \\|\\| "Software"/);

assert.match(caption, /regenerateStoredCaption/);
assert.match(caption, /publishPluginCaption/);
assert.doesNotMatch(caption, /Official/i);

assert.match(webhook, /x-telegram-bot-api-secret-token/);
assert.match(webhook, /edited_channel_post/);
assert.match(processRoute, /TELEGRAM_PLUGIN_PROCESS_SECRET/);
assert.match(processScript, /TELEGRAM_PLUGIN_PROCESS_SECRET/);
assert.match(renderYaml, /artistyar-telegram-plugin-processor/);
assert.match(renderYaml, /schedule: "\*\/2 \* \* \* \*"/);

assert.match(bot, /resolvePluginBotToken/);
assert.match(bot, /TELEGRAM_PLUGIN_BOT_TOKEN/);
assert.doesNotMatch(bot, /console\\.log\\([^)]*token/i);

assert.match(adminPage, /Original Source/);
assert.match(adminPage, /Verified Information/);
assert.match(adminPage, /Final Caption/);
assert.match(adminPage, /product_locked/);
assert.match(adminRoute, /lock_product/);
assert.match(adminRoute, /unlock_product/);
assert.match(adminRoute, /feedback/);
assert.match(adminRoute, /verification_gate_required/);
assert.match(pluginsDb, /eq\("review_required", false\)/);
assert.match(patcher, /ARTISTYAR_TELEGRAM_INTELLIGENCE_WRAPPER/);

for (const category of ["DAW", "Audio Effect Plugin", "VST Instrument", "Sample Library", "Preset Library", "Plugin Bundle"]) {
  assert.ok(intelligence.includes(category), "missing category: " + category);
}

console.log("telegram plugin regression checks passed");
