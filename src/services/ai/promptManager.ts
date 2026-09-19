import * as fs from 'fs';
import * as path from 'path';

export type TaskType = 'CODE_GENERATION' | 'DEBUGGING' | 'CREATIVE_WRITING' | 'GENERAL_CHAT' | 'UI_DESIGN';

export interface SystemPromptConfig {
  basePersona: string;
  taskSpecific?: string;
}

/**
 * Loads the Karpathy coding standards from the config file.
 * Returns empty string if file is missing or task is non-technical.
 */
function loadKarpathyStandards(): string {
  try {
    const filePath = path.join(process.cwd(), 'src', 'config', 'prompts', 'karpathy_coding_standards.md');
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
    console.warn('Karpathy standards file not found. Skipping injection.');
    return '';
  } catch (error) {
    console.error('Failed to load Karpathy standards:', error);
    return '';
  }
}

/**
 * Generates the full system prompt based on the task type.
 * Implements the "Layered Prompting" strategy approved in the Lead Plan.
 */
export function generateSystemPrompt(taskType: TaskType, customContext?: string): string {
  // Base Persona: Artistic, friendly, creative
  const basePersona = `You are ArtistYar, a creative and friendly AI assistant specialized in art, design, and web development. 
Your tone is warm, encouraging, and visually oriented. You prioritize user experience and aesthetic quality.`;

  let finalPrompt = basePersona;

  // Conditional Injection Layer
  if (taskType === 'CODE_GENERATION' || taskType === 'DEBUGGING') {
    const technicalConstraints = loadKarpathyStandards();
    if (technicalConstraints) {
      finalPrompt += `\n\n--- TECHNICAL CONSTRAINTS (ACTIVE) ---\n${technicalConstraints}\n----------------------------------------`;
    }
  }

  if (customContext) {
    finalPrompt += `\n\nCurrent Context:\n${customContext}`;
  }

  return finalPrompt;
}