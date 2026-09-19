import type {AgentRole,AgentSkill,SkillInput,SkillOutput} from "./types";
const registry=new Map<string,AgentSkill>();
export function registerSkill(skill:AgentSkill){if(!skill.id||!skill.name)throw new Error("Skill id/name is required.");registry.set(skill.id,skill);}
export function getSkill(id:string){return registry.get(id);}
export function listSkills(role?:AgentRole){const all=[...registry.values()];return role?all.filter(s=>s.roles.includes(role)):all;}
export async function runSkill(id:string,input:SkillInput):Promise<SkillOutput>{const skill=registry.get(id);if(!skill)throw new Error(`Unknown coding-agent skill: ${id}`);return skill.run(input);}
export function skillManifest(){return listSkills().map(({run:_run,...manifest})=>manifest);}