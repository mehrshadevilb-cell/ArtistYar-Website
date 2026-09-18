import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/server-admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const db = url && secret ? createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

export async function POST(request: Request) {
  const session = verifyAdminSession((await cookies()).get(ADMIN_SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!db) return NextResponse.json({ ok: false, error: "practice_store_not_configured" }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const userId = String(body.userId || "").trim();
  const months = Math.max(1, Math.min(12, Number(body.months) || 1));
  if (!userId) return NextResponse.json({ ok: false, error: "userId_required" }, { status: 400 });

  const now = new Date();
  const expires = new Date(now);
  expires.setMonth(expires.getMonth() + months);

  const { data, error } = await db.from("practice_subscriptions").insert({
    user_id: userId,
    status: "active",
    price_toman: 40000,
    started_at: now.toISOString(),
    expires_at: expires.toISOString(),
  }).select().single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 503 });
  return NextResponse.json({ ok: true, subscription: data, activatedBy: session.username });
}
