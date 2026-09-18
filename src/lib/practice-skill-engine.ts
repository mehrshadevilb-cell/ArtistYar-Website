import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const db = url && secret ? createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

export type SkillKey = "ear_training" | "harmony" | "mixing" | "dynamics" | "stereo" | "critical_listening";

const SKILL_META: Record<SkillKey, { label: string; title: string }> = {
  ear_training: { label: "Ear Training", title: "گوش موسیقی" },
  harmony: { label: "Harmony", title: "هارمونی" },
  mixing: { label: "Mixing", title: "میکس" },
  dynamics: { label: "Dynamics", title: "داینامیک" },
  stereo: { label: "Stereo & Phase", title: "استریو و فاز" },
  critical_listening: { label: "Critical Listening", title: "شنیدن تحلیلی" },
};

const GAME_SKILLS: Record<string, SkillKey> = {
  tone: "ear_training",
  eq: "mixing",
  compressor: "dynamics",
  phase: "stereo",
  theory: "harmony",
  reverb: "mixing",
  saturation: "mixing",
  masking: "critical_listening",
  transient: "dynamics",
  voicing: "harmony",
  personal: "critical_listening",
};

export function skillForGame(gameId: string): SkillKey {
  return GAME_SKILLS[gameId] || "critical_listening";
}

export function skillLevel(xp: number) {
  return Math.min(500, Math.max(1, Math.floor(Math.max(0, xp) / 100) + 1));
}

export function hasSkillStore() { return Boolean(db); }

async function ensureMissions(userId: string, date: string) {
  if (!db) return;
  const existing = await db.from("practice_daily_missions").select("id").eq("user_id", userId).eq("mission_date", date).limit(1);
  if (existing.data?.length) return;
  const day = Math.abs([...date].reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 997, 7));
  const skills: SkillKey[] = ["ear_training", "mixing", "dynamics", "stereo", "harmony", "critical_listening"];
  const selected = [skills[day % skills.length], skills[(day + 2) % skills.length], skills[(day + 4) % skills.length]];
  const unique = [...new Set(selected)];
  const rows = unique.map((skill, index) => ({
    user_id: userId, mission_date: date, mission_key: "daily_" + index, skill,
    title: index === 0 ? "تمرین اصلی امروز" : index === 1 ? "تمرین تقویتی امروز" : "چالش شنیداری امروز",
    target: index === 0 ? 5 : 3, xp_reward: index === 0 ? 75 : 40,
  }));
  await db.from("practice_daily_missions").upsert(rows, { onConflict: "user_id,mission_date,mission_key", ignoreDuplicates: true });
}

export async function recordSkillEvent(input: { userId: string; gameId: string; xp: number; accuracy: number; difficulty?: number; correct: boolean; metadata?: Record<string, unknown> }) {
  if (!db) return;
  const skill = skillForGame(input.gameId);
  await db.from("practice_skill_events").insert({
    user_id: input.userId, skill, game_id: input.gameId, xp: Math.max(0, Math.round(input.xp)),
    accuracy: Math.max(0, Math.min(100, input.accuracy)), difficulty: input.difficulty || 0,
    correct: input.correct, metadata: input.metadata || {},
  });
  const profile = await db.from("practice_skill_profiles").select("*").eq("user_id", input.userId).maybeSingle();
  const nextXp = Number(profile.data?.total_xp || 0) + Math.max(0, Math.round(input.xp));
  await db.from("practice_skill_profiles").upsert({
    user_id: input.userId, total_xp: nextXp, overall_level: skillLevel(nextXp),
    streak: Number(input.metadata?.streak || profile.data?.streak || 0),
    last_practice_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  const date = new Date().toISOString().slice(0, 10);
  await ensureMissions(input.userId, date);
  const missions = await db.from("practice_daily_missions").select("*").eq("user_id", input.userId).eq("mission_date", date).eq("skill", skill);
  for (const mission of missions.data || []) {
    const next = Math.min(Number(mission.target), Number(mission.progress || 0) + 1);
    await db.from("practice_daily_missions").update({
      progress: next, completed: next >= Number(mission.target), updated_at: new Date().toISOString()
    }).eq("id", mission.id);
  }
}

export async function getSkillDashboard(userId: string) {
  if (!db) throw new Error("practice_skill_store_not_configured");
  const date = new Date().toISOString().slice(0, 10);
  await ensureMissions(userId, date);
  const [profile, events, missions] = await Promise.all([
    db.from("practice_skill_profiles").select("*").eq("user_id", userId).maybeSingle(),
    db.from("practice_skill_events").select("skill,xp,accuracy,correct,difficulty,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1000),
    db.from("practice_daily_missions").select("*").eq("user_id", userId).eq("mission_date", date).order("created_at"),
  ]);
  if (profile.error) throw new Error(profile.error.message);
  if (events.error) throw new Error(events.error.message);
  if (missions.error) throw new Error(missions.error.message);
  const stats = new Map<SkillKey, { xp:number; attempts:number; correct:number; accuracy:number; level:number }>();
  for (const key of Object.keys(SKILL_META) as SkillKey[]) stats.set(key, { xp:0, attempts:0, correct:0, accuracy:0, level:1 });
  for (const row of events.data || []) {
    const key = row.skill as SkillKey;
    const s = stats.get(key) || { xp:0, attempts:0, correct:0, accuracy:0, level:1 };
    s.xp += Number(row.xp || 0); s.attempts += 1; s.correct += row.correct ? 1 : 0; s.accuracy += Number(row.accuracy || 0); s.level = skillLevel(s.xp); stats.set(key, s);
  }
  const skills = [...stats.entries()].map(([key, s]) => ({
    key, ...SKILL_META[key], xp:s.xp, level:s.level, attempts:s.attempts,
    accuracy:s.attempts ? Math.round(s.accuracy / s.attempts) : 0,
    progress:s.level >= 500 ? 100 : Math.round((s.xp % 100)),
  }));
  return {
    totalXp:Number(profile.data?.total_xp || 0), level:Number(profile.data?.overall_level || 1),
    streak:Number(profile.data?.streak || 0), skills, missions: missions.data || [],
    lastPracticeAt:profile.data?.last_practice_at || null,
  };
}