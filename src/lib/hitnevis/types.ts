/**
 * HitNevis — Phase 1 types (Architecture Audit + Safe Foundation)
 * Isolated from admin-AI and practice domains. No hard-coded providers/models.
 */

export type HitNevisMode =
  | "write_full"
  | "write_chorus"
  | "write_verse"
  | "improve"
  | "rhyme"
  | "title_ideas"
  | "structure";

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

export type HitNevisGenerateRequest = {
  mode: HitNevisMode;
  topic?: string;
  existingLyrics?: string;
  genre?: HitNevisGenre;
  tone?: HitNevisTone;
  language?: "fa" | "en" | "fa-en";
  constraints?: string;
  /** Optional preferred provider — gateway still fails over if it fails */
  preferredProvider?: string;
  preferredModel?: string;
};

export type HitNevisGenerateResult = {
  ok: true;
  requestId: string;
  text: string;
  provider: string;
  model: string;
  latencyMs: number;
  mode: HitNevisMode;
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
