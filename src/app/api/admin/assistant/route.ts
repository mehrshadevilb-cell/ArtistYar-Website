import { NextResponse } from "next/server";
import { generateAdminReply, normalizeAdminMessages, requireAdminAssistant } from "@/lib/admin-assistant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!(await requireAdminAssistant())) return NextResponse.json({ ok: false, error: "دسترسی Owner یا Admin لازم است." }, { status: 403 });
  const body = await request.json().catch(() => null) as { messages?: unknown; provider?: unknown; model?: unknown } | null;
  const messages = normalizeAdminMessages(body?.messages);
  if (!messages.length) return NextResponse.json({ ok: false, error: "پیام خالی است." }, { status: 400 });
  try {
    const result = await generateAdminReply(messages, typeof body?.provider === "string" ? body.provider : undefined, typeof body?.model === "string" ? body.model : undefined);
    return NextResponse.json({ ok: true, scope: "rahyar-admin-assistant", reply: result.reply, provider: result.provider, model: result.model });
  } catch (error) {
    console.error("Admin assistant request failed", error);
    return NextResponse.json({ ok: false, error: "پاسخ دستیار مدیریت آماده نشد. دوباره امتحان کنید." }, { status: 502 });
  }
}
