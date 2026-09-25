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
assert.match(card, /image\.style\.opacity = "0"/);

console.log("telegram plugin sync regression checks passed");
