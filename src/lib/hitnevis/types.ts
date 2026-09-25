/**
 * HitNevis — shared types for Phases 1–5
 * No hard-coded providers/models. Legally safe Hit DNA (patterns only).
 */

export type HitNevisMode =
  | "write_full"
  | "write_chorus"
  | "write_verse"
  | "write_pre_chorus"
  | "write_bridge"
  | "write_outro"
  | "improve"
  | "rhyme"
  | "title_ideas"
  | "structure"
  | "continue"
  | "rewrite"
  | "shorten"
  | "emotional"
  | "conversational"
  | "visual"
  | "bold"
  | "critic"
  | "idea_analyze"
  | "hook_lab"
  | "anti_cliche"
  | "save_lyric"
  | "hit_dna"
  | "human_tests"
  | "artist_voice"
  | "chat";

export type LyricSectionId =
  | "verse"
  | "pre_chorus"
  | "chorus"
  | "bridge"
  | "outro"
  | "hook"
  | "other";

export type HitNevisGenre =
  | "pop"
  | "hiphop"
  | "rock"
  | "traditional"
  | "electronic"
  | "rnb"
  | "folk"
  | "other";

export type HitNevisTone =
  | "romantic"
  | "sad"
  | "hopeful"
  | "angry"
  | "playful"
  | "epic"
  | "neutral";

export type ArtistVoiceProfile = {
  name?: string;
  styleNotes?: string;
  preferredWords?: string[];
  avoidedWords?: string[];
  register?: "colloquial" | "literary" | "mixed";
  rhymePreference?: "loose" | "tight" | "free";
};

export type LyricSection = {
  id: string;
  type: LyricSectionId;
  label: string;
  text: string;
};

export type HitNevisProject = {
  id: string;
  title: string;
  topic?: string;
  genre?: HitNevisGenre;
  tone?: HitNevisTone;
  language?: "fa" | "en" | "fa-en";
  sections: LyricSection[];
  /** Original artist text — never auto-overwritten */
  originalDraft?: string;
  artistVoice?: ArtistVoiceProfile;
  updatedAt: string;
  createdAt: string;
};

export type HitNevisGenerateRequest = {
  mode: HitNevisMode;
  topic?: string;
  existingLyrics?: string;
  sectionType?: LyricSectionId;
  genre?: HitNevisGenre;
  tone?: HitNevisTone;
  language?: "fa" | "en" | "fa-en";
  constraints?: string;
  artistVoice?: ArtistVoiceProfile;
  directionsCount?: number;
  preferredProvider?: string;
  preferredModel?: string;
  /** Recent turns for multi-turn co-writing. Max ~12 server-side. */
  conversationHistory?: { role: "user" | "assistant"; content: string }[];
};

export type HitNevisGenerateResult = {
  ok: true;
  requestId: string;
  text: string;
  provider: string;
  model: string;
  latencyMs: number;
  mode: HitNevisMode;
  directions?: string[];
};

export type HitNevisErrorResult = {
  ok: false;
  requestId: string;
  error: string;
  code:
    | "validation"
    | "rate_limit"
    | "no_providers"
    | "all_failed"
    | "timeout"
    | "aborted"
    | "internal";
  retryable: boolean;
  latencyMs: number;
};

export type HitNevisResponse = HitNevisGenerateResult | HitNevisErrorResult;

export type HitNevisHealthSnapshot = {
  ok: boolean;
  requestId: string;
  providersConfigured: number;
  providersHealthy: number;
  pool: Array<{
    id: string;
    name: string;
    hasKey: boolean;
    modelsSample: string[];
    deadForMs: number;
  }>;
  timestamp: string;
};

/** Hit DNA — analytical features only (never copyrighted lyric text) */
export type HitDnaFeatures = {
  structureScore: number;
  hookPresence: number;
  repetitionIndex: number;
  narrativeClarity: number;
  emotionalArc: number;
  rhymeDensity: number;
  registerConsistency: number;
  phraseDensity: number;
  memorabilitySignal: number;
  overall: number;
  notes: string[];
  disclaimer: string;
  /** Deterministic, approximate Persian lyric mechanics. */
  prosody?: {
    averageSyllables: number;
    syllableSpread: number;
    flaggedLines: number;
    repeatedEndWords: string[];
    confidence: "approximate";
  };
  actionableSuggestions?: string[];
};

export type HumanTestId =
  | "first_listen"
  | "sing"
  | "memory"
  | "emotion"
  | "conversation"
  | "cliche"
  | "artist";

export type HumanTestResult = {
  id: HumanTestId;
  label: string;
  score: number;
  summary: string;
  tips: string[];
};

export type HumanTestsReport = {
  tests: HumanTestResult[];
  overall: number;
  disclaimer: string;
};
