import { createClient } from "@supabase/supabase-js";
import { runtimeGenerateJson } from "@/lib/ai-runtime";
import { resolvePluginBotToken } from "@/lib/telegram-plugin-bot";
import { publishPluginCaption } from "@/lib/telegram-plugin-caption";

const TG = "https://api.telegram.org";
const SEARCH_CACHE_TTL = 1000 * 60 * 60 * 12;
const MAX_SEARCH_QUERIES = 3;
const MAX_REANALYSIS = 2;
const memoryCache = new Map<string, { expiresAt: number; value: VerificationResult }>();

export type PluginEvidence = {
  source: "image" | "caption" | "filename" | "web";
  status: "confirmed" | "supporting" | "conflict" | "missing";
  detail?: string;
};

export type VerificationResult = {
  ok: boolean;
  reviewRequired: boolean;
  title: string;
  developer: string;
  version: string;
  latestOfficialVersion: string;
  category: string;
  formats: string[];
  platforms: string[];
  features: string[];
  description: string;
  installationNotes: string;
  translatedCaption: string;
  detectedLanguage: string;
  confidence: "high" | "medium" | "low";
  evidence: PluginEvidence[];
  verificationStatus: "verified" | "partial" | "unavailable" | "failed";
  verifiedSourceUrl: string;
  verifiedSourceTitle: string;
  searchStatus: "verified" | "no_match" | "unavailable";
  reason?: string;
};

type Candidate = Partial<Omit<VerificationResult, "ok" | "reviewRequired" | "evidence" | "confidence" | "verificationStatus" | "verifiedSourceUrl" | "verifiedSourceTitle" | "searchStatus">>;

function db() {
  const url = (process.env.SUPABASE_URL || "").trim();
  const key = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function clean(v: unknown, max = 600) {
  return String(v ?? "").replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function parseJson(text: string): any {
  const raw = String(text || "").trim().replace(/^\`\`\`(?:json)?\s*/i, "").replace(/\s*\`\`\`$/i, "").trim();
  try { return JSON.parse(raw); } catch { return null; }
}

function isGenericTitle(title: string) {
  return !title || /^(?:plugin|audio plugin|software|daw|audio software|vst|پلاگین(?: جدید| بدون نام)?|نرم.?افزار)$/i.test(clean(title, 180));
}

export function isSpecificIdentity(title: string) {
  const t = clean(title, 180);
  if (isGenericTitle(t)) return false;
  return /[A-Za-z0-9]/.test(t) && t.length >= 3 && t.length <= 120;
}

function languageOf(text: string) {
  if (/[А-ЯЁа-яё]/.test(text)) return "Russian";
  if (/[\u0600-\u06ff]/.test(text)) return "Persian";
  if (/[A-Za-z]/.test(text)) return "English";
  return "Unknown";
}

function filenameTitle(fileName: string) {
  let name = clean(fileName, 180);
  if (!name) return "";
  name = name.replace(/\.(rar|zip|7z|tar|gz|tgz|bz2|xz|dmg|pkg|msi|exe|appimage|vst3?|component|aaxplugin|clap|dll|so|dylib)$/i, "");
  name = name.replace(/[._+]+/g, " ").replace(/\s+/g, " ").trim();
  name = name.replace(/\b(?:incl(?:uded)?|patched|keygen|crack|repack|unlocked|r2r|moria|team|repost|win|mac|linux)\b.*$/i, "").trim();
  name = name.replace(/\s+v?\d+(?:[.\s_]\d+){1,3}\s*$/i, "").trim();
  return name.slice(0, 120);
}

function captionTitle(caption: string) {
  const lines = String(caption || "").split(/\r?\n/).map((x) => clean(x, 180)).filter(Boolean);
  for (const line of lines.slice(0, 6)) {
    const candidate = line
      .replace(/^(?:🔥|🎛️|🎹|📦|new|новинка|скачать|download)\s*/i, "")
      .replace(/\s+v?\d+(?:[.\s]\d+){1,3}\s*$/i, "")
      .replace(/(?:формат|format|разрядность|bit|системные|system|vst|au|aax).*/i, "")
      .trim();
    if (isSpecificIdentity(candidate)) return candidate;
  }
  return "";
}

function deterministicCandidate(caption: string, fileName: string): Candidate {
  const title = captionTitle(caption) || filenameTitle(fileName);
  const version = (caption.match(/\bv?(\d+(?:\.\d+){1,3})\b/i)?.[1] || "");
  const developer =
    /fabfilter/i.test(title) ? "FabFilter" :
    /spectrasonics|omnisphere|keyscape|trilian/i.test(title) ? "Spectrasonics" :
    /izotope|ozone|neutron/i.test(title) ? "iZotope" :
    /native instruments|kontakt|massive/i.test(title) ? "Native Instruments" :
    /arturia|pigments/i.test(title) ? "Arturia" :
    /waves|cla-76|h-delay/i.test(title) ? "Waves" :
    /ableton live/i.test(title) ? "Ableton" :
    /fl studio/i.test(title) ? "Image-Line" :
    /cubase/i.test(title) ? "Steinberg" : "";
  const category =
    /ableton live|fl studio|cubase|logic pro|studio one|bitwig|reaper|pro tools|reason/i.test(title) ? "DAW" :
    /omnisphere|keyscape|trilian|serum|massive|diva|pigments|sylenth|vital/i.test(title) ? "VST Instrument" :
    /sample|kontakt library|library|soundbank/i.test(caption + " " + fileName) ? "Sample Library" :
    /preset|patch bank|soundbank/i.test(caption + " " + fileName) ? "Preset Library" :
    /eq|equalizer|compressor|reverb|delay|limiter|saturation|distortion|de-esser/i.test(caption + " " + title) ? "Audio Effect Plugin" : "";
  return { title, developer, version, category, detectedLanguage: languageOf(caption) };
}

async function telegramBytes(fileId: string) {
  const token = resolvePluginBotToken();
  if (!token || !fileId) throw new Error("telegram_image_unavailable");
  const infoRes = await fetch(TG + "/bot" + token + "/getFile", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ file_id: fileId }), cache: "no-store", signal: AbortSignal.timeout(10000),
  });
  const info = await infoRes.json().catch(() => null);
  const path = info?.result?.file_path;
  if (!infoRes.ok || !info?.ok || !path) throw new Error("telegram_image_path_unavailable");
  const imageRes = await fetch("https://api.telegram.org/file/bot" + token + "/" + path, {
    cache: "no-store", signal: AbortSignal.timeout(15000),
  });
  if (!imageRes.ok) throw new Error("telegram_image_download_failed");
  const bytes = new Uint8Array(await imageRes.arrayBuffer());
  return { bytes, contentType: imageRes.headers.get("content-type") || "image/jpeg" };
}

async function visionCandidate(photoFileId: string, caption: string, fileName: string): Promise<Candidate> {
  const key = (process.env.OPENAI_API_KEY || "").trim();
  if (!key || !photoFileId) return {};
  const image = await telegramBytes(photoFileId);
  const base64 = Buffer.from(image.bytes).toString("base64");
  const model = (process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini").trim();
  const prompt = [
    "Identify the exact audio product visible in this Telegram artwork.",
    "Use the image as evidence, not as inspiration. Never guess.",
    "Also consider the original caption and filename as supporting evidence.",
    "Return JSON only with: title, developer, version, category, formats, platforms, features, confidence.",
    "If the exact product cannot be read or corroborated, set title to empty string and confidence to low.",
    "Original caption:", caption.slice(0, 5000),
    "Filename:", fileName.slice(0, 300),
  ].join("\n");
  const res = await fetch((process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "") + "/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + key },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 1200,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: "data:" + image.contentType + ";base64," + base64 } },
        ],
      }],
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(clean(data?.error?.message || "vision_failed", 240));
  const parsed = parseJson(data?.choices?.[0]?.message?.content || "");
  return parsed && typeof parsed === "object" ? {
    title: clean(parsed.title, 160),
    developer: clean(parsed.developer, 120),
    version: clean(parsed.version, 80),
    category: clean(parsed.category, 100),
    formats: Array.isArray(parsed.formats) ? parsed.formats.map((x: unknown) => clean(x, 40)).filter(Boolean).slice(0, 8) : [],
    platforms: Array.isArray(parsed.platforms) ? parsed.platforms.map((x: unknown) => clean(x, 40)).filter(Boolean).slice(0, 6) : [],
    features: Array.isArray(parsed.features) ? parsed.features.map((x: unknown) => clean(x, 180)).filter(Boolean).slice(0, 8) : [],
  } : {};
}

type SearchHit = { title: string; url: string; snippet: string };

async function webSearch(query: string): Promise<SearchHit[]> {
  const q = encodeURIComponent(query.slice(0, 180));
  const res = await fetch("https://www.bing.com/search?q=" + q + "&setlang=en-US", {
    headers: { "user-agent": "ArtistYar-Telegram-Plugin-Verifier/1.0" },
    cache: "no-store", signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error("web_search_http_" + res.status);
  const html = await res.text();
  const hits: SearchHit[] = [];
  const re = /<li class="b_algo"[\s\S]*?<h2><a href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/h2>[\s\S]*?<p>([\s\S]*?)<\/p>/gi;
  for (const match of html.matchAll(re)) {
    const strip = (v: string) => v.replace(/<[^>]+>/g, " ").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
    const url = match[1];
    if (!/^https?:\/\//i.test(url)) continue;
    hits.push({ title: strip(match[2]).slice(0, 180), url, snippet: strip(match[3]).slice(0, 400) });
    if (hits.length >= 6) break;
  }
  return hits;
}

function officialRank(url: string, developer: string) {
  const host = (() => { try { return new URL(url).hostname.toLowerCase(); } catch { return ""; } })();
  const d = developer.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!host) return 0;
  if (d && host.replace(/[^a-z0-9]/g, "").includes(d)) return 100;
  if (/fabfilter|spectrasonics|izotope|native-instruments|arturia|waves|ableton|image-line|steinberg|avid|bitwig|presonus|xferrecords|u-he|valhalladsp/.test(host)) return 95;
  if (/plugin-alliance|musicradar|gearspace|sweetwater|pluginboutique/.test(host)) return 45;
  return 20;
}

function cacheKey(title: string, developer: string, version: string) {
  return [title, developer, version].map((x) => clean(x, 120).toLowerCase()).join("|");
}

async function cachedSearch(title: string, developer: string, version: string) {
  const key = cacheKey(title, developer, version);
  const memory = memoryCache.get(key);
  if (memory && memory.expiresAt > Date.now()) return memory.value;
  const store = db();
  if (store) {
    const hit = await store.from("telegram_plugin_verification_cache").select("verification,verified_at").eq("cache_key", key).maybeSingle();
    if (!hit.error && hit.data?.verification && Date.parse(String(hit.data.verified_at || "")) > Date.now() - SEARCH_CACHE_TTL) {
      const value = hit.data.verification as VerificationResult;
      memoryCache.set(key, { expiresAt: Date.now() + SEARCH_CACHE_TTL, value });
      return value;
    }
  }
  return null;
}

function safeArray(v: unknown, max = 8) {
  return Array.isArray(v) ? v.map((x) => clean(x, 180)).filter(Boolean).slice(0, max) : [];
}

async function verifyCandidate(candidate: Candidate, rawCaption: string, fileName: string): Promise<VerificationResult> {
  const title = clean(candidate.title, 160);
  if (!isSpecificIdentity(title)) {
    return {
      ok: false, reviewRequired: true, title: title || "", developer: clean(candidate.developer, 120), version: clean(candidate.version, 80), latestOfficialVersion: "",
      category: "", formats: [], platforms: [], features: [], description: "", installationNotes: "", translatedCaption: "", detectedLanguage: languageOf(rawCaption),
      confidence: "low", evidence: [{ source: "caption", status: rawCaption ? "supporting" : "missing" }, { source: "filename", status: fileName ? "supporting" : "missing" }],
      verificationStatus: "failed", verifiedSourceUrl: "", verifiedSourceTitle: "", searchStatus: "no_match", reason: "exact_product_identity_missing",
    };
  }

  const developer = clean(candidate.developer, 120);
  const version = clean(candidate.version, 80);
  const cached = await cachedSearch(title, developer, version);
  if (cached) return cached;

  let hits: SearchHit[] = [];
  let searchAvailable = true;
  try {
    const queries = [
      [title, developer].filter(Boolean).join(" "),
      [title, version].filter(Boolean).join(" "),
      developer ? [developer, title, "official"].join(" ") : [title, "official product"].join(" "),
    ].filter(Boolean).slice(0, MAX_SEARCH_QUERIES);
    const groups = await Promise.all(queries.map((query) => webSearch(query)));
    const seen = new Set<string>();
    for (const group of groups) for (const hit of group) {
      if (!seen.has(hit.url)) { seen.add(hit.url); hits.push(hit); }
    }
  } catch {
    searchAvailable = false;
  }
  if (!searchAvailable) {
    return {
      ok: false,
      reviewRequired: true,
      title,
      developer,
      version,
      latestOfficialVersion: "",
      category: clean(candidate.category, 100),
      formats: safeArray(candidate.formats, 8),
      platforms: safeArray(candidate.platforms, 6),
      features: safeArray(candidate.features, 8),
      description: clean(candidate.description, 700),
      installationNotes: clean(candidate.installationNotes, 700),
      translatedCaption: clean(candidate.translatedCaption, 2500),
      detectedLanguage: languageOf(rawCaption),
      confidence: "medium",
      evidence: [
        { source: "caption", status: rawCaption ? "confirmed" : "missing" },
        { source: "filename", status: fileName ? "supporting" : "missing" },
        { source: "web", status: "missing", detail: "search_unavailable" },
      ],
      verificationStatus: "unavailable",
      verifiedSourceUrl: "",
      verifiedSourceTitle: "",
      searchStatus: "unavailable",
      reason: "verification_unavailable",
    };
  }

  const ranked = hits.slice().sort((a, b) => officialRank(b.url, developer) - officialRank(a.url, developer));
  const evidenceText = ranked.slice(0, 5).map((h, i) => `SOURCE ${i + 1}
TITLE: ${h.title}
URL: ${h.url}
SNIPPET: ${h.snippet}`).join("\\n\\n");
  const prompt = `You are the final verification layer for a Telegram music-software catalog.

Never guess. Only return facts supported by the original post and the supplied search evidence.
If sources conflict, omit the conflicting field. A generic category is not an acceptable product identity.
Prefer official developer/product sources. Keep product/developer names in English.
Translate explanatory content into natural Persian for Iranian music producers.

Original Telegram caption:
${rawCaption.slice(0, 7000)}

Original filename:
${fileName.slice(0, 300)}

Candidate extracted from source/image:
${JSON.stringify(candidate)}

Web evidence:
${evidenceText || "No search result."}

Return JSON only:
{
  "title": "exact product name or empty",
  "developer": "developer or empty",
  "version": "verified version or empty",
  "category": "specific category or empty",
  "formats": [],
  "platforms": [],
  "features": [],
  "description_fa": "short natural Persian description or empty",
  "installation_notes_fa": "only important installation or compatibility notes explicitly supported by the source/search evidence, otherwise empty",
  "translated_caption_fa": "clean Persian translation of relevant source information or empty",
  "confidence": "high|medium|low",
  "source_url": "best authoritative URL or empty",
  "source_title": "source page title or empty"
}`;

  let verified: any;
  try {
    verified = parseJson((await runtimeGenerateJson(
      prompt,
      "Strict evidence extraction. Return JSON only. Do not invent product facts. If a claim is not supported, omit it.",
    )).reply);
  } catch {
    verified = null;
  }

  const finalTitle = clean(verified?.title || title, 160);
  const finalDeveloper = clean(verified?.developer || developer, 120);
  const finalVersion = clean(verified?.version, 80);
  const latestOfficialVersion = clean(verified?.latest_official_version, 80);
  const authoritativeHit = ranked.find((h) => officialRank(h.url, finalDeveloper) >= 90) || ranked[0];
  const sourceUrl = clean(authoritativeHit?.url || verified?.source_url, 500);
  const confidence = /^(high|medium|low)$/.test(String(verified?.confidence)) ? verified.confidence : "low";
  const sourceHost = sourceUrl ? officialRank(sourceUrl, finalDeveloper) : 0;
  const hasWebIdentity = Boolean(finalTitle && ranked.some((h) => h.title.toLowerCase().includes(finalTitle.toLowerCase()) || h.snippet.toLowerCase().includes(finalTitle.toLowerCase())));
  const highEnough = isSpecificIdentity(finalTitle) && confidence !== "low" && (hasWebIdentity || sourceHost >= 45);
  const result: VerificationResult = {
    ok: highEnough,
    reviewRequired: !highEnough,
    title: finalTitle,
    developer: finalDeveloper,
    version: finalVersion,
    latestOfficialVersion,
    category: clean(verified?.category, 100),
    formats: safeArray(verified?.formats, 8),
    platforms: safeArray(verified?.platforms, 6),
    features: safeArray(verified?.features, 8),
    description: clean(verified?.description_fa, 700),
    installationNotes: clean(verified?.installation_notes_fa, 700),
    translatedCaption: clean(verified?.translated_caption_fa, 2500),
    detectedLanguage: languageOf(rawCaption),
    confidence: confidence as "high" | "medium" | "low",
    evidence: [
      { source: "caption", status: rawCaption ? "supporting" : "missing" },
      { source: "filename", status: fileName ? "supporting" : "missing" },
      { source: "web", status: hasWebIdentity ? "confirmed" : "supporting", detail: ranked[0]?.url || "" },
    ],
    verificationStatus: highEnough ? "verified" : "partial",
    verifiedSourceUrl: sourceUrl || ranked[0]?.url || "",
    verifiedSourceTitle: clean((authoritativeHit?.title || verified?.source_title || ranked[0]?.title), 180),
    searchStatus: hasWebIdentity ? "verified" : "no_match",
    reason: highEnough ? undefined : "verification_confidence_insufficient",
  };
  await storeAndCache(result);
  return result;
}

async function storeAndCache(result: VerificationResult) {
  const store = db();
  if (!store || !result.title) {
    const key = cacheKey(result.title, result.developer, result.version);
    memoryCache.set(key, { expiresAt: Date.now() + SEARCH_CACHE_TTL, value: result });
    return true;
  }
  const key = cacheKey(result.title, result.developer, result.version);
  await store.from("telegram_plugin_verification_cache").upsert({
    cache_key: key, product_name: result.title, developer: result.developer || null,
    version: result.version || null, verification: result, verified_at: new Date().toISOString(),
    source_url: result.verifiedSourceUrl || null,
  }, { onConflict: "cache_key" });
  memoryCache.set(key, { expiresAt: Date.now() + SEARCH_CACHE_TTL, value: result });
  return true;
}

export async function analyzeTelegramPluginPost(input: {
  photoFileId?: string;
  rawCaption?: string;
  fileName?: string;
  candidate?: Candidate;
}): Promise<VerificationResult> {
  const caption = clean(input.rawCaption, 7000);
  const fileName = clean(input.fileName, 300);
  let candidate = { ...deterministicCandidate(caption, fileName), ...(input.candidate || {}) };
  let visionUsed = false;
  if (!isSpecificIdentity(clean(candidate.title, 160)) && input.photoFileId) {
    try {
      candidate = { ...candidate, ...(await visionCandidate(input.photoFileId, caption, fileName)) };
      visionUsed = isSpecificIdentity(clean(candidate.title, 160));
    } catch {
      // A failed vision attempt is not permission to guess. The verifier below will require review.
    }
  }
  let result = await verifyCandidate(candidate, caption, fileName);
  let attempts = 0;
  while (result.reviewRequired && attempts < MAX_REANALYSIS && input.photoFileId) {
    attempts++;
    try {
      const vision = await visionCandidate(input.photoFileId, caption, fileName);
      if (isSpecificIdentity(clean(vision.title, 160)) && String(vision.title).toLowerCase() !== String(candidate.title || "").toLowerCase()) {
        candidate = { ...candidate, ...vision };
        result = await verifyCandidate(candidate, caption, fileName);
      } else {
        break;
      }
    } catch {
      break;
    }
  }
  if (input.photoFileId) {
    const imageEvidence: PluginEvidence = { source: "image", status: visionUsed ? "confirmed" : "supporting", detail: visionUsed ? "vision_identified_product" : "image_available_but_not_required_for_identity" };
    result.evidence = [imageEvidence, ...result.evidence.filter((e) => e.source !== "image")];
  }
  return result;
}

export function buildVerifiedCaption(result: VerificationResult) {
  if (!result.ok || !result.title) return "";
  const lines = [
    `🎛️ <b>${esc(result.title)}</b>`,
    result.description ? `✨ ${esc(result.description)}` : "",
    result.developer ? `🏷️ <b>Developer</b>\n${esc(result.developer)}` : "",
    result.version ? `📦 <b>Version</b>\n${esc(result.version)}` : "",
    result.category ? `🎚️ <b>Type</b>\n${esc(result.category)}` : "",
    result.formats.length ? `🔌 <b>Formats</b>\n${esc(result.formats.join(" · "))}` : "",
    result.platforms.length ? `💻 <b>Platform</b>\n${esc(result.platforms.join(" · "))}` : "",
    result.features.length ? `🔥 <b>Highlights</b>\n${result.features.slice(0, 5).map((x) => "• " + esc(x)).join("\n")}` : "",
    result.description ? `📝 <b>درباره محصول</b>\n${esc(result.description)}` : "",
    result.installationNotes ? `📌 <b>نکات سازگاری</b>\n${esc(result.installationNotes)}` : "",
    "━━━━━━━━━━━━━━━━━━",
    "🎧 <b>@ProAudios</b>",
  ].filter(Boolean);
  return lines.join("\n\n").slice(0, 1024);
}

function esc(v: string) {
  return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function applyVerificationToPost(postId: string, result: VerificationResult) {
  const store = db();
  if (!store) return { ok: false, error: "supabase_not_configured" };
  if (!result.ok) {
    await store.from("telegram_plugin_posts").update({
      review_required: true,
      verification_status: result.verificationStatus,
      verification_confidence: result.confidence,
      evidence: result.evidence,
      detected_language: result.detectedLanguage,
      verified_source_url: result.verifiedSourceUrl || null,
      verified_source_title: result.verifiedSourceTitle || null,
      search_status: result.searchStatus,
      latest_official_version: result.latestOfficialVersion || null,
      product_count: result.productCount || 1,
      included_products: result.includedProducts || [],
      file_identity: result.fileIdentity || {},
      ai_analysis: result,
      error_message: "review_required:" + (result.reason || "verification_failed"),
      updated_at: new Date().toISOString(),
    }).eq("id", postId);
    return { ok: false, reviewRequired: true };
  }
  const caption = buildVerifiedCaption(result);
  const row = await store.from("telegram_plugin_posts").select("channel_id,photo_message_id,document_message_id,raw_caption").eq("id", postId).maybeSingle();
  if (row.error || !row.data) return { ok: false, error: "post_not_found" };
  try {
    if (caption && row.data.channel_id && (row.data.photo_message_id || row.data.document_message_id)) {
      await publishPluginCaption(postId, caption);
    }
  } catch (error) {
    return { ok: false, error: clean(error instanceof Error ? error.message : String(error), 240) };
  }
  const update = await store.from("telegram_plugin_posts").update({
    title: result.title,
    developer: result.developer || null,
    version: result.version || null,
    latest_official_version: result.latestOfficialVersion || null,
    product_count: result.productCount || 1,
    included_products: result.includedProducts || [],
    file_identity: result.fileIdentity || {},
    category: result.category || "other",
    formats: result.formats,
    platforms: result.platforms,
    features: result.features,
    description: result.description,
    final_caption: caption,
    review_required: false,
    verification_status: result.verificationStatus,
    verification_confidence: result.confidence,
    evidence: result.evidence,
    detected_language: result.detectedLanguage,
    verified_source_url: result.verifiedSourceUrl || null,
    verified_source_title: result.verifiedSourceTitle || null,
    search_status: result.searchStatus,
    ai_analysis: result,
    error_message: null,
    updated_at: new Date().toISOString(),
  }).eq("id", postId);
  if (update.error) return { ok: false, error: update.error.message };
  return { ok: true, caption };
}

export async function createReviewRequiredPost(input: {
  channelId: string;
  photoMessageId?: number;
  documentMessageId?: number;
  photoFileId?: string;
  documentFileId: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  rawCaption?: string;
  result: VerificationResult;
}) {
  const store = db();
  if (!store) return { ok: false, error: "supabase_not_configured" };
  const result = input.result;
  const title = result.title || "نیازمند بررسی";
  const existing = await store.from("telegram_plugin_posts")
    .select("id,status")
    .eq("channel_id", input.channelId)
    .eq("document_message_id", input.documentMessageId || 0)
    .maybeSingle();
  if (!existing.error && existing.data?.status === "published") {
    return { ok: true, id: existing.data.id, existing: true };
  }
  const row = await store.from("telegram_plugin_posts").upsert({
    channel_id: input.channelId,
    photo_message_id: input.photoMessageId || null,
    document_message_id: input.documentMessageId || null,
    telegram_photo_file_id: input.photoFileId || null,
    telegram_file_id: input.documentFileId,
    file_name: input.fileName || null,
    mime_type: input.mimeType || null,
    file_size: input.fileSize || null,
    title,
    developer: result.developer || null,
    version: result.version || null,
    category: result.category || "other",
    formats: result.formats || [],
    platforms: result.platforms || [],
    description: result.description || "",
    features: result.features || [],
    tags: [],
    raw_caption: input.rawCaption || "",
    ai_analysis: result,
    evidence: result.evidence || [],
    verification_status: result.verificationStatus,
    verification_confidence: result.confidence,
    verified_source_url: result.verifiedSourceUrl || null,
    verified_source_title: result.verifiedSourceTitle || null,
    search_status: result.searchStatus,
    detected_language: result.detectedLanguage,
    review_required: true,
    processing_state: "NEEDS_REVIEW",
    status: "failed",
    error_message: "review_required:" + (result.reason || "verification_failed"),
    updated_at: new Date().toISOString(),
  }, { onConflict: "channel_id,document_message_id" }).select("id").maybeSingle();
  if (row.error) return { ok: false, error: row.error.message };
  return { ok: true, id: row.data?.id || null };
}

export async function regenerateStoredTranslation(postId: string) {
  const store = db();
  if (!store) return { ok: false, error: "supabase_not_configured" };
  const row = await store.from("telegram_plugin_posts").select("*").eq("id", postId).maybeSingle();
  if (row.error || !row.data) return { ok: false, error: "post_not_found" };
  const p = row.data;
  try {
    const reply = await runtimeGenerateJson(
      `Translate the relevant technical information from this Telegram caption into natural Persian for Iranian music producers.
Do not add any facts, product names, versions, formats, OS requirements or features that are not present in the source.
Keep product and developer names in English. Return JSON only: {"description_fa":"short accurate Persian description","translated_caption_fa":"clean Persian technical copy"}.

Original caption:
${String(p.raw_caption || "").slice(0, 7000)}

Already verified identity:
${JSON.stringify({ title: p.title, developer: p.developer, version: p.version, category: p.category, formats: p.formats, platforms: p.platforms, features: p.features })}`,
      "Translate only. Do not identify, classify, search, or invent.",
    );
    const parsed = parseJson(reply.reply);
    const description = clean(parsed?.description_fa, 700);
    const translated = clean(parsed?.translated_caption_fa, 2500);
    const result: VerificationResult = {
      ok: true,
      reviewRequired: Boolean(p.review_required),
      title: clean(p.title, 160),
      developer: clean(p.developer, 120),
      version: clean(p.version, 80),
      latestOfficialVersion: clean(p.latest_official_version, 80),
      category: clean(p.category, 100),
      formats: safeArray(p.formats, 8),
      platforms: safeArray(p.platforms, 6),
      features: safeArray(p.features, 8),
      description: description || clean(p.description, 700),
      installationNotes: "",
      translatedCaption: translated,
      detectedLanguage: clean(p.detected_language || languageOf(p.raw_caption), 40),
      confidence: (p.verification_confidence === "high" || p.verification_confidence === "medium" ? p.verification_confidence : "low") as "high" | "medium" | "low",
      evidence: Array.isArray(p.evidence) ? p.evidence : [],
      verificationStatus: p.verification_status || "partial",
      verifiedSourceUrl: clean(p.verified_source_url, 500),
      verifiedSourceTitle: clean(p.verified_source_title, 180),
      searchStatus: p.search_status || "unavailable",
      productCount: Number(p.product_count || 1),
      includedProducts: safeArray(p.included_products, 20),
      fileIdentity: p.file_identity || { fileName: String(p.file_name || ""), consistent: true, detail: "" },
    };
    const caption = buildVerifiedCaption(result);
    await store.from("telegram_plugin_posts").update({
      draft_caption: caption,
      updated_at: new Date().toISOString(),
    }).eq("id", postId);
    return { ok: true, caption, result };
  } catch (error) {
    return { ok: false, error: clean(error instanceof Error ? error.message : String(error), 240) };
  }
}

export async function verifyStoredPlugin(postId: string, force = false) {
  const store = db();
  if (!store) return { ok: false, error: "supabase_not_configured" };
  const row = await store.from("telegram_plugin_posts").select("*").eq("id", postId).maybeSingle();
  if (row.error || !row.data) return { ok: false, error: "post_not_found" };
  const p = row.data;
  const result = await analyzeTelegramPluginPost({
    photoFileId: String(p.telegram_photo_file_id || ""),
    rawCaption: String(p.raw_caption || ""),
    fileName: String(p.file_name || ""),
    candidate: {
      title: force ? "" : String(p.title || ""),
      developer: force ? "" : String(p.developer || ""),
      version: force ? "" : String(p.version || ""),
      category: force ? "" : String(p.category || ""),
      formats: force ? [] : p.formats,
      platforms: force ? [] : p.platforms,
      features: force ? [] : p.features,
    },
  });
  return { ...(await applyVerificationToPost(postId, result)), result };
}
