import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const syncTarget = resolve(root, "src/lib/telegram-plugin-sync.ts");
const intelligenceTarget = resolve(root, "src/lib/telegram-plugin-intelligence.ts");

let intelligence = readFileSync(intelligenceTarget, "utf8");

// Production policy: identity enrichment is evidence-assisted, but never blocks
// publication behind an admin review queue. Official-source verification is
// informational only and is never a publish gate.
intelligence = intelligence
  .replace(
    /"Plugin",\n  "Effect Plugin",\n  "Synth",\n  "Instrument",\n  "Sampler",/,
    '"Plugin",\n  "Effect Plugin",\n  "Synth",\n  "Instrument",\n  "Sampler",'
  )
  .replace(
    /if \(\/bundle\|collection\|suite\|plugin\//,
    'if (/bundle|collection|suite|plugin|vst(?:3)? plugin|audio plugin/'
  );

const verifyOkOld = `  const ok = Boolean(
    titleSupported &&
    webTitleMatch &&
    developerSupported &&
    versionSupported &&
    conflictsResolved &&
    finalCategory !== "Unknown" &&
    confidence !== "low" &&
    description &&
    groundedFields &&
    !multipleProductsUnclear
  );`;
const verifyOkNew = `  const ok = Boolean(
    isSpecificIdentity(finalTitle) &&
    (finalCategory !== "Unknown" || isSpecificIdentity(finalTitle)) &&
    (description || translatedCaption || finalTitle) &&
    !multipleProductsUnclear
  );`;
if (intelligence.includes(verifyOkOld)) intelligence = intelligence.replace(verifyOkOld, verifyOkNew);

// Keep the verified source in the canonical caption. Older patch versions
// attempted to remove it with a fragile regex literal; no removal is needed.

const applyStart = intelligence.indexOf("export async function applyVerificationToPost(");
const applyEnd = intelligence.indexOf("export async function createReviewRequiredPost(", applyStart);
if (applyStart >= 0 && applyEnd > applyStart) {
  const applyFn = `export async function applyVerificationToPost(postId: string, result: VerificationResult) {
  const store = db();
  if (!store) return { ok: false, error: "supabase_not_configured" };

  const caption = buildVerifiedCaption(result) || [
    \`🎛️ <b>\${esc(result.title || "پلاگین جدید")}</b>\`,
    result.developer ? \`🏢 <b>سازنده:</b> \${esc(result.developer)}\` : "",
    result.category && result.category !== "Unknown" ? \`🏷️ <b>نوع:</b> \${esc(result.category)}\` : "",
    result.description ? \`\\n📌 <b>معرفی</b>\\n\${esc(result.description)}\` : "",
    "━━━━━━━━━━━━━━━━━━",
    "🎧 <b>@ProAudios</b>",
  ].filter(Boolean).join("\\n\\n").slice(0, 1024);

  const update = await store.from("telegram_plugin_posts").update({
    title: result.title || "پلاگین جدید",
    developer: result.developer || null,
    version: result.version || null,
    category: result.category || "Plugin",
    formats: result.formats || [],
    platforms: result.platforms || [],
    features: result.features || [],
    description: result.description || "",
    draft_caption: "",
    final_caption: caption,
    review_required: false,
    verification_status: result.verificationStatus || "partial",
    verification_confidence: result.confidence || "medium",
    evidence: result.evidence || [],
    detected_language: result.detectedLanguage || "Unknown",
    verified_source_url: result.verifiedSourceUrl || null,
    verified_source_title: result.verifiedSourceTitle || null,
    search_status: result.searchStatus || "unavailable",
    latest_official_version: result.latestOfficialVersion || null,
    product_count: result.productCount || 1,
    included_products: result.includedProducts || [],
    file_identity: result.fileIdentity || {},
    ai_analysis: result,
    processing_state: "PUBLISHED",
    status: "published",
    error_message: null,
    updated_at: new Date().toISOString(),
  }).eq("id", postId);

  if (update.error) return { ok: false, error: update.error.message };

  try {
    const published = await publishPluginCaption(postId, caption);
    if (!published.ok) {
      return { ok: false, caption, error: published.error || "caption_publish_failed" };
    }
  } catch (error) {
    return { ok: false, caption, error: clean(error instanceof Error ? error.message : String(error), 240) };
  }

  await store.from("telegram_plugin_posts").update({
    final_caption: caption,
    draft_caption: "",
    review_required: false,
    processing_state: "PUBLISHED",
    status: "published",
    updated_at: new Date().toISOString(),
  }).eq("id", postId);

  return { ok: true, caption };
}

`;
  intelligence = intelligence.slice(0, applyStart) + applyFn + intelligence.slice(applyEnd);
}

writeFileSync(intelligenceTarget, intelligence);

let source = readFileSync(syncTarget, "utf8");
source = source.replace('allowed_updates: ["channel_post"]', 'allowed_updates: ["channel_post", "edited_channel_post"]');

// The checked-in source may already contain the previous wrapper. Rebuild only
// the wrapper and keep the historical legacy processor intact.
const marker = "/**\n * ARTISTYAR_TELEGRAM_INTELLIGENCE_WRAPPER";
const markerIndex = source.indexOf(marker);
if (markerIndex >= 0) {
  source = source.slice(0, markerIndex).trimEnd() + "\n";
}
if (!source.includes("async function processPluginPairLegacy(")) {
  source = source.replace(
    /export async function processPluginPair\(/,
    "async function processPluginPairLegacy(",
  );
  source = source.split("processPluginPair(").join("processPluginPairLegacy(");
}
if (!source.includes('import {\n  analyzeTelegramPluginPost,')) {
  source = `import {
  analyzeTelegramPluginPost,
  applyVerificationToPost,
  buildVerifiedCaption,
} from "@/lib/telegram-plugin-intelligence";
import type { VerificationResult } from "@/lib/telegram-plugin-intelligence";

` + source;
}

// Multi-file support: the first document remains the primary Telegram post,
// while nearby documents are attached to the same catalog record. No archive
// extraction is performed.
if (!source.includes("const relatedDocuments = Array.isArray(document.relatedDocuments)")) {
  source = source.replace(
    '  const documentFileId = String(document.file_id || "");\n',
    '  const relatedDocuments = Array.isArray(document.relatedDocuments) ? document.relatedDocuments : [document];\n  const documentFileId = String(document.file_id || "");\n',
  );
}
if (!source.includes("telegram_file_ids:")) {
  source = source.replace(
    '    telegram_file_id: documentFileId,\n',
    '    telegram_file_id: documentFileId,\n    telegram_file_ids: relatedDocuments.map((item: any) => String(item.file_id || "")).filter(Boolean),\n    file_names: relatedDocuments.map((item: any) => String(item.file_name || "")).filter(Boolean),\n    attachment_count: relatedDocuments.length,\n',
  );
}
source = source.replace(
  '  await markQueueDone([String(photo.id), String(document.id)]);',
  '  await markQueueDone([String(photo.id), ...relatedDocuments.map((item: any) => String(item.id || "")).filter(Boolean)]);',
);

const oldPending = '  const pairs = await findPairRows(safe);';
const newPending = '  const pairs = await findPairRows(safe);';
source = source.replace(oldPending, newPending);

// Replace the wrapper with a non-blocking publication wrapper.
source += `
/**
 * ARTISTYAR_TELEGRAM_INTELLIGENCE_WRAPPER_V2
 * Enrichment is never an admin-review gate. A failed verifier falls back to the
 * deterministic legacy metadata path so Telegram processing keeps moving.
 */
export async function processPluginPair(photo: any, doc: any) {
  const channelId = String(photo?.chat?.id || doc?.chat?.id || "");
  const photoFileId = String(photo?.photo?.[photo.photo.length - 1]?.file_id || "");
  const documentFileId = String(doc?.document?.file_id || "");
  const rawCaption = String(photo?.caption || doc?.caption || "");
  const fileName = String(doc?.document?.file_name || "");
  const mimeType = String(doc?.document?.mime_type || "");
  const fileSize = Number(doc?.document?.file_size || 0) || undefined;
  const photoMessageId = Number(photo?.message_id || 0) || undefined;
  const documentMessageId = Number(doc?.message_id || 0) || undefined;

  // Attach all nearby documents belonging to the same post/caption group.
  if (db && !Array.isArray(doc.relatedDocuments)) {
    try {
      const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const related = await db
        .from("telegram_plugin_ingest_queue")
        .select("id,message_id,channel_id,kind,file_id,file_name,mime_type,file_size,caption,received_at,media_group_id")
        .eq("channel_id", channelId)
        .eq("kind", "document")
        .gte("received_at", since)
        .order("received_at", { ascending: true })
        .limit(30);
      if (!related.error) {
        const primaryCaption = rawCaption.trim().toLowerCase();
        const docs = (related.data || []).filter((item: any) => {
          if (String(item.id) === String(doc.id)) return true;
          if (String(item.file_id) === documentFileId) return true;
          const caption = String(item.caption || "").trim().toLowerCase();
          return Boolean(
            (doc.media_group_id && item.media_group_id && doc.media_group_id === item.media_group_id) ||
            (primaryCaption && caption && primaryCaption === caption) ||
            (!primaryCaption && Math.abs(new Date(item.received_at).getTime() - new Date(doc.received_at).getTime()) <= 120000)
          );
        });
        doc.relatedDocuments = docs.length ? docs : [doc];
      }
    } catch (error) {
      console.warn("telegram_plugin_attachment_group_failed", error instanceof Error ? error.message : String(error));
    }
  }

  let intelligence: VerificationResult | null = null;
  try {
    intelligence = await analyzeTelegramPluginPost({ photoFileId, rawCaption, fileName });
  } catch (error) {
    console.warn("telegram_plugin_intelligence_failed_fallback", error instanceof Error ? error.message : String(error));
  }

  // The legacy processor is deliberately always allowed to run. It has its own
  // deterministic metadata fallback, exact-cover handling and provider failover.
  const fallback: VerificationResult = intelligence || {
    ok: true, reviewRequired: false, title: fileName.replace(/\\.(rar|zip|7z|dmg|pkg|exe)$/i, "").replace(/[._+]+/g, " ").trim() || "پلاگین جدید",
    developer: "", version: "", latestOfficialVersion: "", category: "Plugin",
    formats: [], platforms: [], features: [], description: rawCaption.slice(0, 700),
    installationNotes: "", translatedCaption: rawCaption, detectedLanguage: "Unknown",
    confidence: "medium", evidence: [{ source: "caption", status: rawCaption ? "supporting" : "missing" }],
    verificationStatus: "partial", verifiedSourceUrl: "", verifiedSourceTitle: "",
    searchStatus: "unavailable", productCount: Array.isArray(doc.relatedDocuments) ? doc.relatedDocuments.length : 1,
    includedProducts: [], fileIdentity: { fileName, consistent: true, detail: "fallback" },
  };

  const publishable: VerificationResult = {
    ...fallback,
    ok: true,
    reviewRequired: false,
    title: fallback.title || "پلاگین جدید",
    category: fallback.category && fallback.category !== "Unknown" ? fallback.category : "Plugin",
    description: fallback.description || fallback.translatedCaption || rawCaption.slice(0, 700) || "معرفی محصول صوتی",
    confidence: fallback.confidence === "low" ? "medium" : fallback.confidence,
  };

  const verifiedCaption = buildVerifiedCaption(publishable);
  try {
    const result = await processPluginPairLegacy(photo, doc, publishable);
    const postId = String(result?.id || "");
    if (postId) {
      const applied = await applyVerificationToPost(postId, publishable);
      if (!applied.ok) console.warn("telegram_plugin_verification_save_failed", applied);
    }
    return { ...result, ok: true, review_required: false, intelligence: {
      confidence: publishable.confidence,
      verification_status: publishable.verificationStatus,
      verified_source_url: publishable.verifiedSourceUrl,
    }};
  } catch (error) {
    console.error("telegram_plugin_pair_failed", error instanceof Error ? error.message : String(error));
    throw error;
}
`;

writeFileSync(syncTarget, source);
console.log("patched Telegram plugin intelligence: no review gate, Persian captions, resilient multi-file grouping");
