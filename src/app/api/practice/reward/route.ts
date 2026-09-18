import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const db = url && secret ? createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

export async function GET(request: Request) {
  const userId = new URL(request.url).searchParams.get("userId")?.trim();
  if (!userId || !db) return NextResponse.json({ ok: true, eligible: false, discountPercent: 0, reason: "not_available" });

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const { data, error } = await db.from("practice_records").select("score,played_at").eq("user_id", userId).gte("played_at", monthStart.toISOString()).lt("played_at", nextMonth.toISOString());
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 503 });

  const rows = data || [];
  const days = new Set(rows.map((r) => String(r.played_at).slice(0, 10)));
  const xp = rows.reduce((sum, r) => sum + Number(r.score || 0), 0);
  const eligible = days.size >= 12 && xp >= 1000;
  return NextResponse.json({
    ok: true,
    eligible,
    discountPercent: eligible ? 20 : 0,
    activeDays: days.size,
    monthXp: xp,
    requirement: { activeDays: 12, monthXp: 1000 },
    message: eligible ? "برای اشتراک ماه بعد ۲۰٪ تخفیف فعال می‌شود." : "با ۱۲ روز تمرین و حداقل ۱۰۰۰ XP در ماه، تخفیف ۲۰٪ ماه بعد را بگیر."
  });
}
