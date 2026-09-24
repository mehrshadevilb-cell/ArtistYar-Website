/**
 * HitNevis public API surface (server-only modules).
 * Client components must call /api/hitnevis/* — never import gateway on the client.
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
} from "./types";

export { HITNEVIS_MODES, isValidMode, buildHitNevisSystemPrompt, buildHitNevisUserPrompt } from "./prompts";
export { validateHitNevisRequest, hitnevisGenerate, hitnevisHealth } from "./gateway";
