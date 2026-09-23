import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const dbUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const dbSecret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const db = dbUrl && dbSecret ? createClient(dbUrl, dbSecret, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

function authorized(request: Request) {
  const configured = process.env.ARTISTYAR_PRACTICE_REMINDER_SECRET || "";
  if (!configured) return false;
  return request.headers.get("x-practice-reminder-secret") === configured;
}

/** Missed-practice reminders: any practice_records today counts (all games). */
export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!db) return NextResponse.json({ ok: false, error: "practice_store_unavailable" }, { status: 503 });

  const body: { telegramIds?: unknown } = await request.json().catch(() => ({}));
  const telegramIds = Array.isArray(body.telegramIds)
    ? [...new Set(body.telegramIds.map(String).map((v: string) => v.trim()).filter(Boolean))].slice(0, 500)
    : [];
  if (!telegramIds.length) return NextResponse.json({ ok: true, reminders: [] });

  const start = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
  const end = new Date(start.getTime() + 86400000);
  const { data, error } = await db
    .from("practice_records")
    .select("user_id,metadata")
    .gte("played_at", start.toISOString())
    .lt("played_at", end.toISOString());

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 503 });

  const practiced = new Set(
    (data || [])
      .map((row) => String((row as any)?.metadata?.telegramId || (row as any)?.metadata?.telegram_id || ""))
      .filter(Boolean),
  );
  // also treat user_id match when telegram id stored as user id
  for (const row of data || []) {
    const uid = String((row as any)?.user_id || "");
    if (uid) practiced.add(uid);
  }

  const reminders = telegramIds
    .filter((id) => !practiced.has(id))
    .map((telegramId) => ({
      telegramId,
      title: "تمرین امروز ArtistYar",
      message:
        "🎧 هنوز تمرین شنیداری امروزت را انجام ندادی.\n\nحتی ۵ دقیقه تمرین متمرکز می‌تواند گوش تو را قوی‌تر کند. وارد ArtistYar شو و تمرین امروزت را انجام بده 💪🎵",
    }));

  return NextResponse.json({ ok: true, date: start.toISOString().slice(0, 10), reminders });
}
