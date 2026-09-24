/**
 * HitNevis public API — server-only. Clients must use /api/hitnevis/*.
 */

export type {
  HitNevisMode,
  HitNevisGenre,
  HitNevisTone,
  HitNevisGenerateRequest,
  HitNevisGenerateResult,
  HitNevisErrorResult,
  HitNevisResponse,
  HitNevisHealthSnapshot,
  HitNevisProject,
  LyricSection,
  LyricSectionId,
  ArtistVoiceProfile,
  HitDnaFeatures,
  HumanTestId,
  HumanTestResult,
  HumanTestsReport,
} from "./types";

export {
  HITNEVIS_MODES,
  isValidMode,
  buildHitNevisSystemPrompt,
  buildHitNevisUserPrompt,
  MODE_LABELS,
  SECTION_LABELS,
} from "./prompts";

export { validateHitNevisRequest, hitnevisGenerate, hitnevisHealth } from "./gateway";

export {
  analyzeHitDna,
  runHumanTests,
  detectCliches,
  formatHitDnaReport,
  formatHumanTestsReport,
} from "./hit-dna";

export {
  emptySongMemory,
  normalizeSongMemory,
  enrichMemoryFromUserText,
  formatSongMemoryForPrompt,
} from "./song-memory";
export type { SongMemory, CreativeDecision } from "./song-memory";

export {
  retrieveHitPatterns,
  getRetrievalDiagnostics,
  getHitKbStats,
  HIT_KB_VERSION,
  HIT_KB_SOURCE,
} from "./kb/retrieve";
export type { HitKbRecord } from "./kb/types";
export type { RetrieveQuery, RetrieveResult } from "./kb/retrieve";
