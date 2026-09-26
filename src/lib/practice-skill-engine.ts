import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const db = url && secret ? createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

// XP is server-calculated in /api/practice/progress; still clamp here as defense-in-depth.
const MAX_EVENT_XP = 300;

export type SkillKey = "ear_training" | "harmony" | "mixing" | "dynamics" | "stereo" | "critical_listening";

type EventRow = {
  skill?: string; xp?: number; accuracy?: number; correct?: boolean; difficulty?: number;
  created_at?: string; metadata?: Record<string, unknown> | null;
};

const SKILL_META: Record<SkillKey, { label: string; title: string; short: string }> = {
  ear_training: { label: "Ear Training", title: "گوش موسیقی", short: "تشخیص تون و تفاوت‌های شنیداری" },
  harmony: { label: "Harmony", title: "هارمونی", short: "فواصل، آکورد و voicing" },
  mixing: { label: "Mixing", title: "میکس", short: "EQ، reverb، saturation و masking" },
  dynamics: { label: "Dynamics", title: "داینامیک", short: "Compression و transient" },
  stereo: { label: "Stereo & Phase", title: "استریو و فاز", short: "تصویر، polarity و width" },
  critical_listening: { label: "Critical Listening", title: "شنیدن تحلیلی", short: "تشخیص جزئیات و تصمیم‌گیری" },
};

const GAME_SKILLS: Record<string, SkillKey> = {
  tone: "ear_training", eq: "mixing", compressor: "dynamics", phase: "stereo",
  theory: "harmony", "theory-interval": "harmony", "theory-chord": "harmony",
  reverb: "mixing", saturation: "mixing", masking: "critical_listening",
  transient: "dynamics", voicing: "harmony", personal: "critical_listening",
  "pro-reverb": "mixing", "pro-saturation": "mixing", "pro-masking": "critical_listening", "pro-transient": "dynamics",
  "sg-freq-detect": "ear_training", "sg-eq-peak": "mixing", "sg-eq-cut": "mixing",
  "sg-eq-match": "mixing", "sg-filter-expert": "mixing", "sg-bass-detective": "ear_training",
  "sg-compressionist": "dynamics", "sg-dr-compressor": "dynamics", "sg-loudness-db": "dynamics",
  "sg-pan-train": "stereo", "sg-stereo-width": "stereo", "sg-sonar-beast": "ear_training",
  "sg-comp-match": "dynamics", "sg-comp-thresh": "dynamics", "sg-comp-release": "dynamics",
  "sg-makeup": "dynamics", "sg-comp-compare": "dynamics",
  "sg-delay-detect": "mixing", "sg-delay-match": "mixing", "sg-reverb-type": "mixing",
  "sg-reverb-match": "mixing", "sg-predelay": "mixing", "sg-decay": "mixing",
  "sg-wetdry": "mixing", "sg-spatial": "stereo",
  "sg-dist-detect": "mixing", "sg-sat-detect": "mixing", "sg-dist-amount": "mixing",
  "sg-feedback-freq": "ear_training", "sg-harmonic-nl": "mixing",
  "sg-balance-memory": "mixing", "sg-balance-recreate": "mixing",
  "sg-mix-vocal": "mixing", "sg-mix-masking": "critical_listening",
  "sg-mix-freq-conflict": "mixing", "sg-mix-eq": "mixing", "sg-mix-level": "mixing",
  "sg-mix-pan": "stereo", "sg-mix-stereo": "stereo", "sg-mix-clarity": "critical_listening",
  "sg-mix-ab": "critical_listening",
  "user-audio": "critical_listening", "user-audio-eq": "mixing", "user-audio-comp": "dynamics",
  "daily-challenge": "critical_listening", "workout": "critical_listening",
  // Unified SoundGym / PracticeGameSession catalog
  "freq-memory": "ear_training",
  "eq-detective": "mixing",
  "comp-detective": "dynamics",
  "stereo-space": "stereo",
  "pitch-lab": "harmony",
  "rhythm-lab": "ear_training",
};

export function skillForGame(gameId: string): SkillKey {
  if (GAME_SKILLS[gameId]) return GAME_SKILLS[gameId];
  // Prefix fallbacks for sg-* without exact map
  if (gameId.startsWith("sg-eq") || gameId.startsWith("sg-filter") || gameId.startsWith("sg-reverb") || gameId.startsWith("sg-delay") || gameId.startsWith("sg-dist") || gameId.startsWith("sg-sat") || gameId.startsWith("sg-mix") || gameId.startsWith("sg-balance")) return "mixing";
  if (gameId.startsWith("sg-comp") || gameId.includes("loudness") || gameId.includes("makeup") || gameId.includes("transient")) return "dynamics";
  if (gameId.includes("pan") || gameId.includes("stereo") || gameId.includes("spatial") || gameId.includes("phase")) return "stereo";
  if (gameId.includes("freq") || gameId.includes("bass") || gameId.includes("sonar") || gameId.includes("tone")) return "ear_training";
  if (gameId.includes("theory") || gameId.includes("voicing") || gameId.includes("chord")) return "harmony";
  return "critical_listening";
}

export function skillLevel(xp: number) {
  return Math.min(500, Math.max(1, Math.floor(Math.max(0, xp) / 100) + 1));
}

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }

function calcSkill(events: EventRow[]) {
  const attempts = events.length;
  const accuracy = attempts ? events.reduce((s, e) => s + clamp(Number(e.accuracy) || 0, 0, 100), 0) / attempts : 0;
  const recent = events.slice(0, 12);
  const recentAccuracy = recent.length ? recent.reduce((s, e) => s + clamp(Number(e.accuracy) || 0, 0, 100), 0) / recent.length : accuracy;
  const consistency = recent.length > 1
    ? clamp(100 - Math.min(100, Math.sqrt(recent.reduce((s, e) => s + Math.pow((Number(e.accuracy) || 0) - recentAccuracy, 2), 0) / recent.length)), 0, 100)
    : accuracy;
  const responseTimes = events.map(e => Number(e.metadata?.responseTimeMs)).filter(n => Number.isFinite(n) && n > 0 && n < 60000);
  const reactionMs = responseTimes.length ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : null;
  const difficult = events.length ? events.reduce((s, e) => s + clamp(Number(e.difficulty) || 0, 0, 500), 0) / events.length : 0;
  const xp = events.reduce((s, e) => s + Math.max(0, Number(e.xp) || 0), 0);
  const correct = events.filter(e => Boolean(e.correct)).length;
  const difficultyWeightedAccuracy = attempts
    ? events.reduce((sum, e) => {
        const d = clamp(Number(e.difficulty) || 1, 1, 500);
        const weight = 0.5 + d / 500;
        return sum + clamp(Number(e.accuracy) || 0, 0, 100) * weight;
      }, 0) / events.reduce((sum, e) => sum + (0.5 + clamp(Number(e.difficulty) || 1, 1, 500) / 500), 0)
    : 0;
  const base = 250 + accuracy * 2.1 + recentAccuracy * 1.2 + consistency * 0.7 + Math.min(80, difficult * 0.16) - (reactionMs ? Math.max(0, reactionMs - 2200) / 120 : 0);
  const rating = Math.round(clamp(base + (difficultyWeightedAccuracy - accuracy) * 0.55, 1, 500));
  const confidence = Math.round(clamp(35 + attempts * 2 + consistency * 0.35, 0, 100));
  const recommendedDifficulty = Math.round(clamp(
    rating + (recentAccuracy < 68 ? -35 : recentAccuracy > 88 ? 28 : 0) + (attempts < 5 ? -45 : 0),
    1, 500
  ));
  return { xp, attempts, correct, accuracy: Math.round(accuracy), recentAccuracy: Math.round(recentAccuracy), consistency: Math.round(consistency), reactionMs: reactionMs ? Math.round(reactionMs) : null, difficulty: Math.round(difficult), rating, confidence, recommendedDifficulty };
}

async function ensureMissions(userId: string, date: string) {
  if (!db) return;
  const existing = await db.from("practice_daily_missions").select("id").eq("user_id", userId).eq("mission_date", date).limit(1);
  if (existing.data?.length) return;
  const skills: SkillKey[] = ["ear_training", "mixing", "dynamics", "stereo", "harmony", "critical_listening"];
  const seed = Math.abs([...date].reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 997, 7));
  const selected = [skills[seed % 6], skills[(seed + 2) % 6], skills[(seed + 4) % 6]];
  const unique = [...new Set(selected)];
  await db.from("practice_daily_missions").upsert(unique.map((skill, index) => ({
    user_id: userId, mission_date: date, mission_key: "daily_" + index, skill,
    title: index === 0 ? "تمرین اصلی امروز" : index === 1 ? "تمرین تقویتی امروز" : "چالش شنیداری امروز",
    target: index === 0 ? 8 : 5, xp_reward: index === 0 ? 100 : 60,
  })), { onConflict: "user_id,mission_date,mission_key", ignoreDuplicates: true });
}

export async function recordSkillEvent(input: {
  userId: string; gameId: string; xp: number; accuracy: number; difficulty?: number;
  correct: boolean; metadata?: Record<string, unknown>;
}) {
  if (!db) return;
  const skill = skillForGame(input.gameId);
  const xp = Math.max(0, Math.min(MAX_EVENT_XP, Math.round(input.xp)));
  await db.from("practice_skill_events").insert({
    user_id: input.userId, skill, game_id: input.gameId, xp,
    accuracy: clamp(input.accuracy, 0, 100), difficulty: clamp(Number(input.difficulty) || 0, 0, 500),
    correct: input.correct,
    response_time_ms: Number(input.metadata?.responseTimeMs) > 0 ? Math.min(60000, Math.round(Number(input.metadata?.responseTimeMs))) : null,
    session_id: typeof input.metadata?.sessionId === "string" ? input.metadata.sessionId.slice(0, 120) : null,
    item_key: typeof input.metadata?.itemKey === "string" ? input.metadata.itemKey.slice(0, 240) : null,
    metadata: input.metadata || {},
  });
  const profile = await db.from("practice_skill_profiles").select("*").eq("user_id", input.userId).maybeSingle();
  const nextXp = Number(profile.data?.total_xp || 0) + xp;
  const now = new Date();
  const last = profile.data?.last_practice_at ? new Date(profile.data.last_practice_at) : null;
  const daysApart = last ? Math.floor((now.getTime() - last.getTime()) / 86400000) : null;
  const previousStreak = Number(profile.data?.streak || 0);
  const streak = daysApart === 0 ? previousStreak : daysApart === 1 ? previousStreak + 1 : 1;
  await db.from("practice_skill_profiles").upsert({
    user_id: input.userId, total_xp: nextXp, overall_level: skillLevel(nextXp),
    streak, last_practice_at: now.toISOString(), updated_at: now.toISOString(),
  }, { onConflict: "user_id" });
  const date = now.toISOString().slice(0, 10);
  await ensureMissions(input.userId, date);
  const missions = await db.from("practice_daily_missions").select("*").eq("user_id", input.userId).eq("mission_date", date).eq("skill", skill);
  for (const mission of missions.data || []) {
    const next = Math.min(Number(mission.target), Number(mission.progress || 0) + 1);
    await db.from("practice_daily_missions").update({ progress: next, completed: next >= Number(mission.target), updated_at: now.toISOString() }).eq("id", mission.id);
  }
}

export async function getSkillDashboard(userId: string) {
  if (!db) throw new Error("practice_skill_store_not_configured");
  const date = new Date().toISOString().slice(0, 10);
  await ensureMissions(userId, date);
  const [profile, events, missions] = await Promise.all([
    db.from("practice_skill_profiles").select("*").eq("user_id", userId).maybeSingle(),
    db.from("practice_skill_events").select("skill,xp,accuracy,correct,difficulty,created_at,metadata").eq("user_id", userId).order("created_at", { ascending: false }).limit(1000),
    db.from("practice_daily_missions").select("*").eq("user_id", userId).eq("mission_date", date).order("created_at"),
  ]);
  if (profile.error) throw new Error(profile.error.message);
  if (events.error) throw new Error(events.error.message);
  if (missions.error) throw new Error(missions.error.message);
  const bySkill = new Map<SkillKey, EventRow[]>();
  (Object.keys(SKILL_META) as SkillKey[]).forEach(k => bySkill.set(k, []));
  for (const row of events.data || []) {
    const k = row.skill as SkillKey;
    if (bySkill.has(k)) bySkill.get(k)!.push(row);
  }
  const skillStats = (Object.keys(SKILL_META) as SkillKey[]).map(key => {
    const stats = calcSkill(bySkill.get(key) || []);
    const level = skillLevel(stats.xp);
    return { key, ...SKILL_META[key], ...stats, level, progress: level >= 500 ? 100 : stats.xp % 100 };
  });
  const weakest = [...skillStats].sort((a, b) => a.rating - b.rating || a.recentAccuracy - b.recentAccuracy)[0];
  const overallAccuracy = skillStats.filter(s => s.attempts).reduce((s, x) => s + x.accuracy, 0) / Math.max(1, skillStats.filter(s => s.attempts).length);
  const overallRating = Math.round(skillStats.filter(s => s.attempts).reduce((s, x) => s + x.rating, 0) / Math.max(1, skillStats.filter(s => s.attempts).length));
  return {
    totalXp: Number(profile.data?.total_xp || 0), level: Number(profile.data?.overall_level || 1),
    streak: Number(profile.data?.streak || 0), skills: skillStats, missions: missions.data || [],
    overallRating: overallRating || 0, overallAccuracy: Math.round(overallAccuracy || 0),
    weakestSkill: weakest?.key || "ear_training",
    recommendation: weakest ? "تمرکز بعدی: " + weakest.title + " · هدف پیشنهادی " + weakest.recommendedDifficulty + "/500" : "از یک تمرین شروع کن تا پروفایل شنیداری ساخته شود.",
    lastPracticeAt: profile.data?.last_practice_at || null,
  };
}

export async function getAdaptivePlan(userId: string) {
  const dashboard = await getSkillDashboard(userId);
  const sorted = [...dashboard.skills].sort((a, b) => a.rating - b.rating || a.recentAccuracy - b.recentAccuracy);
  const slots = [
    sorted[0]?.key || "ear_training",
    sorted[1]?.key || "mixing",
    sorted[0]?.key || "ear_training",
    sorted[2]?.key || "dynamics",
  ];
  return {
    overallRating: dashboard.overallRating,
    overallAccuracy: dashboard.overallAccuracy,
    weakestSkill: dashboard.weakestSkill,
    recommendation: dashboard.recommendation,
    workoutMinutes: 10,
    exercises: slots.map((skill, i) => {
      const s = dashboard.skills.find(x => x.key === skill)!;
      const game = skill === "mixing" ? "eq" : skill === "dynamics" ? "compressor" : skill === "stereo" ? "phase" : skill === "harmony" ? "theory" : skill === "ear_training" ? "tone" : "eq";
      return { index: i + 1, skill, title: s.title, gameId: game, difficulty: s.recommendedDifficulty, targetAccuracy: 82 };
    }),
  };
}

export function hasSkillStore() { return Boolean(db); }
