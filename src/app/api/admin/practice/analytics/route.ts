import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/server-admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const db = url && secret ? createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

export async function GET() {
  const session = verifyAdminSession((await cookies()).get(ADMIN_SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!db) return NextResponse.json({ ok: false, error: "practice_store_not_configured" }, { status: 503 });
  try {
    const [records, subscriptions, payments] = await Promise.all([
      db
        .from("practice_records")
        .select("user_id,username,full_name,game_id,score,accuracy,played_at,metadata")
        .order("played_at", { ascending: false })
        .limit(10000),
      db
        .from("practice_subscriptions")
        .select("id,user_id,status,price_toman,started_at,expires_at,created_at")
        .order("created_at", { ascending: false })
        .limit(2000),
      db
        .from("practice_payment_requests")
        .select("id,user_id,amount_toman,status,created_at,reviewed_at")
        .order("created_at", { ascending: false })
        .limit(2000),
    ]);

    if (records.error) throw records.error;
    // Soft-fail: subscriptions table may not exist yet
    const subs = subscriptions.error ? [] : subscriptions.data || [];
    const payRows = payments.error ? [] : payments.data || [];
    const rows = records.data || [];
    const approved = payRows.filter((x) => x.status === "approved");
    const users = new Map<string, any>();
    for (const row of rows) {
      const current =
        users.get(row.user_id) || {
          user_id: row.user_id,
          username: row.username,
          full_name: row.full_name,
          sessions: 0,
          voicing_sessions: 0,
          xp: 0,
          accuracy: 0,
          last_practice_at: row.played_at,
        };
      current.sessions += 1;
      current.voicing_sessions += row.game_id === "voicing" ? 1 : 0;
      current.xp += Number(row.score || 0);
      current.accuracy += Number(row.accuracy || 0);
      if (String(row.played_at) > String(current.last_practice_at)) current.last_practice_at = row.played_at;
      users.set(row.user_id, current);
    }
    const active = subs.filter((x) => x.status === "active" && new Date(x.expires_at).getTime() > Date.now());
    const renewals = subs.filter(
      (x) =>
        new Date(x.started_at).getTime() > new Date(x.created_at).getTime() + 86400000 ||
        Number(x.price_toman) > 40000,
    ).length;
    const monthly = new Map<
      string,
      { month: string; sessions: number; voicing: number; xp: number; renewals: number; revenue: number }
    >();
    for (const row of rows) {
      const month = String(row.played_at).slice(0, 7);
      const x = monthly.get(month) || { month, sessions: 0, voicing: 0, xp: 0, renewals: 0, revenue: 0 };
      x.sessions++;
      x.voicing += row.game_id === "voicing" ? 1 : 0;
      x.xp += Number(row.score || 0);
      monthly.set(month, x);
    }
    for (const sub of subs) {
      const month = String(sub.created_at).slice(0, 7);
      const x = monthly.get(month) || { month, sessions: 0, voicing: 0, xp: 0, renewals: 0, revenue: 0 };
      x.renewals += 1;
      x.revenue += Number(sub.price_toman || 0);
      monthly.set(month, x);
    }
    return NextResponse.json({
      ok: true,
      summary: {
        totalSessions: rows.length,
        voicingSessions: rows.filter((x) => x.game_id === "voicing").length,
        activePro: active.length,
        totalSubscriptions: subs.length,
        renewals,
        approvedPayments: approved.length,
        revenue: subs.reduce((sum, x) => sum + Number(x.price_toman || 0), 0),
      },
      students: Array.from(users.values())
        .map((x) => ({ ...x, average_accuracy: x.sessions ? Math.round(x.accuracy / x.sessions) : 0 }))
        .sort((a, b) => b.sessions - a.sessions)
        .slice(0, 100),
      monthly: Array.from(monthly.values())
        .sort((a, b) => b.month.localeCompare(a.month))
        .slice(0, 12),
      subscriptions: subs.slice(0, 100),
      subscriptionsTableReady: !subscriptions.error,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "analytics_failed" },
      { status: 503 },
    );
  }
}
