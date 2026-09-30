import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const intelligencePath = resolve(root, "src/lib/telegram-plugin-intelligence.ts");
const syncPath = resolve(root, "src/lib/telegram-plugin-sync.ts");

let intelligence = readFileSync(intelligencePath, "utf8");

// Canonical product taxonomy. Keep the existing detailed categories available,
// but normalize common model/source synonyms into deterministic buckets so a DAW
// cannot be published as a generic audio plugin and an instrument cannot become a DAW.
const taxonomy = `function normalizeCategory(value: unknown): ProductCategory | "" {
  const t = clean(value, 120).toLowerCase();
  if (!t) return "";

  if (/\b(daw|digital audio workstation|music production software)\b/.test(t)) return "DAW";
  if (/\b(vst instrument|virtual instrument|software instrument|synth|synthesizer|sampler|instrument)\b/.test(t)) return "VST Instrument";
  if (/\b(sample|samples|loop|loops|sample pack|loop pack|drum kit|one[- ]shot|construction kit)\b/.test(t)) return "Sample Pack";
  if (/\b(library|sound library|sample library|instrument library|kontakt library|orchestral library|preset library|preset pack|soundbank|sound bank|patch bank)\b/.test(t)) return "Sound Library";
  if (/\b(audio plugin|audio effect|effect plugin|vst plugin|plugin|audio processor|utility plugin|audio utility)\b/.test(t)) return "Audio Plugin";

  if (PRODUCT_CATEGORIES.some((x) => x.toLowerCase() === t)) {
    return PRODUCT_CATEGORIES.find((x) => x.toLowerCase() === t) || "";
  }
  return "";
}`;

intelligence = intelligence.replace(
  /function normalizeCategory\(value: unknown\): ProductCategory \| "" \{[\s\S]*?\n\}\n\n/,
  taxonomy + "\n\n",
);

// Ensure the canonical categories are accepted by downstream validation.
const categoryList = /export const PRODUCT_CATEGORIES = \[[\s\S]*?\] as const;/;
const listMatch = intelligence.match(categoryList);
if (listMatch) {
  let list = listMatch[0];
  for (const category of ["Audio Plugin", "VST Instrument", "Sound Library"]) {
    if (!list.includes(JSON.stringify(category))) {
      list = list.replace(/\n\]; as const;|\n\] as const;/, `  ${JSON.stringify(category)},\n] as const;`);
    }
  }
  intelligence = intelligence.replace(categoryList, list);
}

// If a translated caption is missing while the source caption is non-Persian,
// force the verifier to retain a safe source-grounded description rather than
// publishing an empty/placeholder Persian caption.
intelligence = intelligence.replace(
  /const intro = qualityCaptionText\(result\.translatedCaption \|\| result\.description\);/,
  'const intro = qualityCaptionText(result.translatedCaption || result.description || "");',
);

writeFileSync(intelligencePath, intelligence);

let sync = readFileSync(syncPath, "utf8");

// Covers are served directly from Telegram using the bot file_id. No plugin
// binary or cover is uploaded to Supabase Storage.
sync = sync.replace(
  /\n\s*let coverError = ""[\s\S]*?\n\s*}\n\s*await markQueueDone/,
  '\n  // Telegram is the sole media source. Do not persist covers/files in Storage.\n  const coverError = "";\n  await markQueueDone',
);

sync = sync.replace(
  /cover_public_url: !coverError,\s*cover_error: coverError \|\| null,/,
  'cover_public_url: false, cover_error: null,',
);

sync = sync.replace(
  /error_message: coverError \? "cover_sync_deferred:" \+ coverError : null,/,
  'error_message: null,',
);

writeFileSync(syncPath, sync);
console.log("telegram plugin runtime hardening applied");
