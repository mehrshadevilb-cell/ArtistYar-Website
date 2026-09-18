import { ITasteSkillService, TasteAnalysisInput, TasteAnalysisResult } from './TasteSkillInterface';

/**
 * Adapter to integrate 'taste-skill' (https://github.com/leonxlnx/taste-skill).
 * 
 * SECURITY NOTE:
 * As per Lead Agent instructions, this library has not been fully audited.
 * This adapter currently implements a SAFE FALLBACK strategy.
 * It does NOT import the raw code directly yet. Instead, it returns default values
 * until Phase Zero (Audit) is complete and the dependency is verified.
 * 
 * To enable real functionality after audit:
 * 1. Add `git submodule add ...` as instructed.
 * 2. Import the actual module here.
 * 3. Map inputs/outputs explicitly.
 */
export class TasteSkillAdapter implements ITasteSkillService {
  private readonly isEnabled: boolean;

  constructor() {
    // Check environment variable to allow disabling without redeploying if needed
    this.isEnabled = process.env.TASTE_SKILL_ENABLED === 'true';
  }

  public isAvailable(): boolean {
    return this.isEnabled;
  }

  public async analyze(input: TasteAnalysisInput): Promise<TasteAnalysisResult> {
    if (!this.isEnabled) {
      throw new Error('Taste Skill is disabled via configuration.');
    }

    try {
      // PHASE ZERO PLACEHOLDER:
      // Currently returning a mock result because the external dependency 
      // has not been vetted for supply chain risks (exec/preinstall scripts).
      // DO NOT REPLACE THIS WITH DIRECT IMPORT UNTIL AUDIT IS PASSED.
      
      console.warn('[TasteSkillAdapter] Using fallback/mock analysis due to pending security audit.');
      
      const mockScore = Math.random(); // Placeholder logic
      const mockTags = input.genre ? [input.genre.toLowerCase(), 'auto-tagged'] : ['unknown'];
      
      return {
        score: mockScore,
        tags: mockTags,
        summary: `Analysis for ${input.artistName} completed using fallback mode.`
      };

      /* 
       * FUTURE IMPLEMENTATION (After Audit):
       * 
       * import { analyzeTaste } from '../skills/taste-skill/src/main'; // Hypothetical path
       * 
       * const rawResult = await analyzeTaste({
       *   query: input.description || input.artistName
       * });
       * 
       * return {
       *   score: normalizeScore(rawResult.confidence),
       *   tags: rawResult.categories,
       *   summary: rawResult.explanation
       * };
       */
    } catch (error) {
      console.error('[TasteSkillAdapter] Analysis failed:', error);
      // Graceful degradation
      return {
        score: 0,
        tags: [],
        summary: 'Analysis unavailable.'
      };
    }
  }
}