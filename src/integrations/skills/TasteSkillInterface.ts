/**
 * Interface definition for the Taste Skill integration.
 * This decouples the business logic from the specific implementation of the external skill.
 */

export interface TasteAnalysisInput {
  artistName: string;
  genre?: string;
  description?: string;
}

export interface TasteAnalysisResult {
  score: number; // Normalized score between 0 and 1
  tags: string[];
  summary: string;
}

export interface ITasteSkillService {
  analyze(input: TasteAnalysisInput): Promise<TasteAnalysisResult>;
  isAvailable(): boolean;
}