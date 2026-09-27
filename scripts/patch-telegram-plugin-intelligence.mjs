import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const target = resolve(root, "src/lib/telegram-plugin-sync.ts");

let source = readFileSync(target, "utf8");

if (source.includes("ARTISTYAR_TELEGRAM_INTELLIGENCE_WRAPPER")) {
  console.log("telegram plugin intelligence wrapper already applied");
  process.exit(0);
}

if (!source.includes("export async function processPluginPair(")) {
  throw new Error("telegram_plugin_sync_process_pair_not_found");
}

source = source.replace(
  /export async function processPluginPair\(/,
  "async function processPluginPairLegacy(",
);
source = source.replace(/\bprocessPluginPair\(/g, "processPluginPairLegacy(");

source = `import {
  analyzeTelegramPluginPost,
  applyVerificationToPost,
  buildVerifiedCaption,
  createReviewRequiredPost,
} from "@/lib/telegram-plugin-intelligence";
import type { VerificationResult } from "@/lib/telegram-plugin-intelligence";

${source}
`;

source = source.replace(/const finalCaption = makeCaption\(p\);/g, 'const finalCaption = (globalThis as any).__ARTISTYAR_VERIFIED_CAPTION || makeCaption(p);');

source += `

/**
 * ARTISTYAR_TELEGRAM_INTELLIGENCE_WRAPPER
 * Evidence-first gate around the existing production pair processor.
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

  let intelligence: VerificationResult;
  try {
    intelligence = await analyzeTelegramPluginPost({ photoFileId, rawCaption, fileName });
  } catch (error) {
    console.error("telegram_plugin_intelligence_failed", error instanceof Error ? error.message : String(error));
    intelligence = {
      ok: false, reviewRequired: true, title: "", developer: "", version: "", latestOfficialVersion: "", category: "",
      formats: [], platforms: [], features: [], description: "", installationNotes: "", translatedCaption: "",
      detectedLanguage: "Unknown", confidence: "low",
      evidence: [{ source: "caption", status: rawCaption ? "supporting" : "missing" }, { source: "filename", status: fileName ? "supporting" : "missing" }],
      verificationStatus: "failed", verifiedSourceUrl: "", verifiedSourceTitle: "", searchStatus: "unavailable",
      productCount: 0, includedProducts: [], fileIdentity: { fileName, consistent: false, detail: "pipeline_failed" },
      reason: "intelligence_pipeline_failed",
    };
  }

  if (!intelligence.ok) {
    const review = await createReviewRequiredPost({
      channelId, photoMessageId, documentMessageId, photoFileId, documentFileId,
      fileName, mimeType, fileSize, rawCaption, result: intelligence,
    });
    return { ok: false, review_required: true, id: review.id, title: intelligence.title || "نیازمند بررسی", reason: intelligence.reason || "verification_required" };
  }

  (globalThis as any).__ARTISTYAR_VERIFIED_CAPTION = buildVerifiedCaption(intelligence);
  try {
    const result = await processPluginPairLegacy(photo, doc);
    const postId = String(result?.id || "");
    if (postId) {
      const applied = await applyVerificationToPost(postId, intelligence);
      if (!applied.ok) console.error("telegram_plugin_verified_caption_apply_failed", applied);
    }
    return {
      ...result,
      intelligence: {
        confidence: intelligence.confidence,
        verification_status: intelligence.verificationStatus,
        verified_source_url: intelligence.verifiedSourceUrl,
      },
    };
  } finally {
    delete (globalThis as any).__ARTISTYAR_VERIFIED_CAPTION;
  }
}
`;

writeFileSync(target, source);
console.log("patched telegram-plugin-sync.ts with evidence-first intelligence wrapper");
