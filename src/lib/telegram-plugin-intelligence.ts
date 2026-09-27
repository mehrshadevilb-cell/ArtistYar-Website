import { createClient } from "@supabase/supabase-js";
import { runtimeGenerateJson } from "@/lib/ai-runtime";
import { resolvePluginBotToken } from "@/lib/telegram-plugin-bot";
import { publishPluginCaption } from "@/lib/telegram-plugin-caption";

const TG = "https://api.telegram.org";
const SEARCH_CACHE_TTL = 1000 * 60 * 60 * 12;
const MAX_SEARCH_QUERIES = 3;
const MAX_REANALYSIS = 2;

const memoryCache = new Map<string, { expiresAt: number; value: VerificationResult }>();

export const PRODUCT_CATEGORIES = [
  "Plugin",
  "Effect Plugin",
  "Synth",
  "Instrument",
  "Sampler",
  "DAW",
  "Sample Pack",
  "Preset Pack",
  "MIDI Pack",
  "Sound Library",
  "Educational",
  "Hardware",
  "Audio Tool",
  "Other",
  "Unknown",
] as const;

type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
type Confidence = "high" | "medium" | "low";

export type PluginEvidence = {
  source: "image" | "caption" | "filename" | "ocr" | "web" | "database";
  status: "confirmed" | "supporting" | "conflict" | "missing";
  detail?: string;
};

export type IdentityCandidate = {
  source: PluginEvidence["source"];
  title?: string;
  developer?: string;
  version?: string;
  category?: ProductCategory | "";
  confidence?: Confidence;
};

export type VerificationResult = {
  ok: boolean;
  reviewRequired: boolean;
  title: string;
  developer: string;
  version: string;
  latestOfficialVersion: string;
  productCount?: number;
  includedProducts?: string[];
  fileIdentity?: { fileName: string; consistent: boolean; detail: string };
  category: ProductCategory | string;
  formats: string[];
  platforms: string[];
  features: string[];
  description: string;
  installationNotes: string;
  translatedCaption: string;
  detectedLanguage: string;
  confidence: Confidence;
  evidence: PluginEvidence[];
  identityCandidates?: IdentityCandidate[];
  conflicts?: string[];
  developerSourceUrl?: string;
  developerConfidence?: Confidence;
  versionSource?: "telegram" | "image" | "official" | "unknown";
  verificationStatus: "verified" | "partial" | "unavailable" | "failed";
  verifiedSourceUrl: string;
  verifiedSourceTitle: string;
  searchStatus: "verified" | "no_match" | "unavailable";
  reason?: string;
};

type Candidate = Partial<Omit<VerificationResult, "ok" | "reviewRequired" | "evidence" | "confidence" | "verificationStatus" | "verifiedSourceUrl" | "verifiedSourceTitle" | "searchStatus">>;

type SearchHit = { title: string; url: string; snippet: string; pageText?: string };

function db() {
  const url = (process.env.SUPABASE_URL || "").trim();
  const key = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function clean(v: unknown, max = 600) {
  return String(v ?? "")
    .replace(/[\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function parseJson(text: string): any {
  const raw = String(text || "")
    .trim()
    .replace(/^\`\`\`(?:json)?\s*/i, "")
    .replace(/\s*\`\`\`$/i, "")
    .trim();
  try { return JSON.parse(raw); } catch { return null; }
}

function normalizeIdentity(value: unknown) {
  return clean(value, 160)
    .toLowerCase()
    .replace(/[®™©]/g, "")
    .replace(/[._+_-]+/g, " ")
    .replace(/\bv?\d+(?:[.\s]\d+){1,3}\b/gi, " ")
    .replace(/\b(?:win|windows|mac|macos|linux|x64|x86|arm|fixed|incl(?:uded)?|repack|r2r|moria|team|crack|keygen)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isGenericTitle(title: string) {
  return !title || /^(?:plugin|audio plugin|software|daw|audio software|vst|instrument|synth|پلاگین(?: جدید| بدون نام)?|نرم.?افزار)$/i.test(clean(title, 180));
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
  let name = clean(fileName, 220);
  if (!name) return "";
  name = name.replace(/\.(rar|zip|7z|tar|gz|tgz|bz2|xz|dmg|pkg|msi|exe|appimage|vst3?|component|aaxplugin|clap|dll|so|dylib)$/i, "");
  name = name.replace(/[._+]+/g, " ").replace(/\s+/g, " ").trim();
  name = name.replace(/\b(?:incl(?:uded)?|patched|keygen|crack|repack|unlocked|r2r|moria|team|repost|win|mac|linux|fixed|arm|x64)\b.*$/i, "").trim();
  name = name.replace(/\s+v?\d+(?:[.\s_]\d+){1,3}\s*$/i, "").trim();
  return name.slice(0, 120);
}

function captionTitle(caption: string) {
  const lines = String(caption || "").split(/\r?\n/).map((x) => clean(x, 220)).filter(Boolean);
  for (const line of lines.slice(0, 8)) {
    const candidate = line
      .replace(/^(?:🔥|🎛️|🎹|📦|new|новинка|скачать|download)\s*/i, "")
      .replace(/\s+v?\d+(?:[.\s]\d+){1,3}\s*$/i, "")
      .replace(/(?:формат|format|разрядность|bit|системные|system|vst|au|aax).*/i, "")
      .trim();
    if (isSpecificIdentity(candidate)) return candidate;
  }
  return "";
}

function normalizeCategory(value: unknown): ProductCategory | "" {
  const t = clean(value, 100).toLowerCase();
  if (!t) return "";
  if (PRODUCT_CATEGORIES.some((x) => x.toLowerCase() === t)) return PRODUCT_CATEGORIES.find((x) => x.toLowerCase() === t) || "";
  if (/daw|digital audio workstation/.test(t)) return "DAW";
  if (/effect|eq|equalizer|compressor|reverb|delay|limiter|saturation|distortion|de.?esser|chorus|gate|amp simulator/.test(t)) return "Effect Plugin";
  if (/synth|synthesizer/.test(t)) return "Synth";
  if (/sampler/.test(t)) return "Sampler";
  if (/virtual instrument|software instrument|instrument/.test(t)) return "Instrument";
  if (/sample library/.test(t)) return "Sound Library";
  if (/sample pack|sample collection/.test(t)) return "Sample Pack";
  if (/preset|patch bank|soundbank|patch library/.test(t)) return "Preset Pack";
  if (/midi/.test(t)) return "MIDI Pack";
  if (/education|course|tutorial|training/.test(t)) return "Educational";
  if (/hardware|synthesizer hardware/.test(t)) return "Hardware";
  if (/utility|analyzer|meter|audio tool|audio utility/.test(t)) return "Audio Tool";
  if (/bundle|collection|suite|plugin/.test(t)) return "Plugin";
  if (/unknown|other/.test(t)) return t.includes("unknown") ? "Unknown" : "Other";
  return "";
}

function deterministicCandidate(caption: string, fileName: string): Candidate {
  const title = captionTitle(caption) || filenameTitle(fileName);
  const version = caption.match(/\b(?:v|version\s*)?(\d+(?:\.\d+){1,3})\b/i)?.[1] || "";
  return {
    title,
    version,
    category: normalizeCategory(
      /ableton live|fl studio|cubase|logic pro|studio one|bitwig|reaper|pro tools|reason/i.test(title) ? "DAW" :
      /serum|massive|diva|pigments|sylenth|vital|synth/i.test(title) ? "Synth" :
      /sample pack/i.test(caption + " " + fileName) ? "Sample Pack" :
      /preset|patch bank|soundbank/i.test(caption + " " + fileName) ? "Preset Pack" :
      /midi pack/i.test(caption + " " + fileName) ? "MIDI Pack" :
      /sample library|kontakt library|sound library/i.test(caption + " " + fileName) ? "Sound Library" :
      /eq|equalizer|compressor|reverb|delay|limiter|saturation|distortion|de-esser|chorus|gate/i.test(caption + " " + title) ? "Effect Plugin" : ""
    ),
    detectedLanguage: languageOf(caption),
  };
}

function candidateFromSource(source: IdentityCandidate["source"], value: Candidate): IdentityCandidate {
  return {
    source,
    title: clean(value.title, 160) || undefined,
    developer: clean(value.developer, 120) || undefined,
    version: clean(value.version, 80) || undefined,
    category: normalizeCategory(value.category),
  };
}

async function telegramBytes(fileId: string) {
  const token = resolvePluginBotToken();
  if (!token || !fileId) throw new Error("telegram_image_unavailable");
  const infoRes = await fetch(TG + "/bot" + token + "/getFile", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ file_id: fileId }),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  const info = await infoRes.json().catch(() => null);
  const path = info?.result?.file_path;
  if (!infoRes.ok || !info?.ok || !path) throw new Error("telegram_image_path_unavailable");
  const imageRes = await fetch("https://api.telegram.org/file/bot" + token + "/" + path, {
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!imageRes.ok) throw new Error("telegram_image_download_failed");
  return { bytes: new Uint8Array(await imageRes.arrayBuffer()), contentType: imageRes.headers.get("content-type") || "image/jpeg" };
}

async function visionCandidate(photoFileId: string, caption: string, fileName: string): Promise<Candidate> {
  const key = (process.env.OPENAI_API_KEY || "").trim();
  if (!key || !photoFileId) return {};
  const image = await telegramBytes(photoFileId);
  const base64 = Buffer.from(image.bytes).toString("base64");
  const model = (process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini").trim();
  const prompt = [
    "Identify the exact audio product represented by this Telegram artwork.",
    "Image, filename and caption are evidence. Never guess or complete a familiar product name from memory.",
    "Extract visible product/developer/version text and distinctive product clues.",
    "If identity is uncertain, leave title/developer/version empty rather than inventing them.",
    "Return JSON only: title, developer, version, category, formats, platforms, features, confidence.",
    "Category must be one of: " + PRODUCT_CATEGORIES.join(", "),
    "Original Telegram caption:", caption.slice(0, 5000),
    "Original filename:", fileName.slice(0, 300),
  ].join("\n");
  const res = await fetch((process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "") + "/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + key },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 1400,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: "data:" + image.contentType + ";base64," + base64 } },
        ],
      }],
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(25000),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(clean(data?.error?.message || "vision_failed", 240));
  const parsed = parseJson(data?.choices?.[0]?.message?.content || "");
  if (!parsed || typeof parsed !== "object") return {};
  return {
    title: clean(parsed.title, 160),
    developer: clean(parsed.developer, 120),
    version: clean(parsed.version, 80),
    category: normalizeCategory(parsed.category),
    formats: Array.isArray(parsed.formats) ? parsed.formats.map((x: unknown) => clean(x, 40)).filter(Boolean).slice(0, 8) : [],
    platforms: Array.isArray(parsed.platforms) ? parsed.platforms.map((x: unknown) => clean(x, 40)).filter(Boolean).slice(0, 6) : [],
    features: Array.isArray(parsed.features) ? parsed.features.map((x: unknown) => clean(x, 180)).filter(Boolean).slice(0, 8) : [],
  };
}

async function webSearch(query: string): Promise<SearchHit[]> {
  const q = encodeURIComponent(query.slice(0, 220));
  const res = await fetch("https://www.bing.com/search?q=" + q + "&setlang=en-US", {
    headers: { "user-agent": "ArtistYar-Telegram-Plugin-Verifier/2.0" },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error("web_search_http_" + res.status);
  const html = await res.text();
  const hits: SearchHit[] = [];
  const strip = (v: string) => v.replace(/<[^>]+>/g, " ").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  const re = /<li class="b_algo"[\s\S]*?<h2><a href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/h2>[\s\S]*?<p>([\s\S]*?)<\/p>/gi;
  for (const match of html.matchAll(re)) {
    const url = match[1];
    if (!/^https?:\/\//i.test(url)) continue;
    hits.push({ title: strip(match[2]).slice(0, 180), url, snippet: strip(match[3]).slice(0, 500) });
    if (hits.length >= 8) break;
  }
  return hits;
}

function officialRank(url: string, developer: string) {
  const host = (() => { try { return new URL(url).hostname.toLowerCase(); } catch { return ""; } })();
  const d = developer.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!host) return 0;
  if (d && host.replace(/[^a-z0-9]/g, "").includes(d)) return 100;
  if (/fabfilter|spectrasonics|izotope|native-instruments|arturia|waves|ableton|image-line|steinberg|avid|bitwig|presonus|xferrecords|u-he|valhalladsp|dawesome|reveal-sound|airmusictech|pulsarmodular|temecula-dsp|exciteaudio|sonible|masteringthemix|overloud/.test(host)) return 95;
  if (/plugin-alliance|musicradar|gearspace|sweetwater|pluginboutique/.test(host)) return 45;
  return 20;
}

function cacheKey(title: string, developer: string, version: string) {
  return [title, developer, version].map((x) => normalizeIdentity(x)).join("|");
}

async function fetchSourcePage(hit: SearchHit): Promise<SearchHit> {
  try {
    const response = await fetch(hit.url, {
      headers: { "user-agent": "ArtistYar-Telegram-Plugin-Verifier/2.0" },
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return hit;
    const html = await response.text();
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const text = html
      .replace(/<script[\s\S]*?<\\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 6000);
    return {
      ...hit,
      title: clean(titleMatch?.[1] || hit.title, 180),
      pageText: text,
    };
  } catch {
    return hit;
  }
}

async function cachedSearch(title: string, developer: string, version: string, force = false) {
  if (force) return null;
  const key = cacheKey(title, developer, version);
  const memory = memoryCache.get(key);
  if (memory && memory.expiresAt > Date.now()) return memory.value;
  const store = db();
  if (!store) return null;
  const hit = await store.from("telegram_plugin_verification_cache").select("verification,verified_at").eq("cache_key", key).maybeSingle();
  if (!hit.error && hit.data?.verification && Date.parse(String(hit.data.verified_at || "")) > Date.now() - SEARCH_CACHE_TTL) {
    const value = hit.data.verification as VerificationResult;
    memoryCache.set(key, { expiresAt: Date.now() + SEARCH_CACHE_TTL, value });
    return value;
  }
  return null;
}

function safeArray(v: unknown, max = 8) {
  return Array.isArray(v) ? v.map((x) => clean(x, 180)).filter(Boolean).slice(0, max) : [];
}

function fieldConflicts(candidates: IdentityCandidate[]) {
  const conflicts: string[] = [];
  const fields = [
    ["title", "identity_conflict"],
    ["developer", "developer_conflict"],
    ["version", "version_conflict"],
    ["category", "category_conflict"],
  ] as const;
  for (const [field, code] of fields) {
    const values = candidates.map((c) => normalizeIdentity((c as any)[field])).filter(Boolean);
    if (new Set(values).size > 1) conflicts.push(code);
  }
  return conflicts;
}

function searchMatchesCandidate(hit: SearchHit, candidate: IdentityCandidate) {
  const hay = normalizeIdentity(hit.title + " " + hit.snippet + " " + (hit.pageText || ""));
  const title = normalizeIdentity(candidate.title);
  return Boolean(title && (hay.includes(title) || title.split(" ").filter(Boolean).every((token) => hay.includes(token))));
}

function validVersion(version: string) {
  return !version || /^v?\d+(?:\.\d+){0,4}(?:[-+._][0-9A-Za-z]+)?$/i.test(version);
}

function cyrillicIsOnlyProperName(text: string) {
  if (!/[А-ЯЁа-яё]/.test(text)) return true;
  return /^(?:[A-ZА-ЯЁ][A-Za-zА-ЯЁа-яё0-9 .&'’+_-]{1,80})$/.test(text.trim());
}

function qualityCaptionText(value: unknown) {
  return String(value ?? "")
    .replace(/Generated by AI|AI generated|Translated by AI|translation status|generation status|fallback status|scraping status|internal confidence|prompt-related|processing debug|According to source|provider:?|model:?|confidence:?|fallback:?|منبع(?: اصلی)?[:：]?|بر اساس منبع|طبق سایت رسمی|ترجمه شده توسط هوش مصنوعی|تولید شده توسط هوش مصنوعی|اطلاعات از منبع اصلی در دسترس نیست/gi, "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/می ?شود/g, "می‌شود")
    .replace(/می ?کند/g, "می‌کند")
    .replace(/می ?دهد/g, "می‌دهد")
    .replace(/به صورت/g, "به‌صورت")
    .replace(/به کارگیری/g, "به‌کارگیری")
    .replace(/هم زمان/g, "هم‌زمان")
    .replace(/پیش فرض/g, "پیش‌فرض")
    .trim();
}

function captionHasRussian(text: string) {
  return /[А-ЯЁа-яё]/.test(text);
}

function validateCaption(result: VerificationResult, caption: string) {
  const reasons: string[] = [];
  const value = String(caption || "").trim();
  if (!value) reasons.push("caption_empty");
  if (!isSpecificIdentity(result.title)) reasons.push("caption_identity_missing");
  if (!result.description && !result.translatedCaption) reasons.push("description_missing");
  if (captionHasRussian(value)) reasons.push("russian_text_remaining");
  if (/(?:Developer|Version|Type|Formats|Platform|Highlights)\s*$/im.test(value)) reasons.push("empty_section");
  if (result.category && !PRODUCT_CATEGORIES.includes(result.category as ProductCategory)) reasons.push("invalid_category");
  if (result.version && !validVersion(result.version)) reasons.push("invalid_version");
  if (result.conflicts?.length) reasons.push("unresolved_conflict");
  return { ok: reasons.length === 0, reasons };
}

function buildIdentityEvidence(candidates: IdentityCandidate[], hits: SearchHit[], title: string, developer: string) {
  return candidates.map((candidate) => {
    const matches = hits.filter((hit) => searchMatchesCandidate(hit, candidate)).slice(0, 3);
    return {
      source: candidate.source,
      title: candidate.title || "",
      developer: candidate.developer || "",
      version: candidate.version || "",
      category: candidate.category || "",
      web_matches: matches.map((m) => ({ title: m.title, url: m.url })),
    };
  });
}

async function verifyCandidate(
  candidate: Candidate,
  rawCaption: string,
  fileName: string,
  sourceCandidates: IdentityCandidate[],
  force = false,
): Promise<VerificationResult> {
  const title = clean(candidate.title, 160);
  if (!isSpecificIdentity(title)) {
    return {
      ok: false, reviewRequired: true, title: "", developer: "", version: "", latestOfficialVersion: "",
      category: "Unknown", formats: [], platforms: [], features: [], description: "", installationNotes: "",
      translatedCaption: "", detectedLanguage: languageOf(rawCaption), confidence: "low",
      evidence: [
        { source: "caption", status: rawCaption ? "supporting" : "missing" },
        { source: "filename", status: fileName ? "supporting" : "missing" },
      ],
      identityCandidates: sourceCandidates, conflicts: ["identity_missing"],
      verificationStatus: "failed", verifiedSourceUrl: "", verifiedSourceTitle: "", searchStatus: "no_match",
      reason: "exact_product_identity_missing",
    };
  }

  const developer = clean(candidate.developer, 120);
  const version = clean(candidate.version, 80);
  const conflicts = fieldConflicts(sourceCandidates);
  const cached = await cachedSearch(title, developer, version, force);
  if (cached && !conflicts.includes("identity_conflict")) {
    return {
      ...cached,
      identityCandidates: sourceCandidates,
      conflicts,
      reviewRequired: Boolean(cached.reviewRequired || conflicts.length),
      ok: Boolean(cached.ok && !conflicts.length),
    };
  }

  let hits: SearchHit[] = [];
  let searchAvailable = true;
  try {
    const titles = [...new Set(sourceCandidates.map((c) => clean(c.title, 120)).filter(isSpecificIdentity))];
    const queries = [
      ...titles.map((x) => x + " official product"),
      [title, developer, "official"].filter(Boolean).join(" "),
      [title, version].filter(Boolean).join(" "),
    ].filter(Boolean).slice(0, MAX_SEARCH_QUERIES);
    const groups = await Promise.all(queries.map((query) => webSearch(query)));
    const seen = new Set<string>();
    for (const group of groups) for (const hit of group) {
      if (!seen.has(hit.url)) { seen.add(hit.url); hits.push(hit); }
    }
  } catch {
    searchAvailable = false;
  }

  const base: VerificationResult = {
    ok: false,
    reviewRequired: true,
    title,
    developer,
    version,
    latestOfficialVersion: "",
    category: normalizeCategory(candidate.category) || "Unknown",
    formats: safeArray(candidate.formats, 8),
    platforms: safeArray(candidate.platforms, 6),
    features: safeArray(candidate.features, 8),
    description: qualityCaptionText(candidate.description),
    installationNotes: qualityCaptionText(candidate.installationNotes),
    translatedCaption: qualityCaptionText(candidate.translatedCaption),
    detectedLanguage: languageOf(rawCaption),
    confidence: "low",
    evidence: [
      { source: "caption", status: rawCaption ? "supporting" : "missing" },
      { source: "filename", status: fileName ? "supporting" : "missing" },
      { source: "image", status: sourceCandidates.some((x) => x.source === "image" && x.title) ? "confirmed" : "missing" },
      { source: "web", status: searchAvailable ? "supporting" : "missing", detail: searchAvailable ? "" : "search_unavailable" },
    ],
    identityCandidates: sourceCandidates,
    conflicts,
    verificationStatus: searchAvailable ? "partial" : "unavailable",
    verifiedSourceUrl: "",
    verifiedSourceTitle: "",
    searchStatus: searchAvailable ? "no_match" : "unavailable",
  };

  if (!searchAvailable) {
    base.reason = "verification_unavailable";
    return base;
  }

  const ranked = hits.slice().sort((a, b) => officialRank(b.url, developer) - officialRank(a.url, developer));
  const authoritativeCandidates = ranked.filter((hit) => officialRank(hit.url, developer) >= 90).slice(0, 2);
  const enriched = await Promise.all(authoritativeCandidates.map(fetchSourcePage));
  for (const page of enriched) {
    const index = ranked.findIndex((hit) => hit.url === page.url);
    if (index >= 0) ranked[index] = page;
  }
  const evidenceText = buildIdentityEvidence(sourceCandidates, ranked, title, developer)
    .map((x, i) => "CANDIDATE " + (i + 1) + "\n" + JSON.stringify(x))
    .join("\n\n") +
    "\n\nWEB RESULTS\n" +
    ranked.slice(0, 8).map((h, i) => "SOURCE " + (i + 1) + "\nTITLE: " + h.title + "\nURL: " + h.url + "\nSNIPPET: " + h.snippet).join("\n\n");

  const prompt = `You are the final evidence reconciliation layer for an Iranian music-software catalog.

Rules:
- Do not guess. The candidate is not a fact.
- The product identity must be supported by at least one source candidate AND a web result that clearly matches it, unless an official database source is explicitly supplied.
- If image, filename and caption disagree, do not choose by familiarity. Use web evidence to resolve the conflict or return an empty title.
- Developer is valid only when supported by an official product/developer source or explicit source text; never infer it from model memory.
- Version is the version represented by the Telegram post/image. Never substitute the latest online version. Latest official version is a separate field.
- Category must be exactly one of: ${PRODUCT_CATEGORIES.join(", ")}.
- Multiple products must be represented separately. If more than one distinct product is present and cannot be safely separated, return product_count > 1 and included_products and keep confidence low/review required.
- Features, formats, platforms and description must be directly supported by the supplied evidence. Do not add marketing claims.
- For Russian source text, translate into natural Persian while preserving product/developer names and technical terms such as VST3, AU, AAX, Windows and macOS.
- Return evidence references as source numbers so every important field can be audited.

ORIGINAL TELEGRAM CAPTION:
${rawCaption.slice(0, 7000)}

ORIGINAL FILENAME:
${fileName.slice(0, 300)}

SOURCE CANDIDATES:
${JSON.stringify(sourceCandidates)}

SEARCH EVIDENCE:
${evidenceText || "No evidence."}

Return JSON only:
{
  "title": "exact verified product name or empty",
  "developer": "verified developer or empty",
  "version": "version represented by this post or empty",
  "latest_official_version": "latest official version only if explicitly supported, otherwise empty",
  "category": "one exact taxonomy value or Unknown",
  "formats": [],
  "platforms": [],
  "features": [],
  "description_fa": "concise factual Persian description or empty",
  "installation_notes_fa": "only explicitly supported compatibility/installation notes or empty",
  "translated_caption_fa": "natural Persian rendering of relevant source text or empty",
  "product_count": 1,
  "included_products": [],
  "confidence": "high|medium|low",
  "source_url": "authoritative source URL or empty",
  "source_title": "source page title or empty",
  "developer_source_url": "source supporting developer or empty",
  "version_source": "telegram|image|official|unknown",
  "evidence_refs": {
    "title": ["candidate:caption|candidate:filename|candidate:image|source:1"],
    "developer": ["source:1"],
    "version": ["candidate:caption|candidate:image|source:1"],
    "latest_official_version": ["source:1"],
    "category": ["source:1"],
    "description": ["source:1"],
    "formats": ["source:1"],
    "platforms": ["source:1"],
    "features": ["source:1"]
  }
}`;

  let verified: any = null;
  try {
    const response = await runtimeGenerateJson(
      prompt,
      "Evidence-only reconciliation. Return JSON only. Unsupported fields must be empty. Never invent identity, developer, version, category, formats, platforms or features.",
    );
    verified = parseJson(response.reply);
  } catch {
    verified = null;
  }

  if (!verified) {
    base.reason = "verification_ai_failed";
    return base;
  }

  const finalTitle = clean(verified.title, 160);
  const finalDeveloper = clean(verified.developer, 120);
  const finalVersion = clean(verified.version, 80);
  const finalCategory = normalizeCategory(verified.category) || "Unknown";
  const productCount = Math.max(1, Number(verified.product_count || 1) || 1);
  const includedProducts = safeArray(verified.included_products, 20);
  const titleRefs = Array.isArray(verified?.evidence_refs?.title) ? verified.evidence_refs.title.map(String) : [];
  const developerRefs = Array.isArray(verified?.evidence_refs?.developer) ? verified.evidence_refs.developer.map(String) : [];
  const versionRefs = Array.isArray(verified?.evidence_refs?.version) ? verified.evidence_refs.version.map(String) : [];
  const latestVersionRefs = Array.isArray(verified?.evidence_refs?.latest_official_version) ? verified.evidence_refs.latest_official_version.map(String) : [];
  const candidateTitleMatch = sourceCandidates.some((c) => normalizeIdentity(c.title) === normalizeIdentity(finalTitle));
  const webTitleMatch = ranked.some((h) => searchMatchesCandidate(h, { source: "web", title: finalTitle }));
  const titleSupported = isSpecificIdentity(finalTitle) && titleRefs.length > 0 && candidateTitleMatch && webTitleMatch;
  const officialHit = ranked.find((h) => officialRank(h.url, finalDeveloper) >= 90 && searchMatchesCandidate(h, { source: "web", title: finalTitle }))
    || ranked.find((h) => searchMatchesCandidate(h, { source: "web", title: finalTitle }))
    || ranked[0];
  const developerSupported = !finalDeveloper || (
    developerRefs.length > 0 &&
    (officialRank(officialHit?.url || "", finalDeveloper) >= 90 ||
      sourceCandidates.some((c) => normalizeIdentity(c.developer) === normalizeIdentity(finalDeveloper)))
  );
  const versionSupported = !finalVersion || (versionRefs.length > 0 && validVersion(finalVersion) && (
    sourceCandidates.some((c) => normalizeIdentity(c.version) === normalizeIdentity(finalVersion)) ||
    /\b(?:v|version\s*)?\d+(?:\.\d+){1,4}\b/i.test(rawCaption + " " + fileName)
  ));
  const conflictsResolved = conflicts.length === 0 || (webTitleMatch && titleSupported);
  const confidence = /^(high|medium|low)$/.test(String(verified.confidence)) ? verified.confidence as Confidence : "low";
  const authoritative = officialHit;
  const sourceUrl = clean(verified.source_url || authoritative?.url, 500);
  const description = qualityCaptionText(verified.description_fa);
  const translatedCaption = qualityCaptionText(verified.translated_caption_fa);
  const features = safeArray(verified.features, 8);
  const formats = safeArray(verified.formats, 8);
  const platforms = safeArray(verified.platforms, 6);
  const candidateConflict = fieldConflicts(sourceCandidates);
  const multipleProductsUnclear = productCount > 1 && includedProducts.length < 2;
  const ok = Boolean(
    titleSupported &&
    webTitleMatch &&
    developerSupported &&
    versionSupported &&
    conflictsResolved &&
    finalCategory !== "Unknown" &&
    confidence !== "low" &&
    description &&
    !multipleProductsUnclear
  );

  const result: VerificationResult = {
    ok,
    reviewRequired: !ok,
    title: titleSupported ? finalTitle : "",
    developer: developerSupported ? finalDeveloper : "",
    version: versionSupported ? finalVersion : "",
    latestOfficialVersion: latestVersionRefs.length && validVersion(clean(verified.latest_official_version, 80))
      ? clean(verified.latest_official_version, 80)
      : "",
    productCount,
    includedProducts,
    fileIdentity: { fileName, consistent: !candidateConflict.includes("title"), detail: candidateConflict.join(",") || "source_agreement" },
    category: finalCategory,
    formats,
    platforms,
    features,
    description,
    installationNotes: qualityCaptionText(verified.installation_notes_fa),
    translatedCaption,
    detectedLanguage: languageOf(rawCaption),
    confidence: ok ? confidence : "low",
    evidence: [
      { source: "caption", status: rawCaption ? "supporting" : "missing" },
      { source: "filename", status: fileName ? "supporting" : "missing" },
      { source: "image", status: sourceCandidates.some((x) => x.source === "image" && x.title) ? "confirmed" : "missing" },
      { source: "web", status: webTitleMatch ? "confirmed" : "supporting", detail: sourceUrl },
    ],
    identityCandidates: sourceCandidates,
    conflicts: candidateConflict,
    developerSourceUrl: clean(verified.developer_source_url || sourceUrl, 500),
    developerConfidence: developerSupported && finalDeveloper ? confidence : "low",
    versionSource: /image/.test(String(verified.version_source)) ? "image" : /official/.test(String(verified.version_source)) ? "official" : finalVersion ? "telegram" : "unknown",
    verificationStatus: ok ? "verified" : "partial",
    verifiedSourceUrl: sourceUrl,
    verifiedSourceTitle: clean(verified.source_title || authoritative?.title, 180),
    searchStatus: webTitleMatch ? "verified" : "no_match",
    reason: ok ? undefined : [
      !titleSupported ? "identity_not_supported" : "",
      !developerSupported ? "developer_not_verified" : "",
      !versionSupported ? "version_not_supported" : "",
      candidateConflict.length ? "source_conflict" : "",
      finalCategory === "Unknown" ? "category_unknown" : "",
      !description ? "description_missing" : "",
      multipleProductsUnclear ? "multiple_products_unresolved" : "",
      confidence === "low" ? "confidence_low" : "",
    ].filter(Boolean).join(",") || "verification_failed",
  };
  await storeAndCache(result);
  return result;
}

async function storeAndCache(result: VerificationResult) {
  const store = db();
  const key = cacheKey(result.title, result.developer, result.version);
  memoryCache.set(key, { expiresAt: Date.now() + SEARCH_CACHE_TTL, value: result });
  if (!store || !result.title) return true;
  await store.from("telegram_plugin_verification_cache").upsert({
    cache_key: key,
    product_name: result.title,
    developer: result.developer || null,
    version: result.version || null,
    verification: result,
    verified_at: new Date().toISOString(),
    source_url: result.verifiedSourceUrl || null,
  }, { onConflict: "cache_key" });
  return true;
}

export async function analyzeTelegramPluginPost(input: {
  photoFileId?: string;
  rawCaption?: string;
  fileName?: string;
  candidate?: Candidate;
  force?: boolean;
}): Promise<VerificationResult> {
  const caption = clean(input.rawCaption, 7000);
  const fileName = clean(input.fileName, 300);
  const captionCandidate = deterministicCandidate(caption, "");
  const filenameCandidate: Candidate = { title: filenameTitle(fileName) };
  const sourceCandidates: IdentityCandidate[] = [
    candidateFromSource("caption", captionCandidate),
    candidateFromSource("filename", filenameCandidate),
  ].filter((x) => x.title || x.developer || x.version || x.category);

  let vision: Candidate = {};
  if (input.photoFileId) {
    try {
      vision = await visionCandidate(input.photoFileId, caption, fileName);
      sourceCandidates.push(candidateFromSource("image", vision));
    } catch (error) {
      sourceCandidates.push({ source: "image", confidence: "low" });
    }
  }

  const supplied = input.candidate || {};
  if (supplied.title || supplied.developer || supplied.version || supplied.category) {
    sourceCandidates.push(candidateFromSource("database", supplied));
  }

  const titleValues = sourceCandidates
    .map((c) => c.title)
    .filter((value): value is string => Boolean(value) && isSpecificIdentity(value));
  const candidateTitle = clean(
    supplied.title ||
    (titleValues.length === 1 ? titleValues[0] : (vision.title || captionCandidate.title || filenameCandidate.title)),
    160,
  );
  const merged: Candidate = {
    ...captionCandidate,
    ...filenameCandidate,
    ...vision,
    ...supplied,
    title: candidateTitle,
    category: normalizeCategory(supplied.category || vision.category || captionCandidate.category || ""),
  };

  return verifyCandidate(merged, caption, fileName, sourceCandidates, Boolean(input.force));
}

export function buildVerifiedCaption(result: VerificationResult) {
  if (!result.ok || !result.title) return "";
  const intro = qualityCaptionText(result.translatedCaption || result.description);
  const sections = [
    `🎛️ <b>${esc(result.title)}</b>`,
    result.developer ? `🏢 <b>سازنده:</b> ${esc(result.developer)}` : "",
    result.category && result.category !== "Unknown" ? `🏷️ <b>نوع:</b> ${esc(result.category)}` : "",
    result.productCount && result.productCount > 1 && result.includedProducts?.length
      ? `📦 <b>محصولات:</b>\n• ${result.includedProducts.slice(0, 12).map(esc).join("\n• ")}`
      : "",
    intro ? `\n📌 <b>معرفی</b>\n${esc(intro)}` : "",
    result.features.length ? `\n✨ <b>ویژگی‌ها</b>\n${result.features.slice(0, 6).map((x) => "• " + esc(x)).join("\n")}` : "",
    result.platforms.length ? `\n💻 <b>سازگاری</b>\n• ${result.platforms.map(esc).join("\n• ")}` : "",
    result.formats.length ? `\n🔧 <b>فرمت‌ها</b>\n• ${result.formats.map(esc).join("\n• ")}` : "",
    result.version ? `\n📦 <b>نسخه:</b> ${esc(result.version)}` : "",
    result.verifiedSourceUrl ? `\n🔗 <b>منبع رسمی:</b> ${esc(result.verifiedSourceUrl)}` : "",
    "━━━━━━━━━━━━━━━━━━",
    "🎧 <b>@ProAudios</b>",
  ].filter(Boolean);
  const caption = sections.join("\n\n").slice(0, 1024);
  const quality = validateCaption(result, caption);
  return quality.ok ? caption : "";
}

function esc(v: string) {
  return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function applyVerificationToPost(postId: string, result: VerificationResult) {
  const store = db();
  if (!store) return { ok: false, error: "supabase_not_configured" };

  const baseUpdate = {
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
    processing_state: result.ok ? "GENERATING" : "NEEDS_REVIEW",
    error_message: result.ok ? null : "review_required:" + (result.reason || "verification_failed"),
    updated_at: new Date().toISOString(),
  };

  if (!result.ok) {
    await store.from("telegram_plugin_posts").update(baseUpdate).eq("id", postId);
    return { ok: false, reviewRequired: true };
  }

  const caption = buildVerifiedCaption(result);
  const quality = validateCaption(result, caption);
  if (!caption || !quality.ok) {
    await store.from("telegram_plugin_posts").update({
      ...baseUpdate,
      processing_state: "NEEDS_REVIEW",
      error_message: "caption_quality_failed:" + quality.reasons.join(","),
    }).eq("id", postId);
    return { ok: false, reviewRequired: true, error: "caption_quality_failed" };
  }

  const update = await store.from("telegram_plugin_posts").update({
    ...baseUpdate,
    title: result.title,
    developer: result.developer || null,
    version: result.version || null,
    category: result.category,
    formats: result.formats,
    platforms: result.platforms,
    features: result.features,
    description: result.description,
    draft_caption: caption,
    final_caption: "",
    review_required: false,
    processing_state: "READY",
    error_message: null,
  }).eq("id", postId);
  if (update.error) return { ok: false, error: update.error.message };

  const row = await store.from("telegram_plugin_posts")
    .select("channel_id,photo_message_id,document_message_id")
    .eq("id", postId)
    .maybeSingle();
  if (row.error || !row.data) return { ok: false, error: "post_not_found" };

  try {
    if (row.data.channel_id && (row.data.photo_message_id || row.data.document_message_id)) {
      await publishPluginCaption(postId, caption);
    }
  } catch (error) {
    await store.from("telegram_plugin_posts").update({
      review_required: true,
      processing_state: "READY",
      error_message: "caption_publish_failed:" + clean(error instanceof Error ? error.message : String(error), 220),
      updated_at: new Date().toISOString(),
    }).eq("id", postId);
    return { ok: false, error: "caption_publish_failed" };
  }

  const published = await store.from("telegram_plugin_posts").update({
    final_caption: caption,
    draft_caption: "",
    review_required: false,
    processing_state: "PUBLISHED",
    status: "published",
    updated_at: new Date().toISOString(),
  }).eq("id", postId);
  if (published.error) return { ok: false, error: published.error.message };
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
  if (!existing.error && existing.data?.status === "published") return { ok: true, id: existing.data.id, existing: true };

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
    category: result.category || "Unknown",
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
      `Translate only the source text into natural Persian for Iranian music producers.
Do not identify the product, change identity, change developer, change category, change version, search the web, or invent any fact.
Preserve verified product/developer names and technical terms. Return JSON only:
{"description_fa":"accurate Persian description","translated_caption_fa":"natural Persian technical copy"}

Original Telegram caption:
${String(p.raw_caption || "").slice(0, 7000)}

Verified facts (read-only; do not alter):
${JSON.stringify({ title: p.title, developer: p.developer, version: p.version, category: p.category, formats: p.formats, platforms: p.platforms, features: p.features })}`,
      "Translation only. Identity is immutable in this operation. Do not search or classify.",
    );
    const parsed = parseJson(reply.reply);
    const description = qualityCaptionText(parsed?.description_fa) || clean(p.description, 700);
    const translated = qualityCaptionText(parsed?.translated_caption_fa);
    const result: VerificationResult = {
      ok: Boolean(p.verification_status === "verified" && isSpecificIdentity(p.title)),
      reviewRequired: Boolean(p.review_required),
      title: clean(p.title, 160),
      developer: clean(p.developer, 120),
      version: clean(p.version, 80),
      latestOfficialVersion: clean(p.latest_official_version, 80),
      category: normalizeCategory(p.category) || "Unknown",
      formats: safeArray(p.formats, 8),
      platforms: safeArray(p.platforms, 6),
      features: safeArray(p.features, 8),
      description,
      installationNotes: "",
      translatedCaption: translated,
      detectedLanguage: clean(p.detected_language || languageOf(p.raw_caption), 40),
      confidence: (p.verification_confidence === "high" || p.verification_confidence === "medium" ? p.verification_confidence : "low") as Confidence,
      evidence: Array.isArray(p.evidence) ? p.evidence : [],
      identityCandidates: Array.isArray(p.ai_analysis?.identityCandidates) ? p.ai_analysis.identityCandidates : [],
      conflicts: Array.isArray(p.ai_analysis?.conflicts) ? p.ai_analysis.conflicts : [],
      verificationStatus: p.verification_status || "partial",
      verifiedSourceUrl: clean(p.verified_source_url, 500),
      verifiedSourceTitle: clean(p.verified_source_title, 180),
      searchStatus: p.search_status || "unavailable",
      developerSourceUrl: clean(p.ai_analysis?.developerSourceUrl, 500),
      developerConfidence: p.ai_analysis?.developerConfidence || "low",
      versionSource: p.ai_analysis?.versionSource || "unknown",
      productCount: Number(p.product_count || 1),
      includedProducts: safeArray(p.included_products, 20),
      fileIdentity: p.file_identity || { fileName: String(p.file_name || ""), consistent: true, detail: "" },
    };
    const caption = buildVerifiedCaption(result);
    if (!caption) return { ok: false, error: "translation_caption_quality_failed" };
    const update = await store.from("telegram_plugin_posts").update({
      description,
      draft_caption: caption,
      updated_at: new Date().toISOString(),
    }).eq("id", postId);
    if (update.error) return { ok: false, error: update.error.message };
    return { ok: true, caption, result };
  } catch (error) {
    await store.from("telegram_plugin_posts").update({
      review_required: true,
      processing_state: "NEEDS_REVIEW",
      error_message: "translation_failed:" + clean(error instanceof Error ? error.message : String(error), 220),
      updated_at: new Date().toISOString(),
    }).eq("id", postId);
    return { ok: false, error: clean(error instanceof Error ? error.message : String(error), 240) };
  }
}

export async function regenerateStoredCaption(postId: string) {
  const store = db();
  if (!store) return { ok: false, error: "supabase_not_configured" };
  const row = await store.from("telegram_plugin_posts").select("*").eq("id", postId).maybeSingle();
  if (row.error || !row.data) return { ok: false, error: "post_not_found" };
  const p = row.data;
  const result: VerificationResult = {
    ok: p.verification_status === "verified" && isSpecificIdentity(String(p.title || "")),
    reviewRequired: Boolean(p.review_required),
    title: clean(p.title, 160),
    developer: clean(p.developer, 120),
    version: clean(p.version, 80),
    latestOfficialVersion: clean(p.latest_official_version, 80),
    category: normalizeCategory(p.category) || "Unknown",
    formats: safeArray(p.formats, 8),
    platforms: safeArray(p.platforms, 6),
    features: safeArray(p.features, 8),
    description: qualityCaptionText(p.description),
    installationNotes: qualityCaptionText(p.ai_analysis?.installationNotes),
    translatedCaption: qualityCaptionText(p.ai_analysis?.translatedCaption),
    detectedLanguage: clean(p.detected_language || languageOf(p.raw_caption), 40),
    confidence: (p.verification_confidence === "high" || p.verification_confidence === "medium" ? p.verification_confidence : "low") as Confidence,
    evidence: Array.isArray(p.evidence) ? p.evidence : [],
    identityCandidates: Array.isArray(p.ai_analysis?.identityCandidates) ? p.ai_analysis.identityCandidates : [],
    conflicts: Array.isArray(p.ai_analysis?.conflicts) ? p.ai_analysis.conflicts : [],
    verificationStatus: p.verification_status || "partial",
    verifiedSourceUrl: clean(p.verified_source_url, 500),
    verifiedSourceTitle: clean(p.verified_source_title, 180),
    searchStatus: p.search_status || "unavailable",
    developerSourceUrl: clean(p.ai_analysis?.developerSourceUrl, 500),
    developerConfidence: p.ai_analysis?.developerConfidence || "low",
    versionSource: p.ai_analysis?.versionSource || "unknown",
    productCount: Number(p.product_count || 1),
    includedProducts: safeArray(p.included_products, 20),
    fileIdentity: p.file_identity || { fileName: String(p.file_name || ""), consistent: true, detail: "" },
  };
  const caption = buildVerifiedCaption(result);
  const quality = validateCaption(result, caption);
  if (!result.ok || !caption || !quality.ok) {
    await store.from("telegram_plugin_posts").update({
      review_required: true,
      processing_state: "NEEDS_REVIEW",
      error_message: "caption_generation_failed:" + (quality.reasons.join(",") || "verification_missing"),
      updated_at: new Date().toISOString(),
    }).eq("id", postId);
    return { ok: false, error: "caption_generation_failed", result };
  }
  const update = await store.from("telegram_plugin_posts").update({
    draft_caption: caption,
    processing_state: "READY",
    error_message: null,
    updated_at: new Date().toISOString(),
  }).eq("id", postId);
  if (update.error) return { ok: false, error: update.error.message };
  return { ok: true, caption, result };
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
    candidate: force ? undefined : {
      title: String(p.title || ""),
      developer: String(p.developer || ""),
      version: String(p.version || ""),
      category: String(p.category || ""),
      formats: p.formats,
      platforms: p.platforms,
      features: p.features,
    },
    force,
  });
  return { ...(await applyVerificationToPost(postId, result)), result };
}
