import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = url && secret ? createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

export type PracticeRecord = {
  user_id: string;
  username: string;
  full_name: string;
  game_id: string;
  score: number;
  accuracy: number;
  streak: number;
  best_score: number;
  metadata: Record<string, unknown>;
  played_at?: string;
};

export function hasPracticeStore() { return Boolean(supabase); }

export async function savePracticeResult(input: PracticeRecord) {
  if (!supabase) throw new Error("practice_store_not_configured");
  const safe = {
    ...input,
    score: Math.max(0, Math.round(input.score)),
    accuracy: Math.max(0, Math.min(100, Number(input.accuracy) || 0)),
    streak: Math.max(0, Math.round(input.streak)),
    best_score: Math.max(0, Math.round(input.best_score)),
  };
  const result = await supabase.from("practice_records").insert(safe).select().single();
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

export async function getPracticeProfile(userId: string) {
  if (!supabase) throw new Error("practice_store_not_configured");
  const result = await supabase.from("practice_records").select("*").eq("user_id", userId).order("played_at", { ascending: false }).limit(500);
  if (result.error) throw new Error(result.error.message);
  const rows = result.data || [];
  const byGame = new Map<string, any>();
  for (const row of rows) {
    const current = byGame.get(row.game_id);
    if (!current || Number(row.best_score) > Number(current.best_score)) byGame.set(row.game_id, row);
  }
  const totalXp = rows.reduce((sum, row) => sum + Number(row.score || 0), 0);
  return { records: rows, bestByGame: Array.from(byGame.values()), totalXp, sessions: rows.length };
}

export async function getLeaderboard(limit = 50) {
  if (!supabase) throw new Error("practice_store_not_configured");
  const result = await supabase.from("practice_records").select("user_id,username,full_name,score,best_score,accuracy,streak,played_at").order("score", { ascending: false }).limit(1000);
  if (result.error) throw new Error(result.error.message);
  const totals = new Map<string, any>();
  for (const row of result.data || []) {
    const existing = totals.get(row.user_id);
    if (!existing) totals.set(row.user_id, { ...row, total_score: Number(row.score || 0), best_score: Number(row.best_score || 0), games_played: 1 });
    else {
      existing.total_score += Number(row.score || 0);
      existing.best_score = Math.max(existing.best_score, Number(row.best_score || 0));
      existing.games_played += 1;
      existing.accuracy = Math.max(Number(existing.accuracy || 0), Number(row.accuracy || 0));
      existing.streak = Math.max(Number(existing.streak || 0), Number(row.streak || 0));
    }
  }
  return Array.from(totals.values()).sort((a,b) => b.total_score - a.total_score).slice(0, limit).map((row, index) => ({ rank: index + 1, ...row }));
}
