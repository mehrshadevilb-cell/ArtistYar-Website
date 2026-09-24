import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, USER_SESSION_COOKIE, verifyAdminSession, verifyUserSession } from "@/lib/server-admin-auth";
import { createClient } from "@supabase/supabase-js";
import { autoChat } from "@/lib/ai-providers";
import { ecosystemDb, ownedProject, logProjectActivity } from "@/lib/user-ecosystem";
import { recordSkillEvent } from "@/lib/practice-skill-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FREE_LIMIT = 1;
const COURSE_LIMIT = 5;
const UNLIMITED = 9999;
const MAX_BYTES = 50 * 1024 * 1024;
const ALLOWED_AUDIO = /\.(mp3|wav|m4a|flac|ogg|opus|aac)$/i;

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const db = url && secret ? createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

type Identity = { id: string; telegramId?: string; admin: boolean };

function dayStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

async function identity(): Promise<Identity | null> {
  const jar = await cookies();
  if (verifyAdminSession(jar.get(ADMIN_SESSION_COOKIE)?.value)) return { id: "admin", admin: true };
  const user = verifyUserSession(jar.get(USER_SESSION_COOKIE)?.value);
  return user ? { id: user.id, telegramId: user.telegramId, admin: false } : null;
}

export async function GET() {
  const user = await identity();
  if (!user) return NextResponse.json({ ok: false, error: "login_required" }, { status: 401 });
  return NextResponse.json({ ok: true, limit: 1, used: 0, remaining: 1, pro: false, course: false, admin: user.admin, tier: user.admin ? "admin" : "free" });
}

export async function POST() {
  return NextResponse.json({ ok: false, error: "analyzer_restoring" }, { status: 503 });
}
