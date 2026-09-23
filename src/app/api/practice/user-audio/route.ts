import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createHash, randomUUID } from "crypto";
import { ADMIN_SESSION_COOKIE, USER_SESSION_COOKIE, verifyAdminSession, verifyUserSession } from "@/lib/server-admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "audio/wav", "audio/wave", "audio/x-wav",
  "audio/mpeg", "audio/mp3",
  "audio/mp4", "audio/m4a", "audio/x-m4a",
  "audio/ogg", "audio/webm", "audio/flac", "audio/x-flac",
]);
const ALLOWED_EXT = new Set(["wav", "mp3", "m4a", "ogg", "webm", "flac", "aac"]);

function db() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !secret) return null;
  return createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
}

function bucketName() {
  return process.env.SUPABASE_PRACTICE_BUCKET || process.env.SUPABASE_BUCKET || "artistyar-media";
}

async function sessionUser() {
  const store = await cookies();
  const admin = verifyAdminSession(store.get(ADMIN_SESSION_COOKIE)?.value);
  if (admin) return { id: admin.username, telegramId: "", admin: true };
  const session = verifyUserSession(store.get(USER_SESSION_COOKIE)?.value);
  if (!session?.id) return null;
  return { id: session.id, telegramId: session.telegramId || "", admin: false };
}

function safeName(name: string) {
  return name.replace(/[^\w.\- ()\u0600-\u06FF]+/g, "_").slice(0, 120) || "audio";
}

function extOf(name: string, mime: string) {
  const fromName = (name.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (ALLOWED_EXT.has(fromName)) return fromName;
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("webm")) return "webm";
  if (mime.includes("flac")) return "flac";
  if (mime.includes("mp4") || mime.includes("m4a")) return "m4a";
  return "bin";
}

export async function GET() {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const client = db();
  if (!client) return NextResponse.json({ ok: false, error: "storage_unavailable", files: [] }, { status: 503 });
  const { data, error } = await client
    .from("practice_user_audio")
    .select("id,name,mime_type,size_bytes,duration_ms,created_at,storage_path")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) return NextResponse.json({ ok: true, files: [], note: "table_or_query_error" });
  return NextResponse.json({ ok: true, files: data || [] });
}

export async function POST(request: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const client = db();
  if (!client) return NextResponse.json({ ok: false, error: "storage_unavailable" }, { status: 503 });
  let form: FormData;
  try { form = await request.formData(); } catch {
    return NextResponse.json({ ok: false, error: "invalid_form" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "file_required" }, { status: 400 });
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "file_size", maxBytes: MAX_BYTES }, { status: 413 });
  }
  const mime = (file.type || "application/octet-stream").toLowerCase();
  const name = safeName(file.name || "audio");
  const ext = extOf(name, mime);
  if (!ALLOWED_EXT.has(ext) && !ALLOWED_MIME.has(mime)) {
    return NextResponse.json({ ok: false, error: "unsupported_type", mime }, { status: 415 });
  }
  const id = randomUUID();
  const path = `practice-user-audio/${encodeURIComponent(user.id)}/${id}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const head = buf.subarray(0, 12);
  const isWav = head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46;
  const isId3 = head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33;
  const isFtyp = head.toString("ascii", 4, 8) === "ftyp";
  const isOgg = head[0] === 0x4f && head[1] === 0x67 && head[2] === 0x67;
  const isFlac = head.toString("ascii", 0, 4) === "fLaC";
  if (!(isWav || isId3 || isFtyp || isOgg || isFlac || mime.startsWith("audio/"))) {
    return NextResponse.json({ ok: false, error: "corrupt_or_unsupported" }, { status: 415 });
  }
  const upload = await client.storage.from(bucketName()).upload(path, buf, {
    contentType: mime.startsWith("audio/") ? mime : `audio/${ext}`,
    upsert: false,
    cacheControl: "private, max-age=3600",
  });
  if (upload.error) {
    return NextResponse.json({ ok: false, error: "upload_failed", detail: upload.error.message }, { status: 500 });
  }
  const checksum = createHash("sha256").update(buf).digest("hex").slice(0, 32);
  const row = { id, user_id: user.id, name, mime_type: mime, size_bytes: file.size, storage_path: path, checksum, duration_ms: null as number | null };
  const ins = await client.from("practice_user_audio").insert(row).select("id,name,mime_type,size_bytes,created_at").maybeSingle();
  if (ins.error) {
    await client.storage.from(bucketName()).remove([path]);
    return NextResponse.json({ ok: true, file: { id, name, mime_type: mime, size_bytes: file.size, storage_path: path }, note: "metadata_table_missing_file_stored" });
  }
  return NextResponse.json({ ok: true, file: ins.data || row });
}

export async function DELETE(request: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const client = db();
  if (!client) return NextResponse.json({ ok: false, error: "storage_unavailable" }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const id = String(body.id || "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "id_required" }, { status: 400 });
  const { data: row } = await client.from("practice_user_audio").select("id,storage_path,user_id").eq("id", id).maybeSingle();
  if (!row || row.user_id !== user.id) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  await client.storage.from(bucketName()).remove([row.storage_path]);
  await client.from("practice_user_audio").delete().eq("id", id).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
