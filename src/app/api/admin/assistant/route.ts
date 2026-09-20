import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/server-admin-auth";
import { archiveConversation, createConversation, getConversation, listConversations, renameConversation, sendAdminMessage } from "@/lib/admin-ai-assistant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function requireAdmin() {
  return verifyAdminSession((await cookies()).get(ADMIN_SESSION_COOKIE)?.value);
}

export async function GET(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ ok: false, error: "دسترسی مدیریت لازم است." }, { status: 401 });
  try {
    const id = new URL(request.url).searchParams.get("conversation")?.trim() || "";
    if (id.length > 80) return NextResponse.json({ ok: false, error: "شناسه گفتگو نامعتبر است." }, { status: 400 });
    if (id) {
      const conversation = await getConversation(session.username, id);
      return conversation ? NextResponse.json({ ok: true, conversation }) : NextResponse.json({ ok: false, error: "گفتگو پیدا نشد." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, conversations: await listConversations(session.username) });
  } catch (error) {
    console.error("admin assistant GET failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ ok: false, error: "ذخیره‌سازی دستیار مدیریت در دسترس نیست." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ ok: false, error: "دسترسی مدیریت لازم است." }, { status: 401 });
  try {
    const body = await request.json() as { action?: unknown; conversationId?: unknown; content?: unknown; title?: unknown; provider?: unknown; model?: unknown };
    const action = typeof body.action === "string" ? body.action : "message";
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 128_000) return NextResponse.json({ ok: false, error: "درخواست بیش از حد مجاز است." }, { status: 413 });
    if (action === "create") return NextResponse.json({ ok: true, conversation: await createConversation(session.username) });

    const id = typeof body.conversationId === "string" ? body.conversationId.trim() : "";
    if (!id || id.length > 80) return NextResponse.json({ ok: false, error: "شناسه گفتگو لازم است." }, { status: 400 });
    if (action === "get") {
      const conversation = await getConversation(session.username, id);
      return conversation ? NextResponse.json({ ok: true, conversation }) : NextResponse.json({ ok: false, error: "گفتگو پیدا نشد." }, { status: 404 });
    }
    if (action === "rename") {
      const title = typeof body.title === "string" ? body.title.trim() : "";
      if (!title) return NextResponse.json({ ok: false, error: "عنوان لازم است." }, { status: 400 });
      if (title.length > 120) return NextResponse.json({ ok: false, error: "عنوان بیش از حد طولانی است." }, { status: 400 });
      const conversation = await renameConversation(session.username, id, title);
      return conversation ? NextResponse.json({ ok: true, conversation }) : NextResponse.json({ ok: false, error: "گفتگو پیدا نشد." }, { status: 404 });
    }
    if (action === "archive") {
      const conversation = await archiveConversation(session.username, id);
      return conversation ? NextResponse.json({ ok: true, conversation }) : NextResponse.json({ ok: false, error: "گفتگو پیدا نشد." }, { status: 404 });
    }

    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!content) return NextResponse.json({ ok: false, error: "پیام خالی است." }, { status: 400 });
    const message = await sendAdminMessage(session.username, id, content, typeof body.provider === "string" ? body.provider : undefined, typeof body.model === "string" ? body.model : undefined, request.signal);
    return NextResponse.json({ ok: true, message });
  } catch (error) {
    if (request.signal.aborted || (error instanceof Error && error.message === "admin_ai_generation_stopped")) return new NextResponse(null, { status: 499 });
    console.error("admin assistant POST failed", error instanceof Error ? error.message : "unknown error");
    const code = error instanceof Error ? error.message : "";
    const known: Record<string, { message: string; status: number }> = {
      admin_ai_conversation_not_found: { message: "گفتگو پیدا نشد.", status: 404 },
      admin_ai_empty_message: { message: "پیام خالی است.", status: 400 },
      admin_ai_provider_and_model_must_be_paired: { message: "Provider و Model باید با هم انتخاب شوند.", status: 400 },
      admin_ai_model_not_enabled_for_routing: { message: "این مدل برای مسیریابی فعال نیست.", status: 403 },
      admin_ai_no_healthy_model: { message: "در حال حاضر هیچ مدل سالم و فعال برای دستیار وجود ندارد.", status: 503 },
      admin_ai_all_models_failed: { message: "مدل‌های فعال در حال حاضر پاسخ‌گو نیستند.", status: 503 },
      admin_ai_empty_provider_result: { message: "پاسخ معتبری از مدل دریافت نشد.", status: 502 },
    };
    const mapped = known[code];
    return mapped ? NextResponse.json({ ok: false, error: mapped.message }, { status: mapped.status }) : NextResponse.json({ ok: false, error: "اجرای درخواست دستیار مدیریت ناموفق بود." }, { status: 502 });
  }
}
