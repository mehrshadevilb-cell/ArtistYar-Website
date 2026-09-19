import { TasteSkillAdapter } from '@/integrations/skills/TasteSkillAdapter';

// Singleton instance management for services
let tasteSkillInstance: TasteSkillAdapter | null = null;

export function getTasteSkillService() {
  if (!tasteSkillInstance) {
    tasteSkillInstance = new TasteSkillAdapter();
  }
  return tasteSkillInstance;
}

// Export other config types if necessary
export type ServiceConfig = {
  supabaseUrl: string;
  supabaseKey: string;
};