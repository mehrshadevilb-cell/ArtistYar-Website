import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { USER_SESSION_COOKIE, verifyUserSession } from "@/lib/server-admin-auth";
import { createClient } from "@supabase/supabase-js";
import { runtimeGenerateJson } from "@/lib/ai-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const db = url && secret ? createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } }) : null;
type VoicingQuestion = { title:string; quality:string; key:string; notes:string[]; degrees:string; prompt:string; hint:string; options:string[]; answer:string; tip:string; use:string; difficulty:number; source:string };
function fallback(seed: number): VoicingQuestion {
  const rows = [
    ["Maj9 نرم و سینمایی","Cmaj9","C",["C2","G2","B2","D3","E3"],"1–5–7–9–3","پد و بالاد"],
    ["Minor 9 مدرن","Dm9","D",["D2","A2","C3","E3","F3"],"1–5–♭7–9–♭3","R&B و نئو سول"],
    ["Dominant 13 رنگی","G13","G",["G2","D3","F3","A3","E4"],"1–5–♭7–9–13","Turnaround و پایان جمله"],
    ["Quartal Lift","F7sus4(9)","F",["F2","C3","Bb3","Eb4","G4"],"1–5–♭7–♭3–9","Cinematic و gospel"],
    ["Upper Structure #11","Bbmaj7(#11)","Bb",["Bb1","F2","A2","D3","E3"],"1–5–7–3–#11","جاز مدرن و sound design"],
  ] as const;
  const row = rows[seed % rows.length];
  return { title:row[0], quality:row[1], key:row[2], notes:[...row[3]], degrees:row[4], prompt:"کیفیت آکورد را از روی voicing بشنو و انتخاب کن.", hint:"ابتدا باس، سپس ۳ و ۷ و در پایان نت رنگی را جدا کن.", options:[row[1],"Cmaj7","Dm7","G7sus4"], answer:row[1], tip:"نت‌های راهنما را نزدیک نگه دار و spacing باس را باز حفظ کن.", use:row[5], difficulty:Math.min(500, seed + 1), source:"fallback" };
}
function parse(text: string) {
  const clean = text.trim().replace(/^\`\`\`json/i, "").replace(/\`\`\`$/, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("invalid_json");
  return JSON.parse(clean.slice(start, end + 1));
}
function normalize(raw: any, level: number): VoicingQuestion | null {
  if (!raw || typeof raw !== "object" || typeof raw.quality !== "string" || !Array.isArray(raw.notes) || raw.notes.length < 3 || !Array.isArray(raw.options)) return null;
  const options = [...new Set(raw.options.map(String))];
  const answer = String(raw.answer || raw.quality);
  if (options.length < 4 || !options.includes(answer)) return null;
  const notes = raw.notes.map(String).slice(0, 8);
  if (notes.length < 3 || notes.some((note: string) => !/^[A-G](?:#|b)?[0-8]$/.test(note))) return null;
  return { ...fallback(level), ...raw, notes, options:options.slice(0,6), answer, difficulty:level, source:"multi-agent" };
}
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const userId = String(body.userId || "").slice(0,120);
  const session = verifyUserSession((await cookies()).get(USER_SESSION_COOKIE)?.value);
  if (!session || session.id !== userId) return NextResponse.json({ ok:false, error:"unauthorized" }, { status:401 });
  const level = Math.max(1, Math.min(500, Number(body.level) || 1));
  const dayKey = String(body.dayKey || new Date().toISOString().slice(0,10));
  const recent = Array.isArray(body.recent) ? body.recent.map(String).slice(-30) : [];
  if (db) { const { data } = await db.from("practice_voicing_questions").select("fingerprint").eq("user_id", userId).order("created_at", { ascending:false }).limit(100); recent.push(...(data || []).map((x) => String(x.fingerprint))); }
  let question: VoicingQuestion | null = null;
  for (let attempt=0; attempt<3 && !question; attempt++) {
    let candidate: VoicingQuestion | null = null;
    try {
      const result = await runtimeGenerateJson(
        `Create one advanced daily piano voicing ear-training task for level ${level}/500. Include title, quality, key, notes, degrees, prompt, hint, options, answer, tip, use. Avoid these fingerprints: ${recent.join(",")}`,
        "You are a professional piano voicing and ear-training designer. Return only valid JSON in Persian. Never repeat templates. Keep notes musically valid and answer objectively scorable.",
      );
      candidate = normalize(parse(result.reply), level);
    } catch {}
    const fingerprint = createHash("sha256").update(JSON.stringify({ quality:candidate.quality, notes:candidate.notes, prompt:candidate.prompt, dayKey })).digest("hex");
    if (!recent.includes(fingerprint)) { question = { ...candidate, source:candidate.source, fingerprint } as VoicingQuestion & { fingerprint:string }; }
    else recent.push(fingerprint);
  }
  if (!question) return NextResponse.json({ ok:false, error:"voicing_generation_exhausted" }, { status:503 });
  if (db) await db.from("practice_voicing_questions").insert({ user_id:userId, day_key:dayKey, fingerprint:(question as any).fingerprint, question });
  return NextResponse.json({ ok:true, question });
}
