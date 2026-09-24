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
