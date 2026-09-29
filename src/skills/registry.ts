/**
 * RahYar Admin Dev Agent - Installed Agent Skills Registry
 * Lists and references all external agent capabilities and design standards.
 */

export interface AgentSkillSource {
  name: string;
  url: string;
  category: "development" | "design" | "seo" | "ai" | "workflow" | "security";
}

export const INSTALLED_AGENT_SKILLS: AgentSkillSource[] = [
  { name: "mattpocock-skills", url: "https://github.com/mattpocock/skills", category: "development" },
  { name: "vercel-labs-skills", url: "https://github.com/vercel-labs/skills", category: "development" },
  { name: "obra-superpowers", url: "https://github.com/obra/superpowers", category: "workflow" },
  { name: "addyosmani-agent-skills", url: "https://github.com/addyosmani/agent-skills.git", category: "development" },
  { name: "nvidia-model-optimizer", url: "https://github.com/NVIDIA/Model-Optimizer", category: "ai" },
  { name: "youtube-jono-seo-agent", url: "https://github.com/youtube-jono/seo-agent", category: "seo" },
  { name: "multica-karpathy-skills", url: "https://github.com/multica-ai/andrej-karpathy-skills", category: "ai" },
  { name: "nousresearch-songwriting", url: "https://github.com/nousresearch/hermes-agent/blob/main/skills/creative/songwriting-and-ai-music/SKILL.md", category: "ai" },
  { name: "thedotmack-claude-mem", url: "https://github.com/thedotmack/claude-mem", category: "workflow" },
  { name: "pbakaus-impeccable", url: "https://github.com/pbakaus/impeccable", category: "design" },
  { name: "rebelytics-one-skill", url: "https://github.com/rebelytics/one-skill-to-rule-them-all", category: "workflow" },
  { name: "leonxlnx-taste-skill", url: "https://github.com/leonxlnx/taste-skill", category: "design" },
  { name: "nextlevelbuilder-ui-ux-pro-max", url: "https://github.com/nextlevelbuilder/ui-ux-pro-max-skill", category: "design" },
  { name: "panniantong-agent-reach", url: "https://github.com/Panniantong/agent-reach", category: "seo" },
  { name: "usestrix-strix", url: "https://github.com/usestrix/strix", category: "security" },
  { name: "nvidia-skillspector", url: "https://github.com/NVIDIA/SkillSpector", category: "ai" },
  { name: "emilkowalski-apple-design", url: "https://github.com/emilkowalski/skills/tree/main/skills/apple-design", category: "design" },
  { name: "voltagent-awesome-design-md", url: "https://github.com/VoltAgent/awesome-design-md", category: "design" },
  { name: "jtydhr88-lyric-writing", url: "https://github.com/jtydhr88/lyric-writing-skills/blob/main/README.md", category: "ai" },
  { name: "agricidaniel-claude-seo", url: "https://github.com/AgriciDaniel/claude-seo.git", category: "seo" }
];

export function getSkillsByCategory(category: AgentSkillSource["category"]): AgentSkillSource[] {
  return INSTALLED_AGENT_SKILLS.filter(s => s.category === category);
}