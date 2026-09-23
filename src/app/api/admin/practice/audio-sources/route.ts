import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/server-admin-auth";
import { BUILTIN_AUDIO_LIBRARY, registerRuntimeSources, type AudioSourceMeta } from "@/lib/practice-audio-library";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function db() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !secret) return null;
  return createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function requireAdmin() {
  const store = await cookies();
  return verifyAdminSession(store.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const client = db();
  let dbRows: unknown[] = [];
  if (client) {
    const { data } = await client.from("practice_audio_sources").select("*").order("created_at", { ascending: false }).limit(500);
    dbRows = data || [];
    try {
      const mapped: AudioSourceMeta[] = (data || [])
        .filter((r: any) => r.enabled && r.status === "ready" && r.recipe)
        .map((r: any) => ({
          id: r.id,
          category: r.category,
          label: r.label || r.id,
          labelFa: r.label_fa || r.label || r.id,
          durationSec: Number(r.duration_sec) || 1.4,
          compatible: Array.isArray(r.compatible) ? r.compatible : [],
          tags: Array.isArray(r.tags) ? r.tags : [],
          storagePath: r.storage_path || null,
          recipe: r.recipe,
          enabled: true,
          status: "ready" as const,
        }));
      registerRuntimeSources(mapped);
    } catch { /* */ }
  }
  return NextResponse.json({
    ok: true,
    builtin: BUILTIN_AUDIO_LIBRARY.map((s) => ({
      id: s.id, category: s.category, label: s.label, labelFa: s.labelFa,
      status: s.status, enabled: s.enabled, compatible: s.compatible, durationSec: s.durationSec, tags: s.tags,
    })),
    database: dbRows,
  });
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const client = db();
  if (!client) return NextResponse.json({ ok: false, error: "db_unavailable" }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const id = String(body.id || "").trim().slice(0, 80);
  if (!id) return NextResponse.json({ ok: false, error: "id_required" }, { status: 400 });
  const recipe = body.recipe && typeof body.recipe === "object" ? body.recipe : { kind: "noise", seconds: 1.4, color: "pink" };
  const row = {
    id,
    category: String(body.category || "fx").slice(0, 40),
    label: String(body.label || id).slice(0, 120),
    label_fa: String(body.labelFa || body.label || id).slice(0, 120),
    genre: body.genre ? String(body.genre).slice(0, 40) : null,
    tempo_bpm: body.tempoBpm != null ? Number(body.tempoBpm) : null,
    duration_sec: Math.min(30, Math.max(0.5, Number(body.durationSec) || 1.4)),
    channels: body.channels === 2 ? 2 : 1,
    compatible: Array.isArray(body.compatible) ? body.compatible.slice(0, 40) : [],
    tags: Array.isArray(body.tags) ? body.tags.slice(0, 20) : [],
    storage_path: body.storagePath ? String(body.storagePath).slice(0, 400) : null,
    recipe,
    enabled: body.enabled !== false,
    status: ["ready", "processing", "invalid", "disabled"].includes(body.status) ? body.status : "ready",
    updated_at: new Date().toISOString(),
  };
  const { error } = await client.from("practice_audio_sources").upsert(row, { onConflict: "id" });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 503 });
  return NextResponse.json({ ok: true, id });
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const client = db();
  if (!client) return NextResponse.json({ ok: false, error: "db_unavailable" }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const id = String(body.id || "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "id_required" }, { status: 400 });
  if (body.delete) {
    await client.from("practice_audio_sources").delete().eq("id", id);
    return NextResponse.json({ ok: true, deleted: id });
  }
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
  if (body.status) patch.status = body.status;
  await client.from("practice_audio_sources").update(patch).eq("id", id);
  return NextResponse.json({ ok: true, id });
}
