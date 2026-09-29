/**
 * Registry of installed agent skills and external references.
 */
export const INSTALLED_SKILLS = [
  { name: "mattpocock-skills", url: "https://github.com/mattpocock/skills" },
  { name: "vercel-labs-skills", url: "https://github.com/vercel-labs/skills" },
  { name: "obra-superpowers", url: "https://github.com/obra/superpowers" },
  { name: "addyosmani-agent-skills", url: "https://github.com/addyosmani/agent-skills.git" },
  { name: "nvidia-model-optimizer", url: "https://github.com/NVIDIA/Model-Optimizer" },
  { name: "youtube-jono-seo-agent", url: "https://github.com/youtube-jono/seo-agent" },
  { name: "andrej-karpathy-skills", url: "https://github.com/multica-ai/andrej-karpathy-skills" },
  { name: "hermes-agent-songwriting", url: "https://github.com/nousresearch/hermes-agent/blob/main/skills/creative/songwriting-and-ai-music/SKILL.md" },
  { name: "thedotmack-claude-mem", url: "https://github.com/thedotmack/claude-mem" },
  { name: "pbakaus-impeccable", url: "https://github.com/pbakaus/impeccable" },
  { name: "one-skill-to-rule-them-all", url: "https://github.com/rebelytics/one-skill-to-rule-them-all" },
  { name: "leonxlnx-taste-skill", url: "https://github.com/leonxlnx/taste-skill" },
  { name: "ui-ux-pro-max-skill", url: "https://github.com/nextlevelbuilder/ui-ux-pro-max-skill" },
  { name: "panniantong-agent-reach", url: "https://github.com/Panniantong/agent-reach" },
  { name: "usestrix-strix", url: "https://github.com/usestrix/strix" },
  { name: "nvidia-skillspector", url: "https://github.com/NVIDIA/SkillSpector" },
  { name: "apple-design", url: "https://github.com/emilkowalski/skills/tree/main/skills/apple-design" },
  { name: "voltagent-awesome-design-md", url: "https://github.com/VoltAgent/awesome-design-md" },
  { name: "lyric-writing-skills", url: "https://github.com/jtydhr88/lyric-writing-skills/blob/main/README.md" },
  { name: "claude-seo", url: "https://github.com/AgriciDaniel/claude-seo.git" },
];

export function getRegisteredSkillsCount() {
  return INSTALLED_SKILLS.length;
}